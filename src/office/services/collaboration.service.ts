// path: backend/src/office/services/collaboration.service.ts
// purpose: Real-time collaboration features - comments, cursors, presence
// dependencies: Prisma, WebSocket, Redis, notifications

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { CommentDto } from '../dto/office.dto';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
    protected readonly auditService: AuditService,
    protected readonly notificationService: NotificationService,
  ) {}

  async getCollaborators(tenantId: string, userId: string, documentId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Get all users with access to the document
      const [owner, shares] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: document.createdBy },
          select: { id: true, firstName: true, lastName: true, avatar: true, email: true }
        }),
        this.prisma.officeShare.findMany({
          where: { documentId },
          include: {
            sharedWithUser: {
              select: { id: true, firstName: true, lastName: true, avatar: true, email: true }
            }
          }
        })
      ]);

      const collaborators = [
        {
          ...owner,
          permission: 'ADMIN',
          isOwner: true,
          isOnline: await this.isUserOnline(owner!.id, documentId),
          lastSeen: await this.getLastSeen(owner!.id, documentId),
        },
        ...(await Promise.all(shares.map(async (share) => {
          const collaborator = share.sharedWithUser;
          if (!collaborator) {
            return null;
          }

          return {
            ...collaborator,
            permission: share.permissions,
            isOwner: false,
            isOnline: await this.isUserOnline(collaborator.id, documentId),
            lastSeen: await this.getLastSeen(collaborator.id, documentId),
            sharedAt: share.createdAt,
          };
        })))
      ];

      return collaborators.filter(Boolean);
    } catch (error) {
      this.logger.error('Error getting collaborators:', error);
      throw error;
    }
  }

  async updatePresence(tenantId: string, userId: string, documentId: string, presenceData: any) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const presence = {
        userId,
        documentId,
        cursor: presenceData.cursor,
        selection: presenceData.selection,
        viewport: presenceData.viewport,
        lastActivity: new Date(),
        isTyping: presenceData.isTyping || false,
      };

      // Store presence in Redis with TTL
      const presenceKey = `presence:${documentId}:${userId}`;
      await this.redis.setex(presenceKey, 30, JSON.stringify(presence)); // 30 seconds TTL

      // Broadcast presence to other collaborators
      // This would be handled by WebSocket gateway
      
      return presence;
    } catch (error) {
      this.logger.error('Error updating presence:', error);
      throw error;
    }
  }

  async getPresence(tenantId: string, userId: string, documentId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Get all presence data for the document
      const presenceKeys = await this.redis.keys(`presence:${documentId}:*`);
      const presenceData = await Promise.all(
        presenceKeys.map(async (key) => {
          const data = await this.redis.get(key);
          return data ? JSON.parse(data) : null;
        })
      );

      // Filter out null values and current user
      const activePresence = presenceData
        .filter(p => p && p.userId !== userId)
        .map(async (p) => {
          const user = await this.prisma.user.findUnique({
            where: { id: p.userId },
            select: { id: true, firstName: true, lastName: true, avatar: true }
          });
          return { ...p, user };
        });

      return Promise.all(activePresence);
    } catch (error) {
      this.logger.error('Error getting presence:', error);
      throw error;
    }
  }

  async getComments(tenantId: string, userId: string, documentId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const comments = await this.prisma.officeComment.findMany({
        where: { documentId },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          replies: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, avatar: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return comments.map(comment => ({
        id: comment.id,
        text: comment.content,
        position: comment.position,
        resolved: comment.isResolved,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: comment.user,
        replies: comment.replies.map(reply => ({
          id: reply.id,
          text: reply.content,
          createdAt: reply.createdAt,
          author: reply.user,
        })),
      }));
    } catch (error) {
      this.logger.error('Error getting comments:', error);
      throw error;
    }
  }

  async addComment(tenantId: string, userId: string, documentId: string, commentDto: CommentDto) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const permission = await this.getUserPermission(document, userId);
      if (!['COMMENT', 'EDIT', 'ADMIN'].includes(permission)) {
        throw new ForbiddenException('Insufficient permissions to comment');
      }

      const comment = await this.prisma.officeComment.create({
        data: {
          tenantId,
          documentId,
          userId: userId,
          content: commentDto.content,
          position: commentDto.position,
          parentId: commentDto.replyToId,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Notify document owner and collaborators
      await this.notifyCollaborators(tenantId, documentId, userId, {
        type: 'COMMENT_ADDED',
        message: `${comment.user.firstName} ${comment.user.lastName} added a comment`,
        data: { commentId: comment.id, text: comment.content }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'COMMENT',
        resource: `office:document:${documentId}`,
        details: { commentId: comment.id, isReply: !!commentDto.replyToId },
      });

      return comment;
    } catch (error) {
      this.logger.error('Error adding comment:', error);
      throw error;
    }
  }

  async updateComment(tenantId: string, userId: string, commentId: string, text: string) {
    try {
      const comment = await this.prisma.officeComment.findFirst({
        where: { id: commentId, userId: userId }
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Verify the document belongs to the tenant
      const document = await this.prisma.officeDocument.findFirst({
        where: { 
          id: comment.documentId,
          tenantId 
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const updatedComment = await this.prisma.officeComment.update({
        where: { id: commentId },
        data: { content: text, updatedAt: new Date() },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'UPDATE_COMMENT',
        resource: `office:document:${comment.documentId}`,
        details: { commentId },
      });

      return updatedComment;
    } catch (error) {
      this.logger.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(tenantId: string, userId: string, commentId: string) {
    try {
      const comment = await this.prisma.officeComment.findFirst({
        where: { id: commentId }
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Get the document to verify permissions
      const document = await this.prisma.officeDocument.findFirst({
        where: { 
          id: comment.documentId,
          tenantId 
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Only comment author or document owner can delete
      if (comment.userId !== userId && document.createdBy !== userId) {
        throw new ForbiddenException('Insufficient permissions to delete comment');
      }

      await this.prisma.officeComment.delete({
        where: { id: commentId }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'DELETE_COMMENT',
        resource: `office:document:${document.id}`,
        details: { commentId },
      });

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  async resolveComment(tenantId: string, userId: string, commentId: string) {
    try {
      const comment = await this.prisma.officeComment.findFirst({
        where: { id: commentId }
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Get the document to verify permissions
      const document = await this.prisma.officeDocument.findFirst({
        where: { 
          id: comment.documentId,
          tenantId 
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const permission = await this.getUserPermission(document, userId);
      if (!['EDIT', 'ADMIN'].includes(permission)) {
        throw new ForbiddenException('Insufficient permissions to resolve comment');
      }

      const updatedComment = await this.prisma.officeComment.update({
        where: { id: commentId },
        data: { 
          isResolved: true,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'RESOLVE_COMMENT',
        resource: `office:document:${document.id}`,
        details: { commentId },
      });

      return updatedComment;
    } catch (error) {
      this.logger.error('Error resolving comment:', error);
      throw error;
    }
  }

  async trackChanges(tenantId: string, userId: string, documentId: string, changes: any[]) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const permission = await this.getUserPermission(document, userId);
      if (!['EDIT', 'ADMIN'].includes(permission)) {
        throw new ForbiddenException('Insufficient permissions to make changes');
      }

      // Store changes in Redis for real-time collaboration
      const changesKey = `changes:${documentId}:${Date.now()}`;
      const changeData = {
        userId,
        documentId,
        changes,
        timestamp: new Date(),
      };

      await this.redis.setex(changesKey, 3600, JSON.stringify(changeData)); // 1 hour TTL

      // Broadcast changes to other collaborators
      // This would be handled by WebSocket gateway

      return { message: 'Changes tracked successfully' };
    } catch (error) {
      this.logger.error('Error tracking changes:', error);
      throw error;
    }
  }

  private async notifyCollaborators(tenantId: string, documentId: string, excludeUserId: string, notification: any) {
    try {
      // Get all collaborators except the one who triggered the action
      const [document, shares] = await Promise.all([
        this.prisma.officeDocument.findUnique({
          where: { id: documentId },
          select: { createdBy: true, title: true }
        }),
        this.prisma.officeShare.findMany({
          where: { documentId },
          select: { sharedWith: true }
        })
      ]);

      if (!document) return;

      const userIds = [
        document.createdBy,
        ...shares.map((s) => s.sharedWith)
      ].filter((id) => id !== excludeUserId);

      // Send notifications to all collaborators
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            await this.notificationService.sendNotification({
              tenantId,
              type: 'IN_APP' as any,
              priority: 'NORMAL' as any,
              subject: notification.message,
              body: `Document: ${document.title}`,
              recipients: [{ userId }],
              data: {
                documentId,
                documentTitle: document.title,
                notificationType: notification.type,
                ...notification.data
              },
              metadata: {
                source: 'collaboration',
                documentId,
                actionType: notification.type
              }
            });
          } catch (error) {
            this.logger.error(`Failed to notify user ${userId}:`, error);
          }
        })
      );
      
      this.logger.log(`Notified ${userIds.length} collaborators about ${notification.type}`);
    } catch (error) {
      this.logger.error('Error notifying collaborators:', error);
    }
  }

  private async isUserOnline(userId: string, documentId: string): Promise<boolean> {
    const presenceKey = `presence:${documentId}:${userId}`;
    const presence = await this.redis.get(presenceKey);
    return !!presence;
  }

  private async getLastSeen(userId: string, documentId: string): Promise<Date | null> {
    const presenceKey = `presence:${documentId}:${userId}`;
    const presence = await this.redis.get(presenceKey);
    
    if (presence) {
      const data = JSON.parse(presence);
      return new Date(data.lastActivity);
    }

    // Fallback to document access log
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        userId,
        resource: `office:document:${documentId}`,
        action: { in: ['VIEW', 'UPDATE'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    return auditLog?.createdAt || null;
  }

  private async getUserPermission(document: any, userId: string): Promise<string> {
    if (document.createdBy === userId) {
      return 'ADMIN';
    }

    const share = await this.prisma.officeShare.findFirst({
      where: {
        documentId: document.id,
        sharedWith: userId,
      },
    });

    return (share?.permissions as string) || 'NONE';
  }
}
