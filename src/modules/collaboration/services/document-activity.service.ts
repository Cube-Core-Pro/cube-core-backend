// path: backend/src/modules/collaboration/services/document-activity.service.ts
// purpose: Document activity tracking and audit service
// dependencies: @nestjs/common, prisma

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface ActivityData {
  documentId: string;
  userId: string;
  tenantId: string;
  action: string;
  details?: any;
}

interface DocumentChangeData {
  documentId: string;
  userId: string;
  tenantId: string;
  changeType: string;
  changes: any;
}

@Injectable()
export class DocumentActivityService {
  private readonly logger = new Logger(DocumentActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logActivity(data: ActivityData) {
    try {
      return this.prisma.officeActivity.create({
        data: {
          documentId: data.documentId,
          userId: data.userId,
          tenantId: data.tenantId,
          action: data.action,
          details: data.details || {},
        },
      });
    } catch (error) {
      this.logger.error('Error logging document activity', error);
      throw error;
    }
  }

  async logDocumentChange(data: DocumentChangeData) {
    try {
      return this.prisma.officeChange.create({
        data: {
          documentId: data.documentId,
          userId: data.userId,
          tenantId: data.tenantId,
          changeType: data.changeType,
          changes: data.changes,
        },
      });
    } catch (error) {
      this.logger.error('Error logging document change', error);
      throw error;
    }
  }

  async getDocumentActivity(
    documentId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      actions?: string[];
      dateRange?: { from: Date; to: Date };
    },
  ) {
    const where = {
      documentId,
      tenantId,
      ...(options?.actions && {
        action: { in: options.actions },
      }),
      ...(options?.dateRange && {
        createdAt: {
          gte: options.dateRange.from,
          lte: options.dateRange.to,
        },
      }),
    };

    return this.prisma.officeActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getDocumentChanges(
    documentId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      changeTypes?: string[];
      dateRange?: { from: Date; to: Date };
    },
  ) {
    const where = {
      documentId,
      tenantId,
      ...(options?.changeTypes && {
        changeType: { in: options.changeTypes },
      }),
      ...(options?.dateRange && {
        timestamp: {
          gte: options.dateRange.from,
          lte: options.dateRange.to,
        },
      }),
    };

    return this.prisma.officeChange.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getUserActivity(
    userId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      actions?: string[];
      dateRange?: { from: Date; to: Date };
    },
  ) {
    const where = {
      userId,
      tenantId,
      ...(options?.actions && {
        action: { in: options.actions },
      }),
      ...(options?.dateRange && {
        createdAt: {
          gte: options.dateRange.from,
          lte: options.dateRange.to,
        },
      }),
    };

    return this.prisma.officeActivity.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  async getActivitySummary(
    tenantId: string,
    dateRange?: { from: Date; to: Date },
  ) {
    const where = {
      tenantId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [
      totalActivities,
      activityByAction,
      activityByUser,
      mostActiveDocuments,
    ] = await Promise.all([
      this.prisma.officeActivity.count({ where }),
      this.prisma.officeActivity.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.officeActivity.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      this.prisma.officeActivity.groupBy({
        by: ['documentId'],
        where,
        _count: true,
        orderBy: { _count: { documentId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalActivities,
      activityByAction,
      activityByUser,
      mostActiveDocuments,
    };
  }

  async getChangeHistory(
    documentId: string,
    tenantId: string,
    limit = 100,
  ) {
    return this.prisma.officeChange.findMany({
      where: { documentId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async cleanupOldActivities(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [activitiesResult, changesResult] = await Promise.all([
      this.prisma.officeActivity.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      }),
      this.prisma.officeChange.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      }),
    ]);

    this.logger.log(
      `Cleaned up ${activitiesResult.count} activities and ${changesResult.count} changes older than ${retentionDays} days`,
    );

    return {
      activitiesDeleted: activitiesResult.count,
      changesDeleted: changesResult.count,
    };
  }
}
