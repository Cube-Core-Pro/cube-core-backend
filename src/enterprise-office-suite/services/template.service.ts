// path: backend/src/enterprise-office-suite/services/template.service.ts
// purpose: Document template management service
// dependencies: Prisma, Template Engine, Preview Generation

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(tenantId: string, type?: string) {
    try {
      const where: any = {
        OR: [
          { tenantId },
          { isGlobal: true },
        ],
        isActive: true,
      };

      if (type) {
        where.type = type;
      }

      // TODO: Implement proper template system when DocumentTemplate model is added
      const templates = await this.prisma.officeDocument.findMany({
        where: {
          tenantId,
          type: 'TEMPLATE',
          deletedAt: null,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { title: 'asc' },
      });

      return templates;
    } catch (error) {
      this.logger.error('Error getting templates:', error);
      throw error;
    }
  }

  async getTemplate(templateId: string) {
    try {
      const template = await this.prisma.officeDocument.findUnique({
        where: { id: templateId },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      return template;
    } catch (error) {
      this.logger.error('Error getting template:', error);
      throw error;
    }
  }

  async createTemplate(tenantId: string, userId: string, data: {
    name: string;
    description: string;
    type: string;
    content: any;
    thumbnail?: string;
    category?: string;
    tags?: string[];
  }) {
    try {
      const template = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          title: data.name,
          description: data.description,
          type: 'TEMPLATE',
          format: 'TEMPLATE',
          content: data.content,
          tags: data.tags || [],
          createdBy: userId,
          checksum: 'temp-checksum', // TODO: Calculate actual checksum
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return template;
    } catch (error) {
      this.logger.error('Error creating template:', error);
      throw error;
    }
  }
}