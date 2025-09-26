// path: backend/src/siat/services/siat-template.service.ts
// purpose: Service for managing SIAT templates
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSiatTemplateDto } from '../dto/create-siat-template.dto';
import { SiatTemplateEntity, SiatTemplateWithRelations } from '../entities/siat-template.entity';

@Injectable()
export class SiatTemplateService {
  private readonly logger = new Logger(SiatTemplateService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createSiatTemplateDto: CreateSiatTemplateDto,
    tenantId: string,
    userId: string
  ): Promise<SiatTemplateEntity> {
    try {
      this.logger.log(`Creating SIAT template: ${createSiatTemplateDto.name}`);

      const template = await this.prisma.siatTemplate.create({
        data: {
          name: createSiatTemplateDto.name,
          description: createSiatTemplateDto.description,
          type: createSiatTemplateDto.type,
          template: this.prepareJson(createSiatTemplateDto.template ?? {}),
          tags: createSiatTemplateDto.tags || [],
          isSystem: createSiatTemplateDto.isSystem || false,
          tenantId,
          createdBy: userId
        }
      });

      this.logger.log(`SIAT template created successfully: ${template.id}`);
      return this.mapTemplate(template);
    } catch (error) {
      this.logger.error(`Failed to create SIAT template: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    type?: string,
    includeSystem: boolean = true
  ): Promise<SiatTemplateWithRelations[]> {
    const whereCondition: any = {
      deletedAt: null,
      OR: [
        { tenantId },
        ...(includeSystem ? [{ isSystem: true }] : [])
      ]
    };

    if (type) {
      whereCondition.type = type;
    }

    const templates = await this.prisma.siatTemplate.findMany({
      where: whereCondition,
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { isSystem: 'desc' }, // System templates first
        { createdAt: 'desc' }
      ]
    });

    return templates.map(template => this.mapTemplateWithRelations(template));
  }

  async findOne(
    id: string,
    tenantId: string,
    _userId: string
  ): Promise<SiatTemplateWithRelations> {
    const template = await this.prisma.siatTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { tenantId },
          { isSystem: true }
        ]
      },
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('SIAT template not found');
    }

    return this.mapTemplateWithRelations(template);
  }

  async update(
    id: string,
    updateSiatTemplateDto: Partial<CreateSiatTemplateDto>,
    tenantId: string,
    userId: string
  ): Promise<SiatTemplateEntity> {
    const template = await this.findOne(id, tenantId, userId);

    // Check if user can edit this template
    if (template.isSystem) {
      throw new ForbiddenException('Cannot edit system templates');
    }

    if (template.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot edit this template');
    }

    if (template.createdBy !== userId && template.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot edit this template');
    }

    const updateData: Prisma.SiatTemplateUpdateInput = {
      updatedAt: new Date(),
    };

    if (updateSiatTemplateDto.name !== undefined) updateData.name = updateSiatTemplateDto.name;
    if (updateSiatTemplateDto.description !== undefined) updateData.description = updateSiatTemplateDto.description;
    if (updateSiatTemplateDto.type !== undefined) updateData.type = updateSiatTemplateDto.type;
    if (updateSiatTemplateDto.template !== undefined) {
      updateData.template = this.prepareJson(updateSiatTemplateDto.template);
    }
    if (updateSiatTemplateDto.tags !== undefined) updateData.tags = updateSiatTemplateDto.tags;
    if (updateSiatTemplateDto.isSystem !== undefined) updateData.isSystem = updateSiatTemplateDto.isSystem;

    const updated = await this.prisma.siatTemplate.update({
      where: { id },
      data: updateData,
    });

    return this.mapTemplate(updated);
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const template = await this.findOne(id, tenantId, userId);

    // Check if user can delete this template
    if (template.isSystem) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    if (template.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot delete this template');
    }

    if (template.createdBy !== userId && template.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot delete this template');
    }

    await this.prisma.siatTemplate.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    this.logger.log(`SIAT template deleted: ${id}`);
  }

  async findByType(
    type: string,
    tenantId: string,
    includeSystem: boolean = true
  ): Promise<SiatTemplateWithRelations[]> {
    return this.findAll(tenantId, '', type, includeSystem);
  }

  async getSystemTemplates(): Promise<SiatTemplateWithRelations[]> {
    const templates = await this.prisma.siatTemplate.findMany({
      where: {
        isSystem: true,
        deletedAt: null
      },
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return templates.map(template => this.mapTemplateWithRelations(template));
  }

  async duplicate(
    id: string,
    tenantId: string,
    userId: string,
    newName?: string
  ): Promise<SiatTemplateEntity> {
    const originalTemplate = await this.findOne(id, tenantId, userId);

    const duplicatedTemplate = await this.prisma.siatTemplate.create({
      data: {
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        template: this.prepareJson(originalTemplate.template),
        tags: originalTemplate.tags,
        isSystem: false, // Copies are never system templates
        tenantId,
        createdBy: userId
      }
    });

    this.logger.log(`SIAT template duplicated: ${originalTemplate.id} -> ${duplicatedTemplate.id}`);
    return this.mapTemplate(duplicatedTemplate);
  }

  private prepareJson(value: unknown): Prisma.InputJsonValue {
    return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue;
  }

  private normalizeJson(value: unknown): any {
    if (value === null || value === undefined) {
      return {};
    }
    if (typeof value === 'object') {
      return value;
    }
    return {};
  }

  private mapTemplate(template: any): SiatTemplateEntity {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      template: this.normalizeJson(template.template),
      tags: Array.isArray(template.tags) ? template.tags : [],
      isSystem: Boolean(template.isSystem),
      tenantId: template.tenantId,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      deletedAt: template.deletedAt ?? undefined,
    };
  }

  private mapTemplateWithRelations(template: any): SiatTemplateWithRelations {
    return {
      ...this.mapTemplate(template),
      tenant: template.tenant ? { ...template.tenant } : undefined,
      creator: template.creator ? { ...template.creator } : undefined,
    };
  }
}
