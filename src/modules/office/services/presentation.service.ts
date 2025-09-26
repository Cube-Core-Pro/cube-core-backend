// path: backend/src/modules/office/services/presentation.service.ts
// purpose: Enterprise presentation creation and management service with AI-powered features
// dependencies: @nestjs/common, prisma, redis, file-storage, ai-processing

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { randomUUID, createHash } from 'crypto';
import { Prisma } from '@prisma/client';

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  slides: Slide[];
  theme: PresentationTheme;
  settings: PresentationSettings;
  metadata: PresentationMetadata;
  sharing: SharingSettings;
  version: number;
}

export interface Slide {
  id: string;
  order: number;
  title: string;
  content: SlideContent[];
  layout: SlideLayout;
  background: SlideBackground;
  animations: Animation[];
  notes: string;
  duration?: number; // For auto-advance
}

export interface SlideContent {
  id: string;
  type: 'text' | 'image' | 'chart' | 'table' | 'video' | 'audio' | 'shape' | 'code' | 'embed';
  position: ContentPosition;
  properties: any;
  content: any;
  animations?: Animation[];
}

export interface ContentPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface SlideLayout {
  type: 'title' | 'content' | 'two-column' | 'image-text' | 'blank' | 'custom';
  template: string;
}

export interface SlideBackground {
  type: 'color' | 'gradient' | 'image' | 'video';
  value: string | { from: string; to: string; direction: string };
}

export interface Animation {
  id: string;
  type: 'entrance' | 'exit' | 'emphasis' | 'motion';
  effect: string;
  duration: number;
  delay: number;
  trigger: 'click' | 'auto' | 'with-previous' | 'after-previous';
  targetId: string;
}

export interface PresentationTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    code: string;
  };
  styles: {
    slideSize: { width: number; height: number };
    margins: { top: number; right: number; bottom: number; left: number };
  };
}

export interface PresentationSettings {
  autoSave: boolean;
  autoAdvance: boolean;
  defaultSlideDuration: number;
  showSlideNumbers: boolean;
  showNotes: boolean;
  enableComments: boolean;
  enableRealTimeEditing: boolean;
  exportFormats: string[];
}

export interface PresentationMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  lastEditedBy: string;
  tags: string[];
  category: string;
  language: string;
  estimatedDuration: number;
}

export interface SharingSettings {
  visibility: 'private' | 'internal' | 'public';
  allowComments: boolean;
  allowDownload: boolean;
  allowCopy: boolean;
  expiresAt?: Date;
  password?: string;
}

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createPresentation(
    userId: string,
    tenantId: string,
    data: {
      title: string;
      description?: string;
      templateId?: string;
      themeId?: string;
    }
  ): Promise<Presentation> {
    try {
      // Get or create default theme
      const theme = data.themeId ? 
        await this.getTheme(data.themeId) : 
        this.getDefaultTheme();

      // Create initial slide
      const initialSlide: Slide = {
        id: randomUUID(),
        order: 1,
        title: 'Title Slide',
        content: [{
          id: randomUUID(),
          type: 'text',
          position: { x: 10, y: 10, width: 80, height: 20, zIndex: 1 },
          properties: { fontSize: 36, fontWeight: 'bold', textAlign: 'center' },
          content: data.title,
        }],
        layout: { type: 'title', template: 'default' },
        background: { type: 'color', value: theme.colors.background },
        animations: [],
        notes: '',
      };

      // Store as OfficeDocument with type PRESENTATION and JSON content carrying presentation structure
  const contentObj: any = {
        slides: [initialSlide],
        theme,
        settings: this.getDefaultSettings(),
        metadata: {
          author: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastEditedBy: userId,
          tags: [],
          category: 'general',
          language: 'en',
          estimatedDuration: 5,
        },
        sharing: {
          visibility: 'private',
          allowComments: true,
          allowDownload: true,
          allowCopy: false,
        },
        version: 1,
      };

  const content: Prisma.InputJsonValue = contentObj as any;
      const checksum = createHash('sha256').update(JSON.stringify(contentObj)).digest('hex');
      const doc = await this.prisma.officeDocument.create({
        data: {
          title: data.title,
          description: data.description,
          type: 'PRESENTATION',
          format: 'PPTX',
          content,
          tags: [],
          isPublic: false,
          allowCollaboration: true,
          settings: {},
          version: 1,
          size: 0,
          checksum,
          tenantId,
          createdBy: userId,
          lastModifiedBy: userId,
        },
      });

      this.logger.log(`Presentation created: ${doc.id}`);
      return this.mapDocToPresentation(doc);
    } catch (error) {
      this.logger.error('Error creating presentation', error);
      throw error;
    }
  }

  async updatePresentation(
    presentationId: string,
    userId: string,
    tenantId: string,
    updates: Partial<Presentation>
  ): Promise<Presentation> {
    try {
      const existingDoc = await this.prisma.officeDocument.findFirst({
        where: { id: presentationId, tenantId, type: 'PRESENTATION' },
      });

      if (!existingDoc) {
        throw new NotFoundException('Presentation not found');
      }

      // Check if user has edit permission
      const hasPermission = await this.checkEditPermission(presentationId, userId, tenantId);
      if (!hasPermission) {
        throw new BadRequestException('No permission to edit presentation');
      }

      const existing = this.mapDocToPresentation(existingDoc);
      const merged: Presentation = {
        ...existing,
        ...updates,
        metadata: {
          ...existing.metadata,
          ...(updates.metadata || {}),
          updatedAt: new Date(),
          lastEditedBy: userId,
        },
        version: existing.version + 1,
      };

  const newContentObj: any = {
        slides: merged.slides,
        theme: merged.theme,
        settings: merged.settings,
        metadata: {
          ...merged.metadata,
          createdAt: merged.metadata.createdAt instanceof Date ? merged.metadata.createdAt.toISOString() : merged.metadata.createdAt,
          updatedAt: merged.metadata.updatedAt instanceof Date ? merged.metadata.updatedAt.toISOString() : merged.metadata.updatedAt,
        },
        sharing: merged.sharing,
        version: merged.version,
      };
  const newContent: Prisma.InputJsonValue = newContentObj as any;
      const checksum = createHash('sha256').update(JSON.stringify(newContentObj)).digest('hex');
      const updatedDoc = await this.prisma.officeDocument.update({
        where: { id: presentationId },
        data: {
          title: merged.title,
          description: merged.description,
          content: newContent,
          version: merged.version,
          lastModifiedBy: userId,
          checksum,
        },
      });

      // Cache updated presentation
      await this.cachePresentation(this.mapDocToPresentation(updatedDoc));

      this.logger.log(`Presentation updated: ${presentationId}`);
      return this.mapDocToPresentation(updatedDoc);
    } catch (error) {
      this.logger.error('Error updating presentation', error);
      throw error;
    }
  }

  async addSlide(
    presentationId: string,
    userId: string,
    tenantId: string,
    slideData: {
      title: string;
      layoutType: string;
      insertAfter?: number;
    }
  ): Promise<Slide> {
    try {
      const presentation = await this.getPresentation(presentationId, userId, tenantId);
      
      const newSlide: Slide = {
        id: randomUUID(),
        order: slideData.insertAfter ? slideData.insertAfter + 1 : presentation.slides.length + 1,
        title: slideData.title,
        content: this.getDefaultContentForLayout(slideData.layoutType),
        layout: { type: slideData.layoutType as any, template: 'default' },
        background: presentation.theme.colors ? 
          { type: 'color', value: presentation.theme.colors.background } :
          { type: 'color', value: '#ffffff' },
        animations: [],
        notes: '',
      };

      // Reorder existing slides if inserting in middle
      if (slideData.insertAfter !== undefined) {
        presentation.slides.forEach(slide => {
          if (slide.order > slideData.insertAfter) {
            slide.order += 1;
          }
        });
      }

      presentation.slides.push(newSlide);

      await this.updatePresentation(presentationId, userId, tenantId, {
        slides: presentation.slides,
      });

      this.logger.log(`Slide added to presentation: ${presentationId}`);
      return newSlide;
    } catch (error) {
      this.logger.error('Error adding slide', error);
      throw error;
    }
  }

  async updateSlide(
    presentationId: string,
    slideId: string,
    userId: string,
    tenantId: string,
    updates: Partial<Slide>
  ): Promise<Slide> {
    try {
  const presentation = await this.getPresentation(presentationId, userId, tenantId);
      
      const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      presentation.slides[slideIndex] = {
        ...presentation.slides[slideIndex],
        ...updates,
      };

      await this.updatePresentation(presentationId, userId, tenantId, {
        slides: presentation.slides,
      });

      this.logger.log(`Slide updated: ${slideId}`);
      return presentation.slides[slideIndex];
    } catch (error) {
      this.logger.error('Error updating slide', error);
      throw error;
    }
  }

  async deleteSlide(
    presentationId: string,
    slideId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
  const presentation = await this.getPresentation(presentationId, userId, tenantId);
      
      if (presentation.slides.length <= 1) {
        throw new BadRequestException('Cannot delete the last slide');
      }

      const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      const deletedOrder = presentation.slides[slideIndex].order;
      presentation.slides = presentation.slides.filter(s => s.id !== slideId);

      // Reorder remaining slides
      presentation.slides.forEach(slide => {
        if (slide.order > deletedOrder) {
          slide.order -= 1;
        }
      });

      await this.updatePresentation(presentationId, userId, tenantId, {
        slides: presentation.slides,
      });

      this.logger.log(`Slide deleted: ${slideId}`);
    } catch (error) {
      this.logger.error('Error deleting slide', error);
      throw error;
    }
  }

  async getPresentation(
    presentationId: string,
    userId: string,
    tenantId: string
  ): Promise<Presentation> {
    try {
      // Check cache first
      const cacheKey = `presentation:${presentationId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const doc = await this.prisma.officeDocument.findFirst({
        where: { id: presentationId, tenantId, type: 'PRESENTATION' },
      });

      if (!doc) {
        throw new NotFoundException('Presentation not found');
      }

      // Check view permission
      const hasPermission = await this.checkViewPermission(presentationId, userId, tenantId);
      if (!hasPermission) {
        throw new BadRequestException('No permission to view presentation');
      }

      // Cache for 5 minutes
      const dto = this.mapDocToPresentation(doc);
      await this.redis.setex(cacheKey, 300, JSON.stringify(dto));

      return dto;
    } catch (error) {
      this.logger.error('Error getting presentation', error);
      throw error;
    }
  }

  async getUserPresentations(
    userId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      category?: string;
      sortBy?: 'title' | 'updatedAt' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ presentations: Presentation[]; total: number }> {
    try {
      const where: any = {
        tenantId,
        type: 'PRESENTATION',
        OR: [
          { createdBy: userId },
          { content: { path: ['sharing', 'visibility'], not: 'private' } },
        ],
        ...(options.search && {
          OR: [
            { title: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
          ],
        }),
        ...(options.category && {
          content: { path: ['metadata', 'category'], equals: options.category },
        }),
      };

      const [docs, total] = await Promise.all([
        this.prisma.officeDocument.findMany({
          where,
          orderBy: { updatedAt: options.sortOrder || 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.officeDocument.count({ where }),
      ]);

      return { presentations: docs.map((d) => this.mapDocToPresentation(d)), total };
    } catch (error) {
      this.logger.error('Error getting user presentations', error);
      throw error;
    }
  }

  async exportPresentation(
    presentationId: string,
    userId: string,
    tenantId: string,
    format: 'pdf' | 'pptx' | 'html' | 'images'
  ): Promise<{ downloadUrl: string; filename: string }> {
    try {
      const presentation = await this.getPresentation(presentationId, userId, tenantId);
      
      // Generate export based on format
      let exportResult;
      switch (format) {
        case 'pdf':
          exportResult = await this.exportToPDF(presentation);
          break;
        case 'pptx':
          exportResult = await this.exportToPPTX(presentation);
          break;
        case 'html':
          exportResult = await this.exportToHTML(presentation);
          break;
        case 'images':
          exportResult = await this.exportToImages(presentation);
          break;
        default:
          throw new BadRequestException('Unsupported export format');
      }

      this.logger.log(`Presentation exported: ${presentationId} to ${format}`);
      return exportResult;
    } catch (error) {
      this.logger.error('Error exporting presentation', error);
      throw error;
    }
  }

  async generateAISlideContent(
    prompt: string,
    slideType: string,
    theme: PresentationTheme
  ): Promise<SlideContent[]> {
    try {
  // AI-powered slide content generation
      // This would integrate with AI services to generate content based on prompt
      const content: SlideContent[] = [];

      if (slideType === 'title') {
        content.push({
          id: randomUUID(),
          type: 'text',
          position: { x: 10, y: 30, width: 80, height: 40, zIndex: 1 },
          properties: {
            fontSize: 36,
            fontWeight: 'bold',
            textAlign: 'center',
            color: theme.colors.primary,
          },
          content: prompt,
        });
      } else {
        // Generate content based on AI analysis of prompt
        content.push({
          id: randomUUID(),
          type: 'text',
          position: { x: 10, y: 20, width: 80, height: 60, zIndex: 1 },
          properties: {
            fontSize: 18,
            textAlign: 'left',
            color: theme.colors.text,
          },
          content: `AI-generated content for: ${prompt}`,
        });
      }

      return content;
    } catch (error) {
      this.logger.error('Error generating AI slide content', error);
      throw error;
    }
  }

  private async checkViewPermission(
    presentationId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    // Check if user owns the presentation or has been granted access
    const doc = await this.prisma.officeDocument.findFirst({
      where: { id: presentationId, tenantId, type: 'PRESENTATION' },
    });

    if (!doc) return false;
    if (doc.createdBy === userId) return true;

    // Check sharing settings in content JSON
    const visibility = (doc.content as any)?.sharing?.visibility as string | undefined;
    if (visibility && (visibility === 'public' || visibility === 'internal')) return true;

    return false;
  }

  private async checkEditPermission(
    presentationId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    // Check if user owns the presentation
    const doc = await this.prisma.officeDocument.findFirst({
      where: { id: presentationId, tenantId, type: 'PRESENTATION' },
    });
    if (!doc) return false;
    return doc.createdBy === userId;
  }

  private getDefaultTheme(): PresentationTheme {
    return {
      id: 'default',
      name: 'Default Theme',
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1e293b',
      },
      fonts: {
        heading: 'Inter, sans-serif',
        body: 'Inter, sans-serif',
        code: 'Monaco, monospace',
      },
      styles: {
        slideSize: { width: 1920, height: 1080 },
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
      },
    };
  }

  private getDefaultSettings(): PresentationSettings {
    return {
      autoSave: true,
      autoAdvance: false,
      defaultSlideDuration: 30,
      showSlideNumbers: true,
      showNotes: false,
      enableComments: true,
      enableRealTimeEditing: true,
      exportFormats: ['pdf', 'pptx', 'html'],
    };
  }

  private getDefaultContentForLayout(layoutType: string): SlideContent[] {
    switch (layoutType) {
      case 'title':
        return [{
          id: randomUUID(),
          type: 'text',
          position: { x: 10, y: 30, width: 80, height: 40, zIndex: 1 },
          properties: { fontSize: 36, fontWeight: 'bold', textAlign: 'center' },
          content: 'Slide Title',
        }];
      case 'content':
        return [
          {
            id: randomUUID(),
            type: 'text',
            position: { x: 10, y: 10, width: 80, height: 15, zIndex: 1 },
            properties: { fontSize: 28, fontWeight: 'bold' },
            content: 'Slide Title',
          },
          {
            id: randomUUID(),
            type: 'text',
            position: { x: 10, y: 30, width: 80, height: 60, zIndex: 2 },
            properties: { fontSize: 18 },
            content: 'Content goes here...',
          },
        ];
      default:
        return [];
    }
  }

  private async getTheme(themeId: string): Promise<PresentationTheme> {
    // In a real implementation, this would fetch from database
    return this.getDefaultTheme();
  }

  private async cachePresentation(presentation: any): Promise<void> {
    const cacheKey = `presentation:${presentation.id}`;
    await this.redis.setex(cacheKey, 300, JSON.stringify(presentation));
  }

  private async exportToPDF(presentation: Presentation): Promise<{ downloadUrl: string; filename: string }> {
    // PDF export implementation
    return {
      downloadUrl: '/exports/presentation.pdf',
      filename: `${presentation.title}.pdf`,
    };
  }

  private async exportToPPTX(presentation: Presentation): Promise<{ downloadUrl: string; filename: string }> {
    // PowerPoint export implementation
    return {
      downloadUrl: '/exports/presentation.pptx',
      filename: `${presentation.title}.pptx`,
    };
  }

  private async exportToHTML(presentation: Presentation): Promise<{ downloadUrl: string; filename: string }> {
    // HTML export implementation
    return {
      downloadUrl: '/exports/presentation.html',
      filename: `${presentation.title}.html`,
    };
  }

  private async exportToImages(presentation: Presentation): Promise<{ downloadUrl: string; filename: string }> {
    // Images export implementation
    return {
      downloadUrl: '/exports/presentation-images.zip',
      filename: `${presentation.title}-images.zip`,
    };
  }

  // Mapping helpers
  private mapDocToPresentation(doc: any): Presentation {
    const content = (doc.content || {}) as any;
    const meta = content.metadata || {};
    const presentation: Presentation = {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      slides: content.slides || [],
      theme: content.theme || this.getDefaultTheme(),
      settings: content.settings || this.getDefaultSettings(),
      metadata: {
        author: meta.author,
        createdAt: meta.createdAt ? new Date(meta.createdAt) : new Date(doc.createdAt),
        updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : new Date(doc.updatedAt),
        lastEditedBy: meta.lastEditedBy || doc.lastModifiedBy || doc.createdBy,
        tags: meta.tags || [],
        category: meta.category || 'general',
        language: meta.language || 'en',
        estimatedDuration: meta.estimatedDuration || 0,
      },
      sharing: content.sharing || { visibility: 'private', allowComments: true, allowDownload: true, allowCopy: false },
      version: content.version || doc.version || 1,
    };
    return presentation;
  }
}