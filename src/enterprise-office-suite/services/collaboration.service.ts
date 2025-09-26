// path: backend/src/enterprise-office-suite/services/collaboration.service.ts
// purpose: Real-time collaboration service with operational transforms
// dependencies: Prisma, Redis, WebSocket, EventEmitter, Conflict Resolution

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);
  
  // TODO: Remove when Redis is properly configured
  private readonly tempStorage = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  
  // Helper methods to simulate Redis operations
  private async tempSetex(key: string, seconds: number, value: string): Promise<void> {
    this.tempStorage.set(key, value);
  }
  
  private async tempSadd(key: string, value: string): Promise<void> {
    const set = this.tempStorage.get(key) || new Set();
    set.add(value);
    this.tempStorage.set(key, set);
  }
  
  private async tempSrem(key: string, value: string): Promise<void> {
    const set = this.tempStorage.get(key) || new Set();
    set.delete(value);
    this.tempStorage.set(key, set);
  }
  
  private async tempSmembers(key: string): Promise<string[]> {
    const set = this.tempStorage.get(key) || new Set();
    return Array.from(set);
  }

  async shareDocument(documentId: string, userId: string, data: {
    userIds?: string[];
    emails?: string[];
    permission: 'view' | 'comment' | 'edit';
    message?: string;
  }) {
    try {
      // Check if user has permission to share
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          OR: [
            { createdBy: userId },
            { 
              collaborators: {
                some: {
                  userId,
                  permission: 'edit',
                },
              },
            },
          ],
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found or insufficient permissions');
      }

      const collaborators = [];

      // Add collaborators by user ID
      if (data.userIds && data.userIds.length > 0) {
        for (const targetUserId of data.userIds) {
          // Check if user exists
          const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
          });

          if (user) {
            // Check if already a collaborator
            const existing = await this.prisma.documentCollaborator.findFirst({
              where: { documentId, userId: targetUserId },
            });

            if (!existing) {
              const collaborator = await this.prisma.documentCollaborator.create({
                data: {
                  documentId,
                  userId: targetUserId,
                  permission: data.permission,
                },
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatar: true },
                  },
                },
              });

              collaborators.push(collaborator);

              // Send notification
              await this.sendCollaborationNotification(
                targetUserId,
                document,
                data.permission,
                data.message
              );
            }
          }
        }
      }

      // Add collaborators by email (invite external users)
      if (data.emails && data.emails.length > 0) {
        for (const email of data.emails) {
          // Check if user exists by email
          const user = await this.prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // User exists, add as collaborator
            const existing = await this.prisma.documentCollaborator.findFirst({
              where: { documentId, userId: user.id },
            });

            if (!existing) {
              const collaborator = await this.prisma.documentCollaborator.create({
                data: {
                  documentId,
                  userId: user.id,
                  permission: data.permission,
                },
                include: {
                  user: {
                    select: { id: true, name: true, email: true, avatar: true },
                  },
                },
              });

              collaborators.push(collaborator);
            }
          } else {
            // Create invitation for external user
            await this.createExternalInvitation(
              documentId,
              email,
              data.permission,
              userId,
              data.message
            );
          }
        }
      }

      // Log activity
      await this.logActivity(documentId, userId, 'shared', {
        collaborators: collaborators.length,
        permission: data.permission,
      });

      return { success: true, collaborators };
    } catch (error) {
      this.logger.error('Error sharing document:', error);
      throw error;
    }
  }

  async updatePermission(documentId: string, userId: string, collaboratorId: string, permission: string) {
    try {
      // Check if user has permission to update permissions
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          createdBy: userId,
        },
      });

      if (!document) {
        throw new ForbiddenException('Only document owner can update permissions');
      }

      const collaborator = await this.prisma.documentCollaborator.update({
        where: {
          documentId_userId: {
            documentId,
            userId: collaboratorId,
          },
        },
        data: { permission },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      // Emit real-time update
      this.eventEmitter.emit('collaboration.permission.updated', {
        documentId,
        collaboratorId,
        permission,
        updatedBy: userId,
      });

      return { success: true, collaborator };
    } catch (error) {
      this.logger.error('Error updating permission:', error);
      throw error;
    }
  }

  async removeCollaborator(documentId: string, userId: string, collaboratorId: string) {
    try {
      // Check if user has permission to remove collaborators
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          createdBy: userId,
        },
      });

      if (!document) {
        throw new ForbiddenException('Only document owner can remove collaborators');
      }

      await this.prisma.documentCollaborator.delete({
        where: {
          documentId_userId: {
            documentId,
            userId: collaboratorId,
          },
        },
      });

      // Remove from active sessions
      await this.removeFromActiveSessions(documentId, collaboratorId);

      // Emit real-time update
      this.eventEmitter.emit('collaboration.collaborator.removed', {
        documentId,
        collaboratorId,
        removedBy: userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error removing collaborator:', error);
      throw error;
    }
  }

  async joinDocument(documentId: string, userId: string) {
    try {
      // Check if user has access to document
      const hasAccess = await this.checkDocumentAccess(documentId, userId);
      
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }

      const sessionId = `${documentId}:${userId}`;
      const session = {
        documentId,
        userId,
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        cursor: null,
        selection: null,
      };

      // TODO: Replace with Redis when properly configured
      // Store session in Redis
      await this.tempSetex(`session:${sessionId}`, 3600, JSON.stringify(session));

      // Add to active users set
      await this.tempSadd(`active:${documentId}`, userId);

      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatar: true },
      });

      // Emit join event
      this.eventEmitter.emit('collaboration.user.joined', {
        documentId,
        user,
        sessionId,
      });

      // Log activity
      await this.logActivity(documentId, userId, 'joined');

      return { success: true, sessionId, user };
    } catch (error) {
      this.logger.error('Error joining document:', error);
      throw error;
    }
  }

  async leaveDocument(documentId: string, userId: string) {
    try {
      const sessionId = `${documentId}:${userId}`;

      // Remove session
      await this.redis.del(`session:${sessionId}`);

      // TODO: Replace with Redis when properly configured
      // Remove from active users
      await this.tempSrem(`active:${documentId}`, userId);

      // Emit leave event
      this.eventEmitter.emit('collaboration.user.left', {
        documentId,
        userId,
      });

      // Log activity
      await this.logActivity(documentId, userId, 'left');

      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving document:', error);
      throw error;
    }
  }

  async getActiveUsers(documentId: string) {
    try {
      // TODO: Replace with Redis when properly configured
      const userIds = await this.tempSmembers(`active:${documentId}`);
      
      if (userIds.length === 0) {
        return [];
      }

      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, avatar: true },
      });

      // Get session info for each user
      const activeUsers = await Promise.all(
        users.map(async (user) => {
          const sessionId = `${documentId}:${user.id}`;
          const sessionData = await this.redis.get(`session:${sessionId}`);
          const session = sessionData ? JSON.parse(sessionData) : null;

          return {
            ...user,
            session,
          };
        })
      );

      return activeUsers;
    } catch (error) {
      this.logger.error('Error getting active users:', error);
      throw error;
    }
  }

  async updateCursor(documentId: string, userId: string, cursor: any) {
    try {
      const sessionId = `${documentId}:${userId}`;
      const sessionData = await this.redis.get(`session:${sessionId}`);
      
      if (!sessionData) {
        throw new NotFoundException('Session not found');
      }

      const session = JSON.parse(sessionData);
      session.cursor = cursor;
      session.lastActivity = new Date().toISOString();

      await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));

      // Emit cursor update
      this.eventEmitter.emit('collaboration.cursor.updated', {
        documentId,
        userId,
        cursor,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating cursor:', error);
      throw error;
    }
  }

  async updateSelection(documentId: string, userId: string, selection: any) {
    try {
      const sessionId = `${documentId}:${userId}`;
      const sessionData = await this.redis.get(`session:${sessionId}`);
      
      if (!sessionData) {
        throw new NotFoundException('Session not found');
      }

      const session = JSON.parse(sessionData);
      session.selection = selection;
      session.lastActivity = new Date().toISOString();

      await this.redis.setex(`session:${sessionId}`, 3600, JSON.stringify(session));

      // Emit selection update
      this.eventEmitter.emit('collaboration.selection.updated', {
        documentId,
        userId,
        selection,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating selection:', error);
      throw error;
    }
  }

  async applyOperation(documentId: string, userId: string, operation: any) {
    try {
      // Check if user has edit permission
      const hasEditPermission = await this.checkEditPermission(documentId, userId);
      
      if (!hasEditPermission) {
        throw new ForbiddenException('Edit permission required');
      }

      // Get current document version
      const document = await this.prisma.officeDocument.findUnique({
        where: { id: documentId },
        select: { content: true, version: true },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Apply operational transform
      const transformedOperation = await this.transformOperation(
        operation,
        document.version,
        documentId
      );

      // Apply operation to document
      const newContent = this.applyOperationToContent(document.content, transformedOperation);

      // Update document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: {
          content: newContent,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // Cache updated content
      await this.redis.setex(
        `document:${documentId}:content`,
        300,
        JSON.stringify(newContent)
      );

      // Store operation for conflict resolution
      await this.storeOperation(documentId, transformedOperation);

      // Emit operation to other collaborators
      this.eventEmitter.emit('collaboration.operation.applied', {
        documentId,
        userId,
        operation: transformedOperation,
      });

      return { success: true, operation: transformedOperation };
    } catch (error) {
      this.logger.error('Error applying operation:', error);
      throw error;
    }
  }

  async getOperationHistory(documentId: string, fromVersion?: number) {
    try {
      const operations = await this.redis.lrange(
        `operations:${documentId}`,
        fromVersion || 0,
        -1
      );

      return operations.map(op => JSON.parse(op));
    } catch (error) {
      this.logger.error('Error getting operation history:', error);
      throw error;
    }
  }

  async resolveConflict(documentId: string, conflictId: string, resolution: 'accept' | 'reject') {
    try {
      const conflictData = await this.redis.get(`conflict:${conflictId}`);
      
      if (!conflictData) {
        throw new NotFoundException('Conflict not found');
      }

      const conflict = JSON.parse(conflictData);

      if (resolution === 'accept') {
        // Apply the conflicting operation
        await this.applyOperation(documentId, conflict.userId, conflict.operation);
      }

      // Remove conflict
      await this.redis.del(`conflict:${conflictId}`);

      // Emit resolution
      this.eventEmitter.emit('collaboration.conflict.resolved', {
        documentId,
        conflictId,
        resolution,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error resolving conflict:', error);
      throw error;
    }
  }

  // Private helper methods
  private async checkDocumentAccess(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        OR: [
          { createdBy: userId },
          { 
            collaborators: {
              some: { userId },
            },
          },
        ],
      },
    });

    return !!document;
  }

  private async checkEditPermission(documentId: string, userId: string): Promise<boolean> {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        OR: [
          { createdBy: userId },
          { 
            collaborators: {
              some: {
                userId,
                permission: 'edit',
              },
            },
          },
        ],
      },
    });

    return !!document;
  }

  private async transformOperation(operation: any, currentVersion: number, documentId: string): Promise<any> {
    // Get operations since the operation's base version
    const laterOperations = await this.redis.lrange(
      `operations:${documentId}`,
      operation.baseVersion,
      currentVersion - 1
    );

    let transformedOp = { ...operation };

    // Apply operational transform against each later operation
    for (const laterOpData of laterOperations) {
      const laterOp = JSON.parse(laterOpData);
      transformedOp = this.operationalTransform(transformedOp, laterOp);
    }

    transformedOp.version = currentVersion;
    return transformedOp;
  }

  private operationalTransform(op1: any, op2: any): any {
    // Simplified operational transform
    // In a real implementation, this would handle various operation types
    // and their interactions (insert vs insert, insert vs delete, etc.)
    
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return {
          ...op1,
          position: op1.position + op2.content.length,
        };
      }
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return op1;
      } else {
        return {
          ...op1,
          position: op1.position + op2.content.length,
        };
      }
    }

    // Add more transformation rules as needed
    return op1;
  }

  private applyOperationToContent(content: any, operation: any): any {
    // Apply operation to document content
    // This would depend on the document type and operation type
    const newContent = JSON.parse(JSON.stringify(content));
    
    // Simplified operation application
    switch (operation.type) {
      case 'insert':
        // Insert text at position
        break;
      case 'delete':
        // Delete text at position
        break;
      case 'format':
        // Apply formatting
        break;
      // Add more operation types
    }

    return newContent;
  }

  private async storeOperation(documentId: string, operation: any) {
    await this.redis.lpush(
      `operations:${documentId}`,
      JSON.stringify(operation)
    );

    // Keep only last 1000 operations
    await this.redis.ltrim(`operations:${documentId}`, 0, 999);
  }

  private async removeFromActiveSessions(documentId: string, userId: string) {
    const sessionId = `${documentId}:${userId}`;
    await this.redis.del(`session:${sessionId}`);
    await this.tempSrem(`active:${documentId}`, userId);
  }

  private async createExternalInvitation(
    documentId: string,
    email: string,
    permission: string,
    invitedBy: string,
    message?: string
  ) {
    const invitationId = `invitation_${Date.now()}`;
    const invitation = {
      id: invitationId,
      documentId,
      email,
      permission,
      invitedBy,
      message,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    await this.redis.setex(
      `invitation:${invitationId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(invitation)
    );

    // Send invitation email
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  private async sendCollaborationNotification(
    userId: string,
    document: any,
    permission: string,
    message?: string
  ) {
    // Send notification to user
    this.eventEmitter.emit('notification.send', {
      userId,
      type: 'document_shared',
      title: 'Document Shared',
      message: `A document "${document.title}" has been shared with you`,
      data: {
        documentId: document.id,
        permission,
        customMessage: message,
      },
    });
  }

  private async sendInvitationEmail(invitation: any) {
    // Send invitation email to external user
    this.eventEmitter.emit('email.send', {
      to: invitation.email,
      subject: 'Document Collaboration Invitation',
      template: 'document-invitation',
      data: invitation,
    });
  }

  private async logActivity(documentId: string, userId: string, action: string, details?: any) {
    try {
      // Get tenant from document
      const document = await this.prisma.officeDocument.findUnique({
        where: { id: documentId },
        select: { tenantId: true },
      });
      
      if (document) {
        await this.prisma.documentActivity.create({
          data: {
            documentId,
            userId,
            action,
            details,
            tenantId: document.tenantId,
          },
        });
      }
    } catch (error) {
      this.logger.warn('Failed to log activity:', error);
    }
  }
}