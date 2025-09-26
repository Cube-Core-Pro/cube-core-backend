// path: backend/src/modules/collaboration/collaboration.service.ts
// purpose: Main collaboration service orchestrating real-time document collaboration
// dependencies: @nestjs/common, prisma, redis, websockets

import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DocumentPermissionService } from './services/document-permission.service';
import { CollaborationSessionService } from './services/collaboration-session.service';
import { DocumentActivityService } from './services/document-activity.service';
import { CreateCollaborationSessionDto, UpdateDocumentDto, InviteCollaboratorDto } from './dto';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly permissionService: DocumentPermissionService,
    private readonly sessionService: CollaborationSessionService,
    private readonly activityService: DocumentActivityService,
  ) {}

  async startCollaboration(
    documentId: string,
    userId: string,
    tenantId: string,
    dto: CreateCollaborationSessionDto,
  ) {
    // Verify document access
    const hasAccess = await this.permissionService.checkDocumentAccess(
      documentId,
      userId,
      'READ',
    );

    if (!hasAccess) {
      throw new ForbiddenException('No access to document');
    }

    // Start collaboration session
    const session = await this.sessionService.createSession({
      documentId,
      userId,
      tenantId,
      ...dto,
    });

    // Log activity
    await this.activityService.logActivity({
      documentId,
      userId,
      tenantId,
      action: 'COLLABORATION_STARTED',
      details: { sessionId: session.id },
    });

    // Cache active session
    await this.redis.setex(
      `collaboration:${documentId}:${userId}`,
      3600, // 1 hour
      JSON.stringify(session),
    );

    return session;
  }

  async updateDocument(
    documentId: string,
    userId: string,
    tenantId: string,
    changes: UpdateDocumentDto,
  ) {
    // Verify write access
    const hasAccess = await this.permissionService.checkDocumentAccess(
      documentId,
      userId,
      'WRITE',
    );

    if (!hasAccess) {
      throw new ForbiddenException('No write access to document');
    }

    // Update document
    const document = await this.prisma.officeDocument.update({
      where: { id: documentId, tenantId },
      data: {
        content: changes.content,
        version: { increment: 1 },
        lastModifiedBy: userId,
        updatedAt: new Date(),
      },
    });

    // Log change
    await this.activityService.logDocumentChange({
      documentId,
      userId,
      tenantId,
      changeType: 'CONTENT_UPDATE',
      changes: changes.content,
    });

    // Broadcast to active collaborators
    await this.broadcastChange(documentId, {
      type: 'DOCUMENT_UPDATED',
      userId,
      changes: changes.content,
      version: document.version,
      timestamp: new Date(),
    });

    return document;
  }

  async inviteCollaborator(
    documentId: string,
    inviterId: string,
    tenantId: string,
    dto: InviteCollaboratorDto,
  ) {
    // Verify admin access
    const hasAccess = await this.permissionService.checkDocumentAccess(
      documentId,
      inviterId,
      'ADMIN',
    );

    if (!hasAccess) {
      throw new ForbiddenException('No admin access to document');
    }

    // Create invitation
    const invitation = await this.prisma.collaborationInvitation.create({
      data: {
        documentId,
        email: dto.email,
        permission: dto.permission,
        message: dto.message,
        expiresAt: dto.expiresAt,
        tenantId,
        invitedBy: inviterId,
      },
    });

    // Log activity
    await this.activityService.logActivity({
      documentId,
      userId: inviterId,
      tenantId,
      action: 'COLLABORATOR_INVITED',
      details: { email: dto.email, permission: dto.permission },
    });

    // TODO: Send email invitation
    this.logger.log(`Collaboration invitation sent to ${dto.email} for document ${documentId}`);

    return invitation;
  }

  async getActiveCollaborators(documentId: string, tenantId: string) {
    const activeSessions = await this.prisma.collaborationSession.findMany({
      where: {
        documentId,
        tenantId,
        isActive: true,
        lastActivity: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return activeSessions;
  }

  async getDocumentActivity(documentId: string, tenantId: string, limit = 50) {
    return this.prisma.documentActivity.findMany({
      where: { documentId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async broadcastChange(documentId: string, change: any) {
    // Publish to Redis for WebSocket broadcasting
    await this.redis.publish(
      `collaboration:${documentId}`,
      JSON.stringify(change),
    );
  }

  async endCollaboration(documentId: string, userId: string, tenantId: string) {
    // End session
    await this.sessionService.endSession(documentId, userId);

    // Remove from cache
    await this.redis.del(`collaboration:${documentId}:${userId}`);

    // Log activity
    await this.activityService.logActivity({
      documentId,
      userId,
      tenantId,
      action: 'COLLABORATION_ENDED',
    });
  }

  async getCollaborationMetrics(tenantId: string, dateRange?: { from: Date; to: Date }) {
    const where = {
      tenantId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [
      totalSessions,
      activeSessions,
      totalActivities,
      uniqueCollaborators,
    ] = await Promise.all([
      this.prisma.collaborationSession.count({ where }),
      this.prisma.collaborationSession.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.documentActivity.count({ where }),
      this.prisma.collaborationSession.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalSessions,
      activeSessions,
      totalActivities,
      uniqueCollaborators: uniqueCollaborators.length,
    };
  }
}