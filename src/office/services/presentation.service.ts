// path: backend/src/office/services/presentation.service.ts
// purpose: Enterprise presentation service with slides, animations, collaboration, templates
// dependencies: PrismaService, RedisService, FileStorageService, AuditService, NotificationService

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { FileStorageService } from '../../storage/file-storage.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import * as crypto from 'crypto';

export interface CreatePresentationDto {
  title: string;
  description?: string;
  templateId?: string;
  theme?: string;
  slides?: SlideData[];
  settings?: PresentationSettings;
}

export interface SlideData {
  id?: string;
  type: 'title' | 'content' | 'image' | 'chart' | 'table' | 'video' | 'custom';
  title?: string;
  content?: any;
  layout?: string;
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
  animations?: Animation[];
  notes?: string;
  duration?: number; // For auto-advance
}

export interface Animation {
  id: string;
  type: 'entrance' | 'emphasis' | 'exit' | 'motion';
  effect: string;
  target: string; // Element selector
  delay: number;
  duration: number;
  easing?: string;
}

export interface PresentationSettings {
  autoAdvance?: boolean;
  slideTransition?: string;
  transitionDuration?: number;
  showSlideNumbers?: boolean;
  showNotes?: boolean;
  allowComments?: boolean;
  allowDownload?: boolean;
  password?: string;
}

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly fileStorage: FileStorageService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async createPresentation(
    tenantId: string,
    userId: string,
    createPresentationDto: CreatePresentationDto,
  ) {
    try {
      // Create initial slides if not provided
      let slides = createPresentationDto.slides || [];
      if (slides.length === 0) {
        slides = [
          {
            type: 'title',
            title: createPresentationDto.title,
            content: {
              subtitle: createPresentationDto.description || '',
              author: userId,
            },
            layout: 'title-slide',
          },
        ];
      }

      // Apply template if specified
      if (createPresentationDto.templateId) {
        const template = await this.getTemplate(tenantId, createPresentationDto.templateId);
        if (template) {
          slides = this.applyTemplate(slides, template);
        }
      }

      const contentPayload: any = {
        slides,
        settings: createPresentationDto.settings || this.getDefaultSettings(),
        theme: createPresentationDto.theme || 'default',
        version: 1,
      };

      this.refreshContentMeta(contentPayload);
      const contentSize = this.calculateContentSize(contentPayload);

      const presentation = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          createdBy: userId,
          format: 'PPTX',
          title: createPresentationDto.title,
          type: 'PRESENTATION',
          content: contentPayload,
          settings: contentPayload.settings,
          tags: [],
          size: contentSize,
          checksum: this.generateChecksum(contentPayload),
        },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CREATE',
        resource: 'PRESENTATION',
        resourceId: presentation.id,
        details: {
          title: presentation.title,
          slideCount: slides.length,
          templateUsed: !!createPresentationDto.templateId,
          theme: createPresentationDto.theme,
          hasTemplate: !!createPresentationDto.templateId,
          meta: contentPayload.meta,
        },
      });

      return presentation;
    } catch (error) {
      this.logger.error('Error creating presentation:', error);
      throw error;
    }
  }

  async updateSlide(
    tenantId: string,
    userId: string,
    presentationId: string,
    slideId: string,
    slideData: Partial<SlideData>,
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      const content = presentation.content as any;
      
      const slideIndex = content.slides.findIndex((slide: any) => slide.id === slideId);
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      // Update slide data
      content.slides[slideIndex] = {
        ...content.slides[slideIndex],
        ...slideData,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Update version
      content.version = (content.version || 1) + 1;
      this.refreshContentMeta(content);

      const updatedPresentation = await this.prisma.officeDocument.update({
        where: { id: presentationId },
        data: {
          content,
          updatedAt: new Date(),

        },
      });

      // Cache the updated presentation
      await this.cachePresentation(presentationId, updatedPresentation);

      // Notify collaborators
      await this.notifyCollaborators(tenantId, presentationId, userId, {
        type: 'slide_updated',
        slideId,
        slideIndex,
        changes: Object.keys(slideData),
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'UPDATE',
        resource: 'PRESENTATION_SLIDE',
        resourceId: `${presentationId}:${slideId}`,
        details: {
          presentationTitle: presentation.title,
          slideIndex,
          changes: Object.keys(slideData),
          slideType: content.slides[slideIndex].type,
          hasAnimations: !!(slideData.animations && slideData.animations.length > 0),
        },
      });

      return updatedPresentation;
    } catch (error) {
      this.logger.error('Error updating slide:', error);
      throw error;
    }
  }

  async addSlide(
    tenantId: string,
    userId: string,
    presentationId: string,
    slideData: SlideData,
    position?: number,
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      const content = presentation.content as any;

      // Generate slide ID
      const slideId = `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newSlide = {
        ...slideData,
        id: slideId,
        createdAt: new Date(),
        createdBy: userId,
      };

      // Insert slide at specified position or at the end
      if (position !== undefined && position >= 0 && position <= content.slides.length) {
        content.slides.splice(position, 0, newSlide);
      } else {
        content.slides.push(newSlide);
      }

      // Update version
      content.version = (content.version || 1) + 1;
      this.refreshContentMeta(content);

      const updatedPresentation = await this.prisma.officeDocument.update({
        where: { id: presentationId },
        data: {
          content,
          updatedAt: new Date(),

        },
      });

      // Cache the updated presentation
      await this.cachePresentation(presentationId, updatedPresentation);

      // Notify collaborators
      await this.notifyCollaborators(tenantId, presentationId, userId, {
        type: 'slide_added',
        slideId,
        position: position || content.slides.length - 1,
        slideType: slideData.type,
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CREATE',
        resource: 'PRESENTATION_SLIDE',
        resourceId: `${presentationId}:${slideId}`,
        details: {
          presentationTitle: presentation.title,
          slideType: slideData.type,
          position: position || content.slides.length - 1,
          meta: {
            totalSlides: content.slides.length,
            hasAnimations: !!(slideData.animations && slideData.animations.length > 0),
          },
        },
      });

      return { slideId, presentation: updatedPresentation };
    } catch (error) {
      this.logger.error('Error adding slide:', error);
      throw error;
    }
  }

  async deleteSlide(
    tenantId: string,
    userId: string,
    presentationId: string,
    slideId: string,
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      const content = presentation.content as any;

      const slideIndex = content.slides.findIndex((slide: any) => slide.id === slideId);
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      // Don't allow deleting the last slide
      if (content.slides.length === 1) {
        throw new ForbiddenException('Cannot delete the last slide');
      }

      const deletedSlide = content.slides[slideIndex];
      content.slides.splice(slideIndex, 1);

      // Update version
      content.version = (content.version || 1) + 1;
      this.refreshContentMeta(content);

      const updatedPresentation = await this.prisma.officeDocument.update({
        where: { id: presentationId },
        data: {
          content,
          updatedAt: new Date(),

        },
      });

      // Cache the updated presentation
      await this.cachePresentation(presentationId, updatedPresentation);

      // Notify collaborators
      await this.notifyCollaborators(tenantId, presentationId, userId, {
        type: 'slide_deleted',
        slideId,
        slideIndex,
        slideType: deletedSlide.type,
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'DELETE',
        resource: 'PRESENTATION_SLIDE',
        resourceId: `${presentationId}:${slideId}`,
        details: {
          presentationTitle: presentation.title,
          slideIndex,
          slideType: deletedSlide.type,
          meta: {
            remainingSlides: content.slides.length,
            deletedSlideTitle: deletedSlide.title,
          },
        },
      });

      return updatedPresentation;
    } catch (error) {
      this.logger.error('Error deleting slide:', error);
      throw error;
    }
  }

  async reorderSlides(
    tenantId: string,
    userId: string,
    presentationId: string,
    slideOrder: string[],
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      const content = presentation.content as any;

      // Validate that all slide IDs exist
      const currentSlideIds = content.slides.map((slide: any) => slide.id);
      const missingSlides = slideOrder.filter(id => !currentSlideIds.includes(id));
      const extraSlides = currentSlideIds.filter(id => !slideOrder.includes(id));

      if (missingSlides.length > 0 || extraSlides.length > 0) {
        throw new ForbiddenException('Invalid slide order: missing or extra slides');
      }

      // Reorder slides
      const reorderedSlides = slideOrder.map(slideId => 
        content.slides.find((slide: any) => slide.id === slideId)
      );

      content.slides = reorderedSlides;
      content.version = (content.version || 1) + 1;
      this.refreshContentMeta(content);

      const updatedPresentation = await this.prisma.officeDocument.update({
        where: { id: presentationId },
        data: {
          content,
          updatedAt: new Date(),
        },
      });

      // Cache the updated presentation
      await this.cachePresentation(presentationId, updatedPresentation);

      // Notify collaborators
      await this.notifyCollaborators(tenantId, presentationId, userId, {
        type: 'slides_reordered',
        newOrder: slideOrder,
      });

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'UPDATE',
        resource: 'PRESENTATION',
        resourceId: presentationId,
        details: {
          presentationTitle: presentation.title,
          action: 'reorder_slides',
          slideCount: slideOrder.length,
          meta: {
            newOrder: slideOrder,
            previousOrder: currentSlideIds,
          },
        },
      });

      return updatedPresentation;
    } catch (error) {
      this.logger.error('Error reordering slides:', error);
      throw error;
    }
  }

  async exportPresentation(
    tenantId: string,
    userId: string,
    presentationId: string,
    format: 'pdf' | 'pptx' | 'html' | 'images',
    options: {
      includeNotes?: boolean;
      includeAnimations?: boolean;
      quality?: 'low' | 'medium' | 'high';
      range?: { start: number; end: number };
    } = {},
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      const content = presentation.content as any;

      // Apply range filter if specified
      let slides = content.slides;
      if (options.range) {
        slides = slides.slice(options.range.start, options.range.end + 1);
      }

      // Generate export based on format
      let exportResult;
      switch (format) {
        case 'pdf':
          exportResult = await this.exportToPDF(presentation, slides, options);
          break;
        case 'pptx':
          exportResult = await this.exportToPPTX(presentation, slides, options);
          break;
        case 'html':
          exportResult = await this.exportToHTML(presentation, slides, options);
          break;
        case 'images':
          exportResult = await this.exportToImages(presentation, slides, options);
          break;
        default:
          throw new ForbiddenException(`Unsupported export format: ${format}`);
      }

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'EXPORT',
        resource: 'PRESENTATION',
        resourceId: presentationId,
        details: {
          presentationTitle: presentation.title,
          format,
          slideCount: slides.length,
          includeNotes: options.includeNotes,
          quality: options.quality,
          meta: {
            exportSize: exportResult.size,
            exportTime: new Date().toISOString(),
          },
        },
      });

      return exportResult;
    } catch (error) {
      this.logger.error('Error exporting presentation:', error);
      throw error;
    }
  }

  async startSlideshow(
    tenantId: string,
    userId: string,
    presentationId: string,
    options: {
      startSlide?: number;
      autoAdvance?: boolean;
      allowControl?: boolean;
      password?: string;
    } = {},
  ) {
    try {
      const presentation = await this.getPresentation(tenantId, userId, presentationId);
      
      // Generate slideshow session
      const sessionId = `slideshow_${presentationId}_${Date.now()}`;
      const sessionData = {
        presentationId,
        userId,
        tenantId,
        startTime: new Date(),
        currentSlide: options.startSlide || 0,
        settings: {
          autoAdvance: options.autoAdvance || false,
          allowControl: options.allowControl !== false,
          password: options.password,
        },
        status: 'active',
      };

      // Store session in Redis
      await this.redis.setex(`slideshow:${sessionId}`, 3600, JSON.stringify(sessionData));

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'START',
        resource: 'PRESENTATION_SLIDESHOW',
        resourceId: `${presentationId}:${sessionId}`,
        details: {
          presentationTitle: presentation.title,
          startSlide: options.startSlide || 0,
          autoAdvance: options.autoAdvance,
          meta: {
            sessionId,
            hasPassword: !!options.password,
          },
        },
      });

      return {
        sessionId,
        presentation,
        settings: sessionData.settings,
        url: `/slideshow/${sessionId}`,
      };
    } catch (error) {
      this.logger.error('Error starting slideshow:', error);
      throw error;
    }
  }

  private async getPresentation(tenantId: string, userId: string, presentationId: string) {
    // Try cache first
    const cached = await this.redis.get(`presentation:${presentationId}`);
    if (cached) {
      const presentation = JSON.parse(cached);
      if (await this.hasAccess(tenantId, userId, presentation)) {
        return presentation;
      }
    }

    // Fetch from database
    const presentation = await this.prisma.officeDocument.findFirst({
      where: {
        id: presentationId,
        tenantId,
        type: 'PRESENTATION',
        OR: [
          { createdBy: userId },
          { shares: { some: { sharedWith: userId } } },
          { collaborators: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
            sharedWithUser: {
              select: { id: true, firstName: true, lastName: true, avatar: true, email: true },
            },
          },
        },
      },
    });

    if (!presentation) {
      throw new NotFoundException('Presentation not found');
    }

    // Cache for 5 minutes
    await this.redis.setex(`presentation:${presentationId}`, 300, JSON.stringify(presentation));

    return presentation;
  }

  private async hasAccess(tenantId: string, userId: string, presentation: any): Promise<boolean> {
    return presentation.tenantId === tenantId && (
      presentation.createdBy === userId ||
      presentation.shares?.some((share: any) => share.sharedWith === userId) ||
      presentation.collaborators?.some((collab: any) => collab.userId === userId)
    );
  }

  private calculateContentSize(content: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(content ?? {}), 'utf8');
    } catch {
      return 0;
    }
  }

  private generateChecksum(content: any): string {
    try {
      return crypto.createHash('sha1').update(JSON.stringify(content ?? {})).digest('hex');
    } catch {
      return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    }
  }

  private refreshContentMeta(content: any) {
    if (!content) {
      return;
    }

    const slides = Array.isArray(content.slides) ? content.slides : [];
    const totalDuration = slides.reduce((sum: number, slide: any) => sum + (slide?.duration || 0), 0);
    const hasAnimations = slides.some((slide: any) => Array.isArray(slide?.animations) && slide.animations.length > 0);

    content.meta = {
      ...(content.meta || {}),
      slideCount: slides.length,
      totalDuration,
      hasAnimations,
      updatedAt: new Date().toISOString(),
    };
  }

  private async cachePresentation(presentationId: string, presentation: any) {
    await this.redis.setex(`presentation:${presentationId}`, 300, JSON.stringify(presentation));
  }

  private async notifyCollaborators(
    tenantId: string,
    presentationId: string,
    excludeUserId: string,
    notification: any,
  ) {
    try {
      // Get collaborators
      const presentation = await this.prisma.officeDocument.findUnique({
        where: { id: presentationId },
        include: {
          shares: { select: { sharedWith: true } },
        },
      });

      if (!presentation) return;

      const collaboratorIds = [
        presentation.createdBy,
        ...presentation.shares.map(share => share.sharedWith),
      ].filter(id => id !== excludeUserId);

      // Send notifications
      await Promise.all(
        collaboratorIds.map(async (userId) => {
          try {
            await this.notificationService.sendNotification({
              tenantId,
              type: 'IN_APP' as any,
              priority: 'NORMAL' as any,
              subject: `Presentation updated: ${presentation.title}`,
              body: `${notification.type.replace('_', ' ')} in presentation`,
              recipients: [{ userId }],
              data: {
                presentationId,
                presentationTitle: presentation.title,
                notificationType: notification.type,
                ...notification,
              },
              metadata: {
                source: 'presentation',
                presentationId,
                actionType: notification.type,
              },
            });
          } catch (error) {
            this.logger.error(`Failed to notify user ${userId}:`, error);
          }
        })
      );
    } catch (error) {
      this.logger.error('Error notifying collaborators:', error);
    }
  }

  private getDefaultSettings(): PresentationSettings {
    return {
      autoAdvance: false,
      slideTransition: 'fade',
      transitionDuration: 500,
      showSlideNumbers: true,
      showNotes: false,
      allowComments: true,
      allowDownload: true,
    };
  }

  private async getTemplate(_tenantId: string, _templateId: string) {
    // Implementation would fetch presentation template
    return null;
  }

  private applyTemplate(slides: SlideData[], _template: any): SlideData[] {
    // Implementation would apply template styling and layout
    return slides;
  }

  private async exportToPDF(presentation: any, _slides: any[], _options: any) {
    // Implementation would generate PDF using libraries like Puppeteer or PDFKit
    return {
      buffer: Buffer.from('PDF content'),
      filename: `${presentation.title}.pdf`,
      mimeType: 'application/pdf',
      size: 1024,
    };
  }

  private async exportToPPTX(presentation: any, _slides: any[], _options: any) {
    // Implementation would generate PPTX using libraries like PptxGenJS
    return {
      buffer: Buffer.from('PPTX content'),
      filename: `${presentation.title}.pptx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      size: 2048,
    };
  }

  private async exportToHTML(presentation: any, _slides: any[], _options: any) {
    // Implementation would generate HTML slideshow
    return {
      buffer: Buffer.from('<html>HTML slideshow</html>'),
      filename: `${presentation.title}.html`,
      mimeType: 'text/html',
      size: 512,
    };
  }

  private async exportToImages(presentation: any, slides: any[], _options: any) {
    // Implementation would generate images for each slide
    return {
      files: slides.map((slide, index) => ({
        buffer: Buffer.from('Image content'),
        filename: `slide_${index + 1}.png`,
        mimeType: 'image/png',
        size: 256,
      })),
      totalSize: slides.length * 256,
    };
  }
}
