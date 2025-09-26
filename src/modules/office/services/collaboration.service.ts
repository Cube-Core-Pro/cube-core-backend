import { Injectable, NotFoundException } from '@nestjs/common';
import { CollaborationService as CoreCollaborationService } from '../../../office/services/collaboration.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../audit/audit.service';
import { NotificationService } from '../../../notifications/notification.service';
import { DocumentService } from './document.service';
import { ShareDocumentDto, CollaborationInviteDto } from '../../../office/dto/office.dto';

@Injectable()
export class CollaborationService extends CoreCollaborationService {
  constructor(
    prisma: PrismaService,
    redis: RedisService,
    auditService: AuditService,
    notificationService: NotificationService,
    private readonly documentService: DocumentService,
  ) {
    super(prisma, redis, auditService, notificationService);
  }

  async shareDocument(
    tenantId: string,
    userId: string,
    documentId: string,
    shareDto: ShareDocumentDto,
  ) {
    return this.documentService.share(tenantId, userId, documentId, shareDto);
  }

  async inviteCollaborator(
    tenantId: string,
    userId: string,
    inviteDto: CollaborationInviteDto,
  ) {
    const processed: string[] = [];
    const invitations: any[] = [];
    const errors: Array<{ email: string; reason: string }> = [];

    for (const email of inviteDto.emails) {
      const sharePayload: ShareDocumentDto = {
        userIdOrEmail: email,
        permission: inviteDto.permission,
        message: inviteDto.message,
        expiresAt: inviteDto.expiresAt,
      };

      try {
        await this.documentService.share(tenantId, userId, inviteDto.documentId, sharePayload);
        processed.push(email);
      } catch (error) {
        if (error instanceof NotFoundException) {
          const invitation = await this.prisma.officeInvitation.create({
            data: {
              documentId: inviteDto.documentId,
              email,
              permission: inviteDto.permission,
              message: inviteDto.message,
              expiresAt: inviteDto.expiresAt ?? null,
              tenantId,
              invitedBy: userId,
            },
          });
          invitations.push(invitation);
        } else {
          errors.push({ email, reason: (error as Error).message });
        }
      }
    }

    return {
      shared: processed,
      invitations,
      errors,
    };
  }

  async getActiveSessions(tenantId: string, documentId: string) {
    return this.prisma.officeSession.findMany({
      where: {
        tenantId,
        documentId,
        isActive: true,
      },
      orderBy: { lastActivity: 'desc' },
    });
  }
}
