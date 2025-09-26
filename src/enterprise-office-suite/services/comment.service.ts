// path: backend/src/enterprise-office-suite/services/comment.service.ts
// purpose: Document commenting and review system
// dependencies: Prisma, Real-time notifications, Mention system

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addComment(tenantId: string, documentId: string, userId: string, data: {
    content: string;
    position?: any;
    parentId?: string;
  }) {
    try {
      // Check if user has access to document
      await this.checkDocumentAccess(documentId, userId);

      const comment = await this.prisma.officeComment.create({
        data: {
          tenantId,
          documentId,
          userId,
          content: data.content,
          position: data.position,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
        },
      });

      // Emit real-time event
      this.eventEmitter.emit('office.comment.added', {
        documentId,
        comment,
      });

      return comment;
    } catch (error) {
      this.logger.error('Error adding comment:', error);
      throw error;
    }
  }

  async getComments(documentId: string, userId: string) {
    try {
      // Check if user has access to document
      await this.checkDocumentAccess(documentId, userId);

      const comments = await this.prisma.officeComment.findMany({
        where: {
          documentId,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return comments;
    } catch (error) {
      this.logger.error('Error getting comments:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, userId: string, content: string) {
    try {
      const comment = await this.prisma.officeComment.findUnique({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== userId) {
        throw new ForbiddenException('Can only edit your own comments');
      }

      const updatedComment = await this.prisma.officeComment.update({
        where: { id: commentId },
        data: {
          content,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
        },
      });

      return updatedComment;
    } catch (error) {
      this.logger.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string, userId: string) {
    try {
      const comment = await this.prisma.officeComment.findUnique({
        where: { id: commentId },
        include: {
          document: {
            select: { createdBy: true },
          },
        },
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      // Can delete if owner of comment or document owner
      if (comment.userId !== userId && comment.document.createdBy !== userId) {
        throw new ForbiddenException('Insufficient permissions');
      }

      await this.prisma.officeComment.delete({
        where: { id: commentId },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  private async checkDocumentAccess(documentId: string, userId: string) {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        OR: [
          { createdBy: userId },
          { shares: { some: { sharedWith: userId } } },
        ],
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or access denied');
    }

    return document;
  }
}