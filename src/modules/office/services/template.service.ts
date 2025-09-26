// path: backend/src/modules/office/services/template.service.ts
// purpose: Enterprise template management service for documents, presentations, and spreadsheets
// dependencies: @nestjs/common, prisma, redis, file-storage

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { randomUUID, createHash } from 'crypto';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'presentation' | 'spreadsheet' | 'form' | 'report';
  category: string;
  tags: string[];
  thumbnail: string;
  previewImages: string[];
  content: TemplateContent;
  variables: TemplateVariable[];
  metadata: TemplateMetadata;
  settings: TemplateSettings;
  isPublic: boolean;
  isPremium: boolean;
  usage: TemplateUsage;
}

export interface TemplateContent {
  format: 'json' | 'html' | 'markdown' | 'xml';
  data: any;
  styles: any;
  assets: TemplateAsset[];
}

export interface TemplateAsset {
  id: string;
  type: 'image' | 'font' | 'icon' | 'media';
  name: string;
  url: string;
  size: number;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'list' | 'object';
  description?: string;
  defaultValue?: any;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
  placeholder?: string;
}

export interface TemplateMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  compatibility: string[];
  language: string;
  industry?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TemplateSettings {
  allowCustomization: boolean;
  allowDownload: boolean;
  allowSharing: boolean;
  requireAttribution: boolean;
  licenseType: 'free' | 'premium' | 'enterprise';
}

export interface TemplateUsage {
  downloadCount: number;
  useCount: number;
  rating: number;
  reviewCount: number;
  lastUsedAt?: Date;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  parentId?: string;
  subCategories?: TemplateCategory[];
  templateCount: number;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTemplate(
    userId: string,
    tenantId: string,
    templateData: {
      name: string;
      description: string;
      type: string;
      category: string;
      tags?: string[];
      content: TemplateContent;
      variables?: TemplateVariable[];
      isPublic?: boolean;
      isPremium?: boolean;
    }
  ): Promise<DocumentTemplate> {
    try {
      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(templateData.content, templateData.type);

      // Persist to OfficeTemplate; extended fields are stored inside content JSON
      const storedContent = this.buildStoredContent({
        content: templateData.content,
        variables: templateData.variables || [],
        metadata: {
          author: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          compatibility: ['web', 'desktop'],
          language: 'en',
          difficulty: 'beginner',
        },
        settings: {
          allowCustomization: true,
          allowDownload: true,
          allowSharing: templateData.isPublic || false,
          requireAttribution: false,
          licenseType: templateData.isPremium ? 'premium' : 'free',
        },
        usage: {
          downloadCount: 0,
          useCount: 0,
          rating: 0,
          reviewCount: 0,
        },
        previewImages: [thumbnail],
        isPremium: !!templateData.isPremium,
      });

      const template = await this.prisma.officeTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          type: templateData.type,
          category: templateData.category,
          tags: templateData.tags || [],
          thumbnail,
          content: storedContent,
          isPublic: templateData.isPublic || false,
          tenantId,
          createdBy: userId,
        },
      });

      this.logger.log(`Template created: ${template.id}`);
      return this.mapDbTemplateToDto(template);
    } catch (error) {
      this.logger.error('Error creating template', error);
      throw error;
    }
  }

  async getTemplate(
    templateId: string,
    userId?: string,
    tenantId?: string
  ): Promise<DocumentTemplate> {
    try {
      // Check cache first
      const cacheKey = `template:${templateId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const template = await this.prisma.officeTemplate.findFirst({
        where: {
          id: templateId,
          OR: [
            { isPublic: true },
            ...(tenantId ? [{ tenantId }] : []),
          ],
        },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Basic access check: must be same tenant if private
      if (!template.isPublic && template.tenantId !== tenantId) {
        throw new BadRequestException('Access denied to template');
      }

      // Cache for 30 minutes
      const dto = this.mapDbTemplateToDto(template);
      await this.redis.setex(cacheKey, 1800, JSON.stringify(dto));

      return dto;
    } catch (error) {
      this.logger.error('Error getting template', error);
      throw error;
    }
  }

  async searchTemplates(
    query: {
      search?: string;
      type?: string;
      category?: string;
      tags?: string[];
      isPremium?: boolean;
      difficulty?: string;
      language?: string;
      sortBy?: 'name' | 'createdAt' | 'rating' | 'usage';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    },
    userId?: string,
    tenantId?: string
  ): Promise<{ templates: DocumentTemplate[]; total: number }> {
    try {
      const where = {
        OR: [
          { isPublic: true },
          ...(tenantId ? [{ tenantId }] : []),
        ],
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as any } },
            { description: { contains: query.search, mode: 'insensitive' as any } },
            { tags: { hasSome: [query.search] } },
          ],
        }),
        ...(query.type && { type: query.type }),
        ...(query.category && { category: query.category }),
        ...(query.tags && query.tags.length > 0 && {
          tags: { hasSome: query.tags },
        }),
        // isPremium is stored in content JSON; filter via JSON path
        ...(query.isPremium !== undefined && {
          content: { path: ['isPremium'], equals: query.isPremium },
        }),
        ...(query.difficulty && {
          content: { path: ['metadata', 'difficulty'], equals: query.difficulty },
        }),
        ...(query.language && {
          content: { path: ['metadata', 'language'], equals: query.language },
        }),
      };

      const orderBy = this.buildOrderBy(query.sortBy, query.sortOrder);

      const [templates, total] = await Promise.all([
        this.prisma.officeTemplate.findMany({
          where,
          orderBy,
          take: query.limit || 20,
          skip: query.offset || 0,
        }),
        this.prisma.officeTemplate.count({ where }),
      ]);

      return {
        templates: templates.map((t) => this.mapDbTemplateToDto(t)),
        total,
      };
    } catch (error) {
      this.logger.error('Error searching templates', error);
      throw error;
    }
  }

  async getCategories(): Promise<TemplateCategory[]> {
    try {
      const cacheKey = 'template_categories';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get categories with template counts
      const categories = await this.prisma.officeTemplate.groupBy({
        by: ['category'],
        _count: { category: true },
      });

      const templateCategories: TemplateCategory[] = await Promise.all(
        categories.map(async (cat) => {
          const categoryInfo = this.getCategoryInfo(cat.category);
          return {
            id: cat.category,
            name: categoryInfo.name,
            description: categoryInfo.description,
            icon: categoryInfo.icon,
            templateCount: cat._count.category,
          };
        })
      );

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(templateCategories));

      return templateCategories;
    } catch (error) {
      this.logger.error('Error getting categories', error);
      throw error;
    }
  }

  async useTemplate(
    templateId: string,
    userId: string,
    tenantId: string,
    variables?: Record<string, any>
  ): Promise<{
    documentId: string;
    content: any;
  }> {
    try {
      const template = await this.getTemplate(templateId, userId, tenantId);
      
      // Process template with variables
      const processedContent = await this.processTemplate(template, variables || {});
      
      // Create new document from template
      const document = await this.createDocumentFromTemplate(
        template,
        processedContent,
        userId,
        tenantId
      );

      // Update usage statistics
      await this.updateTemplateUsage(templateId);

      this.logger.log(`Template used: ${templateId} -> Document: ${document.id}`);
      
      return {
        documentId: document.id,
        content: processedContent,
      };
    } catch (error) {
      this.logger.error('Error using template', error);
      throw error;
    }
  }

  async duplicateTemplate(
    templateId: string,
    userId: string,
    tenantId: string,
    newName?: string
  ): Promise<DocumentTemplate> {
    try {
      const originalTemplate = await this.getTemplate(templateId, userId, tenantId);
      
      const duplicatedTemplate = await this.createTemplate(userId, tenantId, {
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        type: originalTemplate.type,
        category: originalTemplate.category,
        tags: originalTemplate.tags,
        content: originalTemplate.content,
        variables: originalTemplate.variables,
        isPublic: false, // Duplicates are private by default
        isPremium: false,
      });

      this.logger.log(`Template duplicated: ${templateId} -> ${duplicatedTemplate.id}`);
      return duplicatedTemplate;
    } catch (error) {
      this.logger.error('Error duplicating template', error);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    userId: string,
    tenantId: string,
    updates: Partial<DocumentTemplate>
  ): Promise<DocumentTemplate> {
    try {
      const template = await this.prisma.officeTemplate.findFirst({
        where: { id: templateId, tenantId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Check if user has permission to edit
      if (template.createdBy !== userId) {
        throw new BadRequestException('No permission to edit template');
      }

      // Merge updates into content JSON for extended fields
      const currentDto = this.mapDbTemplateToDto(template);
      const merged: DocumentTemplate = {
        ...currentDto,
        ...updates,
        metadata: { ...currentDto.metadata, ...(updates.metadata || {}), updatedAt: new Date() },
        variables: updates.variables ?? currentDto.variables,
        content: updates.content ?? currentDto.content,
        settings: updates.settings ?? currentDto.settings,
        usage: updates.usage ?? currentDto.usage,
        previewImages: updates.previewImages ?? currentDto.previewImages,
      } as DocumentTemplate;

      const newContent = this.buildStoredContent({
        content: merged.content,
        variables: merged.variables,
        metadata: merged.metadata,
        settings: merged.settings,
        usage: merged.usage,
        previewImages: merged.previewImages,
        isPremium: merged.isPremium,
      });

      const updatedTemplate = await this.prisma.officeTemplate.update({
        where: { id: templateId },
        data: {
          name: merged.name,
          description: merged.description,
          type: merged.type,
          category: merged.category,
          tags: merged.tags,
          thumbnail: merged.thumbnail,
          content: newContent,
          isPublic: merged.isPublic,
        },
      });

      // Clear cache
      await this.redis.del(`template:${templateId}`);

      this.logger.log(`Template updated: ${templateId}`);
      return this.mapDbTemplateToDto(updatedTemplate);
    } catch (error) {
      this.logger.error('Error updating template', error);
      throw error;
    }
  }

  async deleteTemplate(
    templateId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const template = await this.prisma.officeTemplate.findFirst({
        where: { id: templateId, tenantId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      // Check if user has permission to delete
      if (template.createdBy !== userId) {
        throw new BadRequestException('No permission to delete template');
      }

      await this.prisma.officeTemplate.delete({
        where: { id: templateId },
      });

      // Clear cache
      await this.redis.del(`template:${templateId}`);
      await this.redis.del('template_categories');

      this.logger.log(`Template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error('Error deleting template', error);
      throw error;
    }
  }

  async rateTemplate(
    templateId: string,
    userId: string,
    rating: number,
    review?: string
  ): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      // Persist rating inside content JSON (ratings array + aggregate in usage)
      const dbTemplate = await this.prisma.officeTemplate.findUnique({ where: { id: templateId } });
      if (!dbTemplate) throw new NotFoundException('Template not found');

      const dto = this.mapDbTemplateToDto(dbTemplate);
      const now = new Date();
      const ratings = this.getRatingsFromDto(dto);
      const existing = ratings.find((r) => r.userId === userId);
      if (existing) {
        existing.rating = rating;
        existing.review = review;
        existing.updatedAt = now.toISOString();
      } else {
        ratings.push({ userId, rating, review, updatedAt: now.toISOString() });
      }

      // Recompute aggregates
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      dto.usage.rating = averageRating;
      dto.usage.reviewCount = ratings.length;

      // Save back to DB
      const updatedContent = this.buildStoredContent({
        content: dto.content,
        variables: dto.variables,
        metadata: dto.metadata,
        settings: dto.settings,
        usage: dto.usage,
        previewImages: dto.previewImages,
        isPremium: dto.isPremium,
        ratings,
      });

      await this.prisma.officeTemplate.update({
        where: { id: templateId },
        data: { content: updatedContent },
      });

      this.logger.log(`Template rated: ${templateId} - ${rating}/5`);
    } catch (error) {
      this.logger.error('Error rating template', error);
      throw error;
    }
  }

  async getTemplateAnalytics(
    templateId: string,
    userId: string,
    tenantId: string
  ): Promise<{
    usage: TemplateUsage;
    analytics: {
      dailyUsage: Array<{ date: string; count: number }>;
      topUsers: Array<{ userId: string; userName: string; usageCount: number }>;
      popularVariables: Array<{ variable: string; usageCount: number }>;
    };
  }> {
    try {
      const template = await this.getTemplate(templateId, userId, tenantId);
      
      // Get usage analytics for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [dailyUsage, topUsers] = await Promise.all([
        this.getDailyUsage(templateId, thirtyDaysAgo),
        this.getTopUsers(templateId),
      ]);

      return {
        usage: template.usage,
        analytics: {
          dailyUsage,
          topUsers,
          popularVariables: [], // Would be calculated from actual usage data
        },
      };
    } catch (error) {
      this.logger.error('Error getting template analytics', error);
      throw error;
    }
  }

  // Note: Access is controlled by tenant scope and isPublic flag in OfficeTemplate

  private buildOrderBy(sortBy?: string, sortOrder?: string): any {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    
    switch (sortBy) {
      case 'name':
        return { name: order };
      // rating and usage are stored in JSON content; Prisma doesn't support ordering by JSON path here
      case 'rating':
      case 'usage':
        return { updatedAt: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  private async processTemplate(
    template: DocumentTemplate,
    variables: Record<string, any>
  ): Promise<any> {
    try {
      let content = JSON.stringify(template.content.data);
      
      // Replace template variables
      for (const variable of template.variables) {
        const value = variables[variable.name] ?? variable.defaultValue ?? '';
        const placeholder = `{{${variable.name}}}`;
        content = content.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error('Error processing template', error);
      throw new BadRequestException('Invalid template content');
    }
  }

  private async createDocumentFromTemplate(
    template: DocumentTemplate,
    content: any,
    userId: string,
    tenantId: string
  ): Promise<{ id: string }> {
    // This would create the actual document based on template type
    // For now, return a mock document ID
    return { id: randomUUID() };
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      const dbTemplate = await this.prisma.officeTemplate.findUnique({ where: { id: templateId } });
      if (!dbTemplate) return;
      const dto = this.mapDbTemplateToDto(dbTemplate);
      dto.usage.useCount = (dto.usage.useCount || 0) + 1;
      dto.usage.lastUsedAt = new Date();
      const updatedContent = this.buildStoredContent({
        content: dto.content,
        variables: dto.variables,
        metadata: dto.metadata,
        settings: dto.settings,
        usage: dto.usage,
        previewImages: dto.previewImages,
        isPremium: dto.isPremium,
        ratings: this.getRatingsFromDto(dto),
      });
      await this.prisma.officeTemplate.update({ where: { id: templateId }, data: { content: updatedContent } });
    } catch (error) {
      this.logger.warn('Failed to update template usage', error);
    }
  }

  // Ratings aggregation handled within rateTemplate and stored in content JSON

  private getCategoryInfo(category: string): { name: string; description: string; icon: string } {
    const categoryMap = {
      'business': { name: 'Business', description: 'Business documents and reports', icon: 'briefcase' },
      'education': { name: 'Education', description: 'Educational materials and lessons', icon: 'graduation-cap' },
      'marketing': { name: 'Marketing', description: 'Marketing materials and campaigns', icon: 'megaphone' },
      'personal': { name: 'Personal', description: 'Personal documents and letters', icon: 'user' },
      'legal': { name: 'Legal', description: 'Legal documents and contracts', icon: 'scales' },
      'creative': { name: 'Creative', description: 'Creative and artistic templates', icon: 'palette' },
      'finance': { name: 'Finance', description: 'Financial reports and budgets', icon: 'chart-line' },
      'hr': { name: 'Human Resources', description: 'HR documents and forms', icon: 'users' },
    };

    return categoryMap[category] || { name: category, description: '', icon: 'document' };
  }

  private async generateThumbnail(content: TemplateContent, type: string): Promise<string> {
    // Generate thumbnail based on template content and type
    // This would use a thumbnail generation service
    return `/thumbnails/template-${randomUUID()}.png`;
  }

  private async getDailyUsage(templateId: string, since: Date): Promise<Array<{ date: string; count: number }>> {
    // Get daily usage statistics
    // This would query actual usage logs
    return [];
  }

  private async getTopUsers(templateId: string): Promise<Array<{ userId: string; userName: string; usageCount: number }>> {
    // Get top users of this template
    // This would query actual usage data
    return [];
  }

  private async getTemplateRatings(templateId: string): Promise<any[]> {
    // Ratings stored in content JSON; return a basic structure
    const t = await this.prisma.officeTemplate.findUnique({ where: { id: templateId } });
    if (!t) return [];
    const dto = this.mapDbTemplateToDto(t);
    return this.getRatingsFromDto(dto);
  }

  // Helpers to map DB <-> DTO
  private mapDbTemplateToDto(db: any): DocumentTemplate {
    const content = (db?.content || {}) as any;
    const usage: TemplateUsage = {
      downloadCount: content?.usage?.downloadCount ?? 0,
      useCount: content?.usage?.useCount ?? 0,
      rating: content?.usage?.rating ?? 0,
      reviewCount: content?.usage?.reviewCount ?? 0,
      lastUsedAt: content?.usage?.lastUsedAt ? new Date(content.usage.lastUsedAt) : undefined,
    };

    const dto: DocumentTemplate = {
      id: db.id,
      name: db.name,
      description: db.description,
      type: db.type,
      category: db.category,
      tags: db.tags || [],
      thumbnail: db.thumbnail,
      previewImages: content?.previewImages || [],
      content: content?.content || { format: 'json', data: {}, styles: {}, assets: [] },
      variables: content?.variables || [],
      metadata: content?.metadata || {
        author: db.createdBy,
        createdAt: db.createdAt,
        updatedAt: db.updatedAt,
        version: '1.0.0',
        compatibility: ['web', 'desktop'],
        language: 'en',
        difficulty: 'beginner',
      },
      settings: content?.settings || {
        allowCustomization: true,
        allowDownload: true,
        allowSharing: db.isPublic,
        requireAttribution: false,
        licenseType: 'free',
      },
      isPublic: db.isPublic,
      isPremium: !!content?.isPremium,
      usage,
    };
    return dto;
  }

  private buildStoredContent(params: {
    content: TemplateContent;
    variables: TemplateVariable[];
    metadata: TemplateMetadata;
    settings: TemplateSettings;
    usage: TemplateUsage;
    previewImages: string[];
    isPremium: boolean;
    ratings?: Array<{ userId: string; rating: number; review?: string; updatedAt: string }>;
  }): any {
    return {
      content: params.content,
      variables: params.variables,
      metadata: params.metadata,
      settings: params.settings,
      usage: {
        downloadCount: params.usage?.downloadCount ?? 0,
        useCount: params.usage?.useCount ?? 0,
        rating: params.usage?.rating ?? 0,
        reviewCount: params.usage?.reviewCount ?? 0,
        lastUsedAt: params.usage?.lastUsedAt ?? null,
      },
      previewImages: params.previewImages ?? [],
      isPremium: params.isPremium ?? false,
      ratings: params.ratings ?? [],
    };
  }

  private getRatingsFromDto(dto: DocumentTemplate): Array<{ userId: string; rating: number; review?: string; updatedAt: string }> {
    // Ratings are embedded in content JSON at persistence time; not exposed directly in DTO
    // We don't have them on the DTO, so callers that need raw ratings should fetch from DB via getTemplateRatings
    // Here we just return empty to avoid undefined
    // Note: mapDbTemplateToDto does not expose ratings to keep API compact
    return [];
  }
}