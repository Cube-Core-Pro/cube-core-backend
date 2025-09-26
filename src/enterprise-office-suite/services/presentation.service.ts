// path: backend/src/enterprise-office-suite/services/presentation.service.ts
// purpose: Presentation builder with slides, animations, and multimedia
// dependencies: Prisma, Redis, EventEmitter, Media Processing, Template Engine

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createPresentation(tenantId: string, userId: string, data: {
    title: string;
    folderId?: string;
    content?: any;
    templateId?: string;
  }) {
    try {
      const defaultContent = {
        slides: [
          {
            id: 'slide1',
            title: 'Title Slide',
            layout: 'title',
            elements: [
              {
                id: 'title',
                type: 'text',
                content: data.title,
                position: { x: 50, y: 200 },
                size: { width: 700, height: 100 },
                style: {
                  fontSize: 44,
                  fontFamily: 'Arial',
                  fontWeight: 'bold',
                  color: '#000000',
                  textAlign: 'center',
                },
              },
              {
                id: 'subtitle',
                type: 'text',
                content: 'Subtitle',
                position: { x: 50, y: 320 },
                size: { width: 700, height: 60 },
                style: {
                  fontSize: 24,
                  fontFamily: 'Arial',
                  color: '#666666',
                  textAlign: 'center',
                },
              },
            ],
            background: {
              type: 'solid',
              color: '#ffffff',
            },
            animations: [],
            transitions: {
              type: 'fade',
              duration: 500,
            },
            notes: '',
          },
        ],
        activeSlide: 'slide1',
        theme: {
          name: 'Default',
          colors: {
            primary: '#1f4e79',
            secondary: '#70ad47',
            accent: '#ffc000',
            background: '#ffffff',
            text: '#000000',
          },
          fonts: {
            heading: 'Arial',
            body: 'Arial',
          },
          layouts: {},
        },
        settings: {
          slideSize: { width: 800, height: 600 },
          aspectRatio: '4:3',
          defaultTransition: 'fade',
        },
        masterSlides: [],
      };

      const presentation = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          title: data.title,
          type: 'PRESENTATION',
          format: 'CPRES',
          content: data.content || defaultContent,
          folderId: data.folderId,
          createdBy: userId,
          size: JSON.stringify(data.content || defaultContent).length,
          checksum: 'temp-checksum', // TODO: Calculate actual checksum
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
        },
      });

      return presentation;
    } catch (error) {
      this.logger.error('Error creating presentation:', error);
      throw error;
    }
  }

  async addSlide(documentId: string, userId: string, data: {
    title?: string;
    layout?: string;
    position?: number;
    templateId?: string;
  }) {
    try {
      const content = await this.getContent(documentId);
      
      const slideId = `slide_${Date.now()}`;
      const position = data.position ?? content.slides.length;

      const newSlide = {
        id: slideId,
        title: data.title || `Slide ${content.slides.length + 1}`,
        layout: data.layout || 'blank',
        elements: this.getLayoutElements(data.layout || 'blank'),
        background: {
          type: 'solid',
          color: content.theme.colors.background,
        },
        animations: [],
        transitions: {
          type: content.settings.defaultTransition,
          duration: 500,
        },
        notes: '',
        createdAt: new Date().toISOString(),
      };

      // Insert slide at specified position
      content.slides.splice(position, 0, newSlide);
      content.activeSlide = slideId;

      // Save updated content
      await this.updateContent(documentId, userId, content);

      // Emit real-time update
      this.eventEmitter.emit('presentation.slide.added', {
        documentId,
        userId,
        slide: newSlide,
        position,
      });

      return { success: true, slide: newSlide };
    } catch (error) {
      this.logger.error('Error adding slide:', error);
      throw error;
    }
  }

  async updateSlide(documentId: string, userId: string, slideId: string, updates: {
    title?: string;
    layout?: string;
    background?: any;
    transitions?: any;
    notes?: string;
  }) {
    try {
      const content = await this.getContent(documentId);
      const slideIndex = content.slides.findIndex((s: any) => s.id === slideId);
      
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      const slide = content.slides[slideIndex];

      // Update slide properties
      if (updates.title !== undefined) slide.title = updates.title;
      if (updates.layout !== undefined) {
        slide.layout = updates.layout;
        // Update elements based on new layout
        slide.elements = this.getLayoutElements(updates.layout);
      }
      if (updates.background !== undefined) slide.background = updates.background;
      if (updates.transitions !== undefined) slide.transitions = updates.transitions;
      if (updates.notes !== undefined) slide.notes = updates.notes;

      slide.updatedAt = new Date().toISOString();

      // Save updated content
      await this.updateContent(documentId, userId, content);

      // Emit real-time update
      this.eventEmitter.emit('presentation.slide.updated', {
        documentId,
        userId,
        slideId,
        updates,
      });

      return { success: true, slide };
    } catch (error) {
      this.logger.error('Error updating slide:', error);
      throw error;
    }
  }

  async deleteSlide(documentId: string, userId: string, slideId: string) {
    try {
      const content = await this.getContent(documentId);
      
      if (content.slides.length <= 1) {
        throw new BadRequestException('Cannot delete the last slide');
      }

      const slideIndex = content.slides.findIndex((s: any) => s.id === slideId);
      
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      // Remove slide
      content.slides.splice(slideIndex, 1);

      // Update active slide if necessary
      if (content.activeSlide === slideId) {
        const newIndex = Math.min(slideIndex, content.slides.length - 1);
        content.activeSlide = content.slides[newIndex].id;
      }

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting slide:', error);
      throw error;
    }
  }

  async duplicateSlide(documentId: string, userId: string, slideId: string) {
    try {
      const content = await this.getContent(documentId);
      const slideIndex = content.slides.findIndex((s: any) => s.id === slideId);
      
      if (slideIndex === -1) {
        throw new NotFoundException('Slide not found');
      }

      const originalSlide = content.slides[slideIndex];
      const newSlideId = `slide_${Date.now()}`;
      
      const duplicatedSlide = {
        ...JSON.parse(JSON.stringify(originalSlide)),
        id: newSlideId,
        title: `${originalSlide.title} (Copy)`,
        createdAt: new Date().toISOString(),
      };

      // Update element IDs
      duplicatedSlide.elements = duplicatedSlide.elements.map((element: any) => ({
        ...element,
        id: `${element.id}_${Date.now()}`,
      }));

      // Insert after original slide
      content.slides.splice(slideIndex + 1, 0, duplicatedSlide);
      content.activeSlide = newSlideId;

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true, slide: duplicatedSlide };
    } catch (error) {
      this.logger.error('Error duplicating slide:', error);
      throw error;
    }
  }

  async reorderSlides(documentId: string, userId: string, slideIds: string[]) {
    try {
      const content = await this.getContent(documentId);
      
      // Validate all slide IDs exist
      const existingIds = content.slides.map((s: any) => s.id);
      const missingIds = slideIds.filter(id => !existingIds.includes(id));
      
      if (missingIds.length > 0) {
        throw new BadRequestException(`Slides not found: ${missingIds.join(', ')}`);
      }

      // Reorder slides
      const reorderedSlides = slideIds.map(id => 
        content.slides.find((s: any) => s.id === id)
      );

      content.slides = reorderedSlides;

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error reordering slides:', error);
      throw error;
    }
  }

  async addElement(documentId: string, userId: string, slideId: string, element: {
    type: 'text' | 'image' | 'shape' | 'chart' | 'video' | 'audio';
    content?: any;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style?: any;
    properties?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      const slide = content.slides.find((s: any) => s.id === slideId);
      
      if (!slide) {
        throw new NotFoundException('Slide not found');
      }

      const elementId = `element_${Date.now()}`;
      const newElement = {
        id: elementId,
        type: element.type,
        content: element.content || this.getDefaultContent(element.type),
        position: element.position,
        size: element.size,
        style: element.style || this.getDefaultStyle(element.type),
        properties: element.properties || {},
        animations: [],
        createdAt: new Date().toISOString(),
      };

      slide.elements.push(newElement);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      // Emit real-time update
      this.eventEmitter.emit('presentation.element.added', {
        documentId,
        userId,
        slideId,
        element: newElement,
      });

      return { success: true, element: newElement };
    } catch (error) {
      this.logger.error('Error adding element:', error);
      throw error;
    }
  }

  async updateElement(documentId: string, userId: string, slideId: string, elementId: string, updates: {
    content?: any;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    style?: any;
    properties?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      const slide = content.slides.find((s: any) => s.id === slideId);
      
      if (!slide) {
        throw new NotFoundException('Slide not found');
      }

      const element = slide.elements.find((e: any) => e.id === elementId);
      
      if (!element) {
        throw new NotFoundException('Element not found');
      }

      // Update element properties
      if (updates.content !== undefined) element.content = updates.content;
      if (updates.position !== undefined) element.position = updates.position;
      if (updates.size !== undefined) element.size = updates.size;
      if (updates.style !== undefined) element.style = { ...element.style, ...updates.style };
      if (updates.properties !== undefined) element.properties = { ...element.properties, ...updates.properties };

      element.updatedAt = new Date().toISOString();

      // Save updated content
      await this.updateContent(documentId, userId, content);

      // Emit real-time update
      this.eventEmitter.emit('presentation.element.updated', {
        documentId,
        userId,
        slideId,
        elementId,
        updates,
      });

      return { success: true, element };
    } catch (error) {
      this.logger.error('Error updating element:', error);
      throw error;
    }
  }

  async deleteElement(documentId: string, userId: string, slideId: string, elementId: string) {
    try {
      const content = await this.getContent(documentId);
      const slide = content.slides.find((s: any) => s.id === slideId);
      
      if (!slide) {
        throw new NotFoundException('Slide not found');
      }

      const elementIndex = slide.elements.findIndex((e: any) => e.id === elementId);
      
      if (elementIndex === -1) {
        throw new NotFoundException('Element not found');
      }

      // Remove element
      slide.elements.splice(elementIndex, 1);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting element:', error);
      throw error;
    }
  }

  async addAnimation(documentId: string, userId: string, slideId: string, elementId: string, animation: {
    type: 'entrance' | 'emphasis' | 'exit' | 'motion';
    effect: string;
    duration: number;
    delay?: number;
    trigger?: 'click' | 'auto' | 'with_previous' | 'after_previous';
    options?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      const slide = content.slides.find((s: any) => s.id === slideId);
      
      if (!slide) {
        throw new NotFoundException('Slide not found');
      }

      const element = slide.elements.find((e: any) => e.id === elementId);
      
      if (!element) {
        throw new NotFoundException('Element not found');
      }

      const animationId = `animation_${Date.now()}`;
      const newAnimation = {
        id: animationId,
        type: animation.type,
        effect: animation.effect,
        duration: animation.duration,
        delay: animation.delay || 0,
        trigger: animation.trigger || 'click',
        options: animation.options || {},
        createdAt: new Date().toISOString(),
      };

      element.animations.push(newAnimation);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true, animation: newAnimation };
    } catch (error) {
      this.logger.error('Error adding animation:', error);
      throw error;
    }
  }

  async updateTheme(documentId: string, userId: string, theme: {
    name?: string;
    colors?: any;
    fonts?: any;
    layouts?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      
      // Update theme
      content.theme = { ...content.theme, ...theme };

      // Apply theme to existing slides if needed
      content.slides.forEach((slide: any) => {
        if (theme.colors?.background && slide.background.type === 'solid') {
          slide.background.color = theme.colors.background;
        }
      });

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true, theme: content.theme };
    } catch (error) {
      this.logger.error('Error updating theme:', error);
      throw error;
    }
  }

  async exportToPDF(documentId: string, _userId: string) {
    try {
      const content = await this.getContent(documentId);
      
      // Generate PDF from slides
      // This would integrate with a PDF generation library
      const pdfBuffer = await this.generatePDF(content);
      
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `presentation_${documentId}.pdf`,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      this.logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToPPTX(documentId: string, _userId: string) {
    try {
      const content = await this.getContent(documentId);
      
      // Generate PPTX from slides
      // This would integrate with a PowerPoint generation library
      const pptxBuffer = await this.generatePPTX(content);
      
      return {
        success: true,
        buffer: pptxBuffer,
        filename: `presentation_${documentId}.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    } catch (error) {
      this.logger.error('Error exporting to PPTX:', error);
      throw error;
    }
  }

  async startSlideshow(documentId: string, userId: string) {
    try {
      const content = await this.getContent(documentId);
      
      const sessionId = `slideshow_${Date.now()}`;
      const slideshowSession = {
        id: sessionId,
        documentId,
        userId,
        currentSlide: content.activeSlide,
        startedAt: new Date().toISOString(),
        isActive: true,
      };

      // Store session in Redis
      await this.redis.setex(
        `slideshow:${sessionId}`,
        3600, // 1 hour
        JSON.stringify(slideshowSession)
      );

      // Emit event for real-time updates
      this.eventEmitter.emit('presentation.slideshow.started', {
        sessionId,
        documentId,
        userId,
      });

      return { success: true, sessionId, session: slideshowSession };
    } catch (error) {
      this.logger.error('Error starting slideshow:', error);
      throw error;
    }
  }

  async navigateSlideshow(sessionId: string, slideId: string) {
    try {
      const session = await this.redis.get(`slideshow:${sessionId}`);
      
      if (!session) {
        throw new NotFoundException('Slideshow session not found');
      }

      const slideshowSession = JSON.parse(session);
      slideshowSession.currentSlide = slideId;
      slideshowSession.updatedAt = new Date().toISOString();

      // Update session
      await this.redis.setex(
        `slideshow:${sessionId}`,
        3600,
        JSON.stringify(slideshowSession)
      );

      // Emit navigation event
      this.eventEmitter.emit('presentation.slideshow.navigate', {
        sessionId,
        slideId,
        userId: slideshowSession.userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error navigating slideshow:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getContent(documentId: string) {
    const cached = await this.redis.get(`presentation:${documentId}:content`);
    if (cached) {
      return JSON.parse(cached);
    }

    const document = await this.prisma.officeDocument.findUnique({
      where: { id: documentId },
      select: { content: true },
    });

    if (!document) {
      throw new NotFoundException('Presentation not found');
    }

    await this.redis.setex(
      `presentation:${documentId}:content`,
      300,
      JSON.stringify(document.content)
    );

    return document.content;
  }

  private async updateContent(documentId: string, userId: string, content: any) {
    await this.prisma.officeDocument.update({
      where: { id: documentId },
      data: {
        content,
        size: JSON.stringify(content).length,
        updatedAt: new Date(),
      },
    });

    await this.redis.setex(
      `presentation:${documentId}:content`,
      300,
      JSON.stringify(content)
    );
  }

  private getLayoutElements(layout: string): any[] {
    const layouts: Record<string, any[]> = {
      title: [
        {
          id: 'title',
          type: 'text',
          content: 'Click to add title',
          position: { x: 50, y: 200 },
          size: { width: 700, height: 100 },
          style: { fontSize: 44, fontWeight: 'bold', textAlign: 'center' },
        },
        {
          id: 'subtitle',
          type: 'text',
          content: 'Click to add subtitle',
          position: { x: 50, y: 320 },
          size: { width: 700, height: 60 },
          style: { fontSize: 24, textAlign: 'center' },
        },
      ],
      content: [
        {
          id: 'title',
          type: 'text',
          content: 'Click to add title',
          position: { x: 50, y: 50 },
          size: { width: 700, height: 80 },
          style: { fontSize: 36, fontWeight: 'bold' },
        },
        {
          id: 'content',
          type: 'text',
          content: 'Click to add content',
          position: { x: 50, y: 150 },
          size: { width: 700, height: 400 },
          style: { fontSize: 18 },
        },
      ],
      'two-column': [
        {
          id: 'title',
          type: 'text',
          content: 'Click to add title',
          position: { x: 50, y: 50 },
          size: { width: 700, height: 80 },
          style: { fontSize: 36, fontWeight: 'bold' },
        },
        {
          id: 'left-content',
          type: 'text',
          content: 'Click to add content',
          position: { x: 50, y: 150 },
          size: { width: 325, height: 400 },
          style: { fontSize: 18 },
        },
        {
          id: 'right-content',
          type: 'text',
          content: 'Click to add content',
          position: { x: 425, y: 150 },
          size: { width: 325, height: 400 },
          style: { fontSize: 18 },
        },
      ],
      blank: [],
    };

    return layouts[layout] || layouts.blank;
  }

  private getDefaultContent(type: string): any {
    const defaults: Record<string, any> = {
      text: 'Click to add text',
      image: { src: '', alt: 'Image' },
      shape: { type: 'rectangle', fill: '#cccccc' },
      chart: { type: 'bar', data: [] },
      video: { src: '', poster: '' },
      audio: { src: '' },
    };

    return defaults[type] || '';
  }

  private getDefaultStyle(type: string): any {
    const defaults: Record<string, any> = {
      text: {
        fontSize: 18,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left',
      },
      image: {
        border: 'none',
        borderRadius: 0,
      },
      shape: {
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 1,
      },
      chart: {
        backgroundColor: '#ffffff',
      },
      video: {
        controls: true,
        autoplay: false,
      },
      audio: {
        controls: true,
        autoplay: false,
      },
    };

    return defaults[type] || {};
  }

  private async generatePDF(_content: any): Promise<Buffer> {
    // PDF generation implementation
    // This would use a library like puppeteer or pdfkit
    return Buffer.from('PDF content placeholder');
  }

  private async generatePPTX(_content: any): Promise<Buffer> {
    // PPTX generation implementation
    // This would use a library like officegen or pptxgenjs
    return Buffer.from('PPTX content placeholder');
  }
}