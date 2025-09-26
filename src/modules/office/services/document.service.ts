import { Injectable } from '@nestjs/common';
import { DocumentService as CoreDocumentService } from '../../../office/services/document.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../audit/audit.service';
import { FileStorageService } from '../../../storage/file-storage.service';
import { NotificationService } from '../../../notifications/notification.service';
import { CreateDocumentDto, UpdateDocumentDto } from '../../../office/dto/office.dto';

@Injectable()
export class DocumentService extends CoreDocumentService {
  constructor(
    prisma: PrismaService,
    redis: RedisService,
    auditService: AuditService,
    fileStorage: FileStorageService,
    notificationService: NotificationService,
  ) {
    super(prisma, redis, auditService, fileStorage, notificationService);
  }

  async createDocument(tenantId: string, userId: string, dto: CreateDocumentDto) {
    return this.create(tenantId, userId, dto);
  }

  async updateDocument(tenantId: string, userId: string, documentId: string, dto: UpdateDocumentDto) {
    return this.update(tenantId, userId, documentId, dto);
  }
}
