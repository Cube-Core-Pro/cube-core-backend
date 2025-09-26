// path: backend/src/enterprise-office-suite/services/document.service.ts
// purpose: Service for managing office documents
// dependencies: @nestjs/common, prisma, file-system

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { DocumentEntity, DocumentWithRelations, DocumentPermission } from '../entities/document.entity';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly documentsPath = process.env.DOCUMENTS_PATH || './storage/documents';

  constructor(private prisma: PrismaService) {
    this.ensureStorageDirectory();
  }

  async create(
    createDocumentDto: CreateDocumentDto,
    tenantId: string,
    userId: string
  ): Promise<DocumentEntity> {
    try {
      this.logger.log(`Creating document: ${createDocumentDto.title}`);

      // Generate content checksum
      const contentString = JSON.stringify(createDocumentDto.content || {});
      const checksum = crypto.createHash('sha256').update(contentString).digest('hex');
      const size = Buffer.byteLength(contentString, 'utf8');

      // Create document record
      const document = await this.prisma.officeDocument.create({
        data: {
          title: createDocumentDto.title,
          description: createDocumentDto.description,
          type: createDocumentDto.type,
          format: createDocumentDto.format,
          content: createDocumentDto.content || {},
          templateId: createDocumentDto.templateId,
          folderId: createDocumentDto.folderId,
          tags: createDocumentDto.tags || [],
          isPublic: createDocumentDto.isPublic || false,
          allowCollaboration: createDocumentDto.allowCollaboration !== false,
          settings: createDocumentDto.settings || {},
          version: 1,
          size,
          checksum,
          tenantId,
          createdBy: userId,
          lastModifiedBy: userId
        }
      });

      // Save content to file system
      await this.saveDocumentContent(document.id, createDocumentDto.content || {});

      // Create initial version
      await this.createVersion(document.id, 1, 'Initial version', userId);

      // Add creator as admin collaborator
      await this.addCollaborator(document.id, userId, DocumentPermission.ADMIN, userId);

      this.logger.log(`Document created successfully: ${document.id}`);
      return {
        ...document,
        content: document.content as Record<string, any>,
        settings: document.settings as Record<string, any>
      } as DocumentEntity;
    } catch (error) {
      this.logger.error(`Failed to create document: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    folderId?: string,
    type?: string,
    includePublic: boolean = true
  ): Promise<DocumentWithRelations[]> {
    const whereCondition: any = {
      deletedAt: null,
      OR: [
        { tenantId },
        ...(includePublic ? [{ isPublic: true }] : []),
        {
          collaborators: {
            some: { userId }
          }
        }
      ]
    };

    if (folderId) {
      whereCondition.folderId = folderId;
    }

    if (type) {
      whereCondition.type = type;
    }

    const documents = await this.prisma.officeDocument.findMany({
      where: whereCondition,
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        lastModifier: {
          select: { id: true, name: true, email: true }
        },
        folder: {
          select: { id: true, name: true, path: true }
        },
        template: {
          select: { id: true, title: true, type: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return documents.map(doc => ({
      ...doc,
      content: doc.content as Record<string, any>,
      settings: doc.settings as Record<string, any>
    })) as DocumentWithRelations[];
  }

  async findOne(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<DocumentWithRelations> {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { tenantId },
          { isPublic: true },
          {
            collaborators: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        lastModifier: {
          select: { id: true, name: true, email: true }
        },
        folder: {
          select: { id: true, name: true, path: true }
        },
        template: {
          select: { id: true, title: true, type: true }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        versions: {
          include: {
            creator: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { version: 'desc' },
          take: 10
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      ...document,
      content: document.content as Record<string, any>,
      settings: document.settings as Record<string, any>,
      comments: document.comments?.map(comment => ({
        ...comment,
        position: comment.position as Record<string, any>
      }))
    } as DocumentWithRelations;
  }

  async update(
    id: string,
    updateData: Partial<CreateDocumentDto>,
    tenantId: string,
    userId: string
  ): Promise<DocumentEntity> {
    const document = await this.findOne(id, tenantId, userId);

    // Check if user has write permission
    const hasWritePermission = await this.checkPermission(id, userId, DocumentPermission.WRITE);
    if (!hasWritePermission) {
      throw new ForbiddenException('You do not have permission to edit this document');
    }

    // Calculate new checksum if content changed
    let checksum = document.checksum;
    let size = document.size;
    if (updateData.content) {
      const contentString = JSON.stringify(updateData.content);
      checksum = crypto.createHash('sha256').update(contentString).digest('hex');
      size = Buffer.byteLength(contentString, 'utf8');

      // Save updated content to file system
      await this.saveDocumentContent(id, updateData.content);
    }

    const updatedDocument = await this.prisma.officeDocument.update({
      where: { id },
      data: {
        ...updateData,
        checksum,
        size,
        version: { increment: 1 },
        lastModifiedBy: userId,
        updatedAt: new Date()
      }
    });

    // Create new version if content changed
    if (updateData.content) {
      await this.createVersion(
        id,
        updatedDocument.version,
        'Content updated',
        userId
      );
    }

    this.logger.log(`Document updated: ${id}`);
    return {
      ...updatedDocument,
      content: updatedDocument.content as Record<string, any>,
      settings: updatedDocument.settings as Record<string, any>
    } as DocumentEntity;
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const document = await this.findOne(id, tenantId, userId);

    // Check if user has admin permission
    const hasAdminPermission = await this.checkPermission(id, userId, DocumentPermission.ADMIN);
    if (!hasAdminPermission && document.createdBy !== userId) {
      throw new ForbiddenException('You do not have permission to delete this document');
    }

    await this.prisma.officeDocument.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    this.logger.log(`Document deleted: ${id}`);
  }

  async addCollaborator(
    documentId: string,
    userId: string,
    permission: DocumentPermission,
    requesterId: string
  ): Promise<void> {
    // Check if requester has admin permission
    const hasAdminPermission = await this.checkPermission(documentId, requesterId, DocumentPermission.ADMIN);
    if (!hasAdminPermission) {
      throw new ForbiddenException('You do not have permission to add collaborators');
    }

    await this.prisma.documentCollaborator.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      },
      update: { permission },
      create: {
        documentId,
        userId,
        permission
      }
    });

    this.logger.log(`Collaborator added to document ${documentId}: ${userId} with ${permission}`);
  }

  async removeCollaborator(
    documentId: string,
    userId: string,
    requesterId: string
  ): Promise<void> {
    // Check if requester has admin permission
    const hasAdminPermission = await this.checkPermission(documentId, requesterId, DocumentPermission.ADMIN);
    if (!hasAdminPermission) {
      throw new ForbiddenException('You do not have permission to remove collaborators');
    }

    await this.prisma.documentCollaborator.delete({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });

    this.logger.log(`Collaborator removed from document ${documentId}: ${userId}`);
  }

  async addComment(
    documentId: string,
    content: string,
    position: Record<string, any> | undefined,
    userId: string
  ): Promise<any> {
    // Check if user has at least read permission
    const hasReadPermission = await this.checkPermission(documentId, userId, DocumentPermission.READ);
    if (!hasReadPermission) {
      throw new ForbiddenException('You do not have permission to comment on this document');
    }

    const comment = await this.prisma.documentComment.create({
      data: {
        documentId,
        content,
        position,
        userId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    this.logger.log(`Comment added to document ${documentId} by ${userId}`);
    return comment;
  }

  async exportDocument(
    id: string,
    format: string,
    tenantId: string,
    userId: string
  ): Promise<Buffer> {
    const document = await this.findOne(id, tenantId, userId);

    // Check if user has read permission
    const hasReadPermission = await this.checkPermission(id, userId, DocumentPermission.READ);
    if (!hasReadPermission) {
      throw new ForbiddenException('You do not have permission to export this document');
    }

    // Load document content
    const content = await this.loadDocumentContent(id);

    // Convert to requested format
    return this.convertDocument(content, document.format, format);
  }

  private async checkPermission(
    documentId: string,
    userId: string,
    requiredPermission: DocumentPermission
  ): Promise<boolean> {
    const collaborator = await this.prisma.documentCollaborator.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });

    if (!collaborator) return false;

    const permissionLevels = {
      [DocumentPermission.READ]: 1,
      [DocumentPermission.COMMENT]: 2,
      [DocumentPermission.WRITE]: 3,
      [DocumentPermission.ADMIN]: 4
    };

    return permissionLevels[collaborator.permission] >= permissionLevels[requiredPermission];
  }

  private async createVersion(
    documentId: string,
    version: number,
    changes: string,
    userId: string
  ): Promise<void> {
    await this.prisma.documentVersion.create({
      data: {
        documentId,
        version,
        changes,
        createdBy: userId
      }
    });
  }

  private async saveDocumentContent(
    documentId: string,
    content: Record<string, any>
  ): Promise<void> {
    const filePath = path.join(this.documentsPath, `${documentId}.json`);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  private async loadDocumentContent(documentId: string): Promise<Record<string, any>> {
    const filePath = path.join(this.documentsPath, `${documentId}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.warn(`Could not load document content for ${documentId}: ${error.message}`);
      return {};
    }
  }

  private async convertDocument(
    content: Record<string, any>,
    _fromFormat: string,
    _toFormat: string
  ): Promise<Buffer> {
    // TODO: Implement document conversion logic
    // For now, return JSON representation
    return Buffer.from(JSON.stringify(content, null, 2));
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.documentsPath);
    } catch {
      await fs.mkdir(this.documentsPath, { recursive: true });
      this.logger.log(`Created documents storage directory: ${this.documentsPath}`);
    }
  }
}