// path: backend/src/modules/collaboration/services/collaboration-session.service.ts
// purpose: Collaboration session management service
// dependencies: @nestjs/common, prisma

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface CreateSessionData {
  documentId: string;
  userId: string;
  tenantId: string;
  expiresAt?: Date;
}

interface UpdateSessionData {
  isActive?: boolean;
  lastActivity?: Date;
  cursor?: any;
  selection?: any;
  leftAt?: Date;
}

@Injectable()
export class CollaborationSessionService {
  private readonly logger = new Logger(CollaborationSessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(data: CreateSessionData) {
    try {
      // Check if session already exists
      const existingSession = await this.prisma.collaborationSession.findUnique({
        where: {
          documentId_userId: {
            documentId: data.documentId,
            userId: data.userId,
          },
        },
      });

      if (existingSession) {
        // Update existing session
        return this.prisma.collaborationSession.update({
          where: { id: existingSession.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
            lastActivity: new Date(),
            expiresAt: data.expiresAt,
          },
        });
      }

      // Create new session
      return this.prisma.collaborationSession.create({
        data: {
          documentId: data.documentId,
          userId: data.userId,
          tenantId: data.tenantId,
          isActive: true,
          joinedAt: new Date(),
          lastActivity: new Date(),
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      this.logger.error('Error creating collaboration session', error);
      throw error;
    }
  }

  async updateSession(
    documentId: string,
    userId: string,
    data: UpdateSessionData,
  ) {
    try {
      return this.prisma.collaborationSession.updateMany({
        where: {
          documentId,
          userId,
        },
        data,
      });
    } catch (error) {
      this.logger.error('Error updating collaboration session', error);
      throw error;
    }
  }

  async endSession(documentId: string, userId: string) {
    try {
      return this.prisma.collaborationSession.updateMany({
        where: {
          documentId,
          userId,
        },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error ending collaboration session', error);
      throw error;
    }
  }

  async getActiveSessionsForDocument(documentId: string) {
    return this.prisma.collaborationSession.findMany({
      where: {
        documentId,
        isActive: true,
        lastActivity: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
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
    });
  }

  async getSessionHistory(documentId: string, limit = 50) {
    return this.prisma.collaborationSession.findMany({
      where: { documentId },
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
      orderBy: { joinedAt: 'desc' },
      take: limit,
    });
  }

  async getUserActiveSessions(userId: string) {
    return this.prisma.collaborationSession.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.collaborationSession.updateMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            lastActivity: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
        ],
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired sessions`);
    return result;
  }

  async getSessionMetrics(tenantId: string, dateRange?: { from: Date; to: Date }) {
    const where = {
      tenantId,
      ...(dateRange && {
        joinedAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [
      totalSessions,
      activeSessions,
      sessionsWithDuration,
      uniqueUsers,
    ] = await Promise.all([
      this.prisma.collaborationSession.count({ where }),
      this.prisma.collaborationSession.count({
        where: { ...where, isActive: true },
      }),
      this.prisma.collaborationSession.findMany({
        where: {
          ...where,
          leftAt: { not: null },
        },
        select: {
          joinedAt: true,
          leftAt: true,
        },
      }),
      this.prisma.collaborationSession.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
    ]);

    // Calculate average duration manually
    const averageDuration = sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, session) => {
          const duration = session.leftAt!.getTime() - session.joinedAt.getTime();
          return sum + duration;
        }, 0) / sessionsWithDuration.length
      : 0;

    return {
      totalSessions,
      activeSessions,
      averageDuration: Math.round(averageDuration / 1000), // Convert to seconds
      uniqueUsers: uniqueUsers.length,
    };
  }
}