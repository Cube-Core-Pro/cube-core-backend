// path: backend/src/enterprise-office-suite/services/search.service.ts
// purpose: Advanced search service with full-text search and filters
// dependencies: Prisma, Elasticsearch (optional), Full-text search

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async searchDocuments(tenantId: string, userId: string, query: string, filters?: {
    type?: string;
    folderId?: string;
    createdBy?: string;
    dateRange?: { from: Date; to: Date };
    tags?: string[];
    collaborators?: string[];
  }) {
    try {
      // Build search where clause
      const where: any = {
        tenantId,
        isDeleted: false,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
        ],
      };

      // Add search conditions
      if (query) {
        where.AND = [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              // Full-text search in content would require additional setup
            ],
          },
        ];
      }

      // Apply filters
      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.folderId) {
        where.folderId = filters.folderId;
      }

      if (filters?.createdBy) {
        where.createdBy = filters.createdBy;
      }

      if (filters?.dateRange) {
        where.createdAt = {
          gte: filters.dateRange.from,
          lte: filters.dateRange.to,
        };
      }

      if (filters?.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters?.collaborators && filters.collaborators.length > 0) {
        where.collaborators = {
          some: {
            userId: { in: filters.collaborators },
          },
        };
      }

      const documents = await this.prisma.officeDocument.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { collaborators: true, comments: true, versions: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      return documents;
    } catch (error) {
      this.logger.error('Error searching documents:', error);
      throw error;
    }
  }

  async getSearchSuggestions(tenantId: string, userId: string, query: string) {
    try {
      const suggestions = await this.prisma.officeDocument.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
          ],
          title: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, title: true, type: true },
        take: 10,
      });

      return suggestions;
    } catch (error) {
      this.logger.error('Error getting search suggestions:', error);
      throw error;
    }
  }
}