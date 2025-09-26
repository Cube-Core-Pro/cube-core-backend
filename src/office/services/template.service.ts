// path: backend/src/office/services/template.service.ts
// purpose: Template management for documents, spreadsheets, presentations
// dependencies: Prisma, file storage, audit logging

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { FileStorageService } from '../../storage/file-storage.service';
import { CreateTemplateDto, DocumentType } from '../dto/office.dto';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async findAll(tenantId: string, filters: any = {}) {
    try {
      const { type, category, isPublic } = filters;

      const where: any = {
        OR: [
          { tenantId },
          { isPublic: true }
        ]
      };

      if (type) {
        where.type = type;
      }

      if (category) {
        where.category = category;
      }

      if (isPublic !== undefined) {
        where.isPublic = isPublic;
      }

      const templates = await this.prisma.officeTemplate.findMany({
        where,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
        },
        orderBy: [
          { isPublic: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return templates.map(template => ({
        id: template.id,
        name: template.name,
        type: template.type,
        description: template.description,
        category: template.category,
        previewImage: template.thumbnail,
        isPublic: template.isPublic,
        usageCount: 0,
        documentsCreated: 0,
        createdAt: template.createdAt,
        createdBy: template.creator,
        isTenantTemplate: template.tenantId === tenantId,
      }));
    } catch (error) {
      this.logger.error('Error finding templates:', error);
      throw error;
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const template = await this.prisma.officeTemplate.findFirst({
        where: {
          id,
          OR: [
            { tenantId },
            { isPublic: true }
          ]
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      return template;
    } catch (error) {
      this.logger.error('Error finding template:', error);
      throw error;
    }
  }

  async create(tenantId: string, userId: string, createTemplateDto: CreateTemplateDto) {
    try {
      // Generate preview image if not provided
      let previewImage = createTemplateDto.previewImage;
      if (!previewImage) {
        previewImage = await this.generatePreviewImage(createTemplateDto.content, createTemplateDto.type, tenantId);
      }

      const template = await this.prisma.officeTemplate.create({
        data: {
          tenantId,
          createdBy: userId,
          name: createTemplateDto.name,
          type: createTemplateDto.type,
          description: createTemplateDto.description,
          content: createTemplateDto.content,
          thumbnail: previewImage,
          category: createTemplateDto.category || 'General',
          tags: createTemplateDto.tags || [],
          isPublic: createTemplateDto.isPublic || false,
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CREATE',
        resource: 'TEMPLATE',
        resourceId: template.id,
        details: { 
          name: template.name, 
          type: template.type,
          isPublic: template.isPublic,
          category: template.category,
          contentSize: JSON.stringify(template.content).length,
        },
      });

      return template;
    } catch (error) {
      this.logger.error('Error creating template:', error);
      throw error;
    }
  }

  async update(tenantId: string, userId: string, id: string, updateData: Partial<CreateTemplateDto>) {
    try {
      const template = await this.prisma.officeTemplate.findFirst({
        where: {
          id,
          tenantId, // Only tenant templates can be updated
          createdBy: userId, // Only creator can update
        }
      });

      if (!template) {
        throw new NotFoundException('Template not found or insufficient permissions');
      }

      const dataToUpdate: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      if (dataToUpdate.previewImage !== undefined) {
        dataToUpdate.thumbnail = dataToUpdate.previewImage;
        delete dataToUpdate.previewImage;
      }

      const updatedTemplate = await this.prisma.officeTemplate.update({
        where: { id },
        data: dataToUpdate,
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'UPDATE',
        resource: 'TEMPLATE',
        resourceId: id,
        details: { 
          changes: Object.keys(updateData),
          previousName: template.name,
          newName: updateData.name || template.name,
          fieldsChanged: Object.keys(updateData).length,
          templateType: template.type,
        }
      });

      return updatedTemplate;
    } catch (error) {
      this.logger.error('Error updating template:', error);
      throw error;
    }
  }

  async remove(tenantId: string, userId: string, id: string) {
    try {
      const template = await this.prisma.officeTemplate.findFirst({
        where: {
          id,
          tenantId, // Only tenant templates can be deleted
          createdBy: userId, // Only creator can delete
        }
      });

      if (!template) {
        throw new NotFoundException('Template not found or insufficient permissions');
      }

      // Check if template is being used
      const documentsUsingTemplate = await this.prisma.officeDocument.count({
        where: { templateId: id }
      });

      if (documentsUsingTemplate > 0) {
        throw new ForbiddenException('Cannot delete template that is being used by documents');
      }

      await this.prisma.officeTemplate.delete({
        where: { id }
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'DELETE',
        resource: 'TEMPLATE',
        resourceId: id,
        details: { 
          name: template.name,
          type: template.type,
          category: template.category,
          wasPublic: template.isPublic,
          documentsUsingTemplate,
        }
      });

      return { message: 'Template deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting template:', error);
      throw error;
    }
  }

  async useTemplate(tenantId: string, templateId: string) {
    try {
      const template = await this.findOne(tenantId, templateId);

      return template.content;
    } catch (error) {
      this.logger.error('Error using template:', error);
      throw error;
    }
  }

  async getCategories(tenantId: string) {
    try {
      const categories = await this.prisma.officeTemplate.groupBy({
        by: ['category'],
        where: {
          OR: [
            { tenantId },
            { isPublic: true }
          ]
        },
        _count: {
          category: true
        },
        orderBy: {
          _count: {
            category: 'desc'
          }
        }
      });

      return categories.map(cat => ({
        name: cat.category,
        count: cat._count.category
      }));
    } catch (error) {
      this.logger.error('Error getting categories:', error);
      throw error;
    }
  }

  async getPopularTemplates(tenantId: string, limit: number = 10) {
    try {
      const templates = await this.prisma.officeTemplate.findMany({
        where: {
          OR: [
            { tenantId },
            { isPublic: true }
          ]
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      return templates;
    } catch (error) {
      this.logger.error('Error getting popular templates:', error);
      throw error;
    }
  }

  async duplicateTemplate(tenantId: string, userId: string, templateId: string, newName?: string) {
    try {
      const originalTemplate = await this.findOne(tenantId, templateId);

      const duplicatedTemplate = await this.create(tenantId, userId, {
        name: newName || `${originalTemplate.name} (Copy)`,
        type: originalTemplate.type as DocumentType,
        description: originalTemplate.description,
        content: originalTemplate.content,
        category: originalTemplate.category,
        isPublic: false, // Duplicated templates are private by default
      });

      return duplicatedTemplate;
    } catch (error) {
      this.logger.error('Error duplicating template:', error);
      throw error;
    }
  }

  async createFromDocument(tenantId: string, userId: string, documentId: string, templateData: any) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const template = await this.create(tenantId, userId, {
        name: templateData.name || `Template from ${document.title}`,
        type: document.type as DocumentType,
        description: templateData.description || `Template created from ${document.title}`,
        content: document.content,
        category: templateData.category || 'Custom',
        isPublic: templateData.isPublic || false,
      });

      // Link template to original document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { templateId: template.id }
      });

      return template;
    } catch (error) {
      this.logger.error('Error creating template from document:', error);
      throw error;
    }
  }

  private async generatePreviewImage(content: any, type: string, tenantId?: string): Promise<string> {
    try {
      // Generate actual preview image using content
      const previewBuffer = await this.createPreviewFromContent(content, type);
      
      if (previewBuffer && tenantId) {
        // Upload preview image to storage
        const uploadResult = await this.fileStorage.uploadFile(previewBuffer, {
          tenantId,
          userId: 'system',
          folder: 'template-previews',
          isPublic: true,
          compress: false,
          encrypt: false,
          virusScan: false,
          generateThumbnail: false,
          metadata: {
            originalName: `${type.toLowerCase()}-preview.png`,
            description: `Preview image for ${type} template`,
            tags: ['template', 'preview', type.toLowerCase()],
          },
        });
        
        return uploadResult.url || uploadResult.metadata?.uploadResult?.url;
      }

      // Fallback to placeholders
      const placeholders = {
        DOCUMENT: '/images/templates/document-preview.png',
        SPREADSHEET: '/images/templates/spreadsheet-preview.png',
        PRESENTATION: '/images/templates/presentation-preview.png',
      };

      return placeholders[type as keyof typeof placeholders] || '/images/templates/default-preview.png';
    } catch (error) {
      this.logger.error('Error generating preview image:', error);
      return '/images/templates/default-preview.png';
    }
  }

  private async createPreviewFromContent(_content: any, _type: string): Promise<Buffer | null> {
    try {
      // This would use a library like Puppeteer, Sharp, or Canvas to generate preview
      // For now, return null to use placeholders
      
      // Example implementation would be:
      // - For DOCUMENT: Render first page as image
      // - For SPREADSHEET: Render grid with sample data
      // - For PRESENTATION: Render first slide
      
      return null;
    } catch (error) {
      this.logger.error('Error creating preview from content:', error);
      return null;
    }
  }

  async getDefaultTemplates() {
    try {
      // Return built-in system templates
      const defaultTemplates = [
        {
          id: 'default-document-blank',
          name: 'Blank Document',
          type: 'DOCUMENT',
          description: 'Start with a blank document',
          category: 'Basic',
          isPublic: true,
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: ''
                  }
                ]
              }
            ]
          }
        },
        {
          id: 'default-spreadsheet-blank',
          name: 'Blank Spreadsheet',
          type: 'SPREADSHEET',
          description: 'Start with a blank spreadsheet',
          category: 'Basic',
          isPublic: true,
          content: {
            sheets: [
              {
                name: 'Sheet1',
                cells: {},
                rows: 100,
                cols: 26
              }
            ]
          }
        },
        {
          id: 'default-presentation-blank',
          name: 'Blank Presentation',
          type: 'PRESENTATION',
          description: 'Start with a blank presentation',
          category: 'Basic',
          isPublic: true,
          content: {
            slides: [
              {
                id: 'slide_1',
                title: 'Title Slide',
                layout: 'title-slide',
                elements: []
              }
            ]
          }
        }
      ];

      return defaultTemplates;
    } catch (error) {
      this.logger.error('Error getting default templates:', error);
      throw error;
    }
  }
}
