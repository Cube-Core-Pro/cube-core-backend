// path: backend/src/crm/services/activities.service.ts
// purpose: Service for managing CRM activities using existing crm_activities model
// dependencies: PrismaService, RedisService

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

export interface CreateActivityDto {
  contactId: string;
  type: string;
  subject: string;
  description?: string;
  status?: string;
  priority?: string;
  scheduledAt?: Date;
  duration?: number;
  outcome?: string;
  nextAction?: string;
}

export interface UpdateActivityDto {
  type?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  duration?: number;
  outcome?: string;
  nextAction?: string;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createActivityDto: CreateActivityDto, userId: string, tenantId: string) {
    try {
      // Verify contact exists
      const contact = await this.prisma.crm_contacts.findFirst({
        where: { id: createActivityDto.contactId, tenantId },
      });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      const activity = await this.prisma.crm_activities.create({
        data: {
          id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          contactId: createActivityDto.contactId,
          userId,
          type: createActivityDto.type,
          subject: createActivityDto.subject,
          description: createActivityDto.description,
          status: createActivityDto.status || 'PENDING',
          priority: createActivityDto.priority || 'MEDIUM',
          scheduledAt: createActivityDto.scheduledAt,
          duration: createActivityDto.duration,
          outcome: createActivityDto.outcome,
          nextAction: createActivityDto.nextAction,
          updatedAt: new Date(),
        },
        include: {
          crm_contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update contact's last contact date
      await this.prisma.crm_contacts.update({
        where: { id: createActivityDto.contactId },
        data: { 
          lastContactDate: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Activity created: ${activity.id}`);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to create activity: ${error.message}`);
      throw error;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10, contactId?: string, type?: string, status?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = { tenantId };
      
      if (contactId) {
        where.contactId = contactId;
      }

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      const [activities, total] = await Promise.all([
        this.prisma.crm_activities.findMany({
          where,
          skip,
          take: limit,
          include: {
            crm_contacts: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: true,
              },
            },
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.crm_activities.count({ where }),
      ]);

      return {
        data: activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch activities: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    try {
      const activity = await this.prisma.crm_activities.findFirst({
        where: { id, tenantId },
        include: {
          crm_contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true,
              position: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      return activity;
    } catch (error) {
      this.logger.error(`Failed to fetch activity: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, tenantId: string) {
    try {
      await this.findOne(id, tenantId);

      const activity = await this.prisma.crm_activities.update({
        where: { id },
        data: {
          ...updateActivityDto,
          updatedAt: new Date(),
        },
        include: {
          crm_contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Activity updated: ${activity.id}`);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to update activity: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string, tenantId: string) {
    try {
      await this.findOne(id, tenantId);

      await this.prisma.crm_activities.delete({
        where: { id },
      });

      this.logger.log(`Activity deleted: ${id}`);
      return { message: 'Activity deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete activity: ${error.message}`);
      throw error;
    }
  }

  async completeActivity(id: string, outcome?: string, nextAction?: string, tenantId?: string) {
    try {
      const activity = await this.update(id, {
        status: 'COMPLETED',
        completedAt: new Date(),
        outcome,
        nextAction,
      }, tenantId);

      this.logger.log(`Activity completed: ${id}`);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to complete activity: ${error.message}`);
      throw error;
    }
  }

  async getUpcomingActivities(tenantId: string, userId?: string, limit = 10) {
    try {
      const where: any = {
        tenantId,
        status: { not: 'COMPLETED' },
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      };

      if (userId) {
        where.userId = userId;
      }

      const activities = await this.prisma.crm_activities.findMany({
        where,
        take: limit,
        include: {
          crm_contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return activities;
    } catch (error) {
      this.logger.error(`Failed to get upcoming activities: ${error.message}`);
      throw error;
    }
  }

  async getOverdueActivities(tenantId: string, userId?: string, limit = 10) {
    try {
      const where: any = {
        tenantId,
        status: { not: 'COMPLETED' },
        scheduledAt: {
          lt: new Date(),
        },
      };

      if (userId) {
        where.userId = userId;
      }

      const activities = await this.prisma.crm_activities.findMany({
        where,
        take: limit,
        include: {
          crm_contacts: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              company: true,
            },
          },
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return activities;
    } catch (error) {
      this.logger.error(`Failed to get overdue activities: ${error.message}`);
      throw error;
    }
  }

  async getActivitiesByType(tenantId: string, userId?: string) {
    try {
      const where: any = { tenantId };
      
      if (userId) {
        where.userId = userId;
      }

      const activities = await this.prisma.crm_activities.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      });

      return activities.map(activity => ({
        type: activity.type,
        count: activity._count.type,
      }));
    } catch (error) {
      this.logger.error(`Failed to get activities by type: ${error.message}`);
      throw error;
    }
  }
}