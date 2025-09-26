// path: backend/src/crm/services/opportunities.service.ts
// purpose: Service for managing CRM opportunities using existing crm_opportunities model
// dependencies: PrismaService, RedisService

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { OpportunityStats } from "../interfaces/stats.interface";

export interface CreateOpportunityDto {
  contactId: string;
  name: string;
  description?: string;
  value: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: Date;
  source?: string;
  competitorInfo?: string;
  assignedUserId?: string;
}

export interface UpdateOpportunityDto {
  name?: string;
  description?: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  source?: string;
  competitorInfo?: string;
  lossReason?: string;
  assignedUserId?: string;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(createOpportunityDto: CreateOpportunityDto, tenantId: string) {
    try {
      // Verify contact exists
      const contact = await this.prisma.crm_contacts.findFirst({
        where: { id: createOpportunityDto.contactId, tenantId },
      });

      if (!contact) {
        throw new NotFoundException('Contact not found');
      }

      const opportunity = await this.prisma.crm_opportunities.create({
        data: {
          id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          contactId: createOpportunityDto.contactId,
          name: createOpportunityDto.name,
          description: createOpportunityDto.description,
          value: createOpportunityDto.value,
          currency: createOpportunityDto.currency || 'USD',
          stage: createOpportunityDto.stage || 'PROSPECTING',
          probability: createOpportunityDto.probability || 10,
          expectedCloseDate: createOpportunityDto.expectedCloseDate,
          source: createOpportunityDto.source,
          competitorInfo: createOpportunityDto.competitorInfo,
          assignedUserId: createOpportunityDto.assignedUserId,
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

      // Clear cache
      await this.redis.del(`opportunities:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Opportunity created: ${opportunity.id}`);
      return opportunity;
    } catch (error) {
      this.logger.error(`Failed to create opportunity: ${error.message}`);
      throw error;
    }
  }

  async findAll(tenantId: string, page = 1, limit = 10, search?: string, stage?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = { tenantId };
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { crm_contacts: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ]
          }},
        ];
      }

      if (stage) {
        where.stage = stage;
      }

      const [opportunities, total] = await Promise.all([
        this.prisma.crm_opportunities.findMany({
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
        this.prisma.crm_opportunities.count({ where }),
      ]);

      return {
        data: opportunities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch opportunities: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    try {
      const opportunity = await this.prisma.crm_opportunities.findFirst({
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

      if (!opportunity) {
        throw new NotFoundException('Opportunity not found');
      }

      return opportunity;
    } catch (error) {
      this.logger.error(`Failed to fetch opportunity: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateOpportunityDto: UpdateOpportunityDto, tenantId: string) {
    try {
      await this.findOne(id, tenantId);

      const opportunity = await this.prisma.crm_opportunities.update({
        where: { id },
        data: {
          ...updateOpportunityDto,
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

      // Clear cache
      await this.redis.del(`opportunities:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Opportunity updated: ${opportunity.id}`);
      return opportunity;
    } catch (error) {
      this.logger.error(`Failed to update opportunity: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string, tenantId: string) {
    try {
      await this.findOne(id, tenantId);

      await this.prisma.crm_opportunities.delete({
        where: { id },
      });

      // Clear cache
      await this.redis.del(`opportunities:stats:${tenantId}`);
      await this.redis.del(`crm:dashboard:stats:${tenantId}`);

      this.logger.log(`Opportunity deleted: ${id}`);
      return { message: 'Opportunity deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete opportunity: ${error.message}`);
      throw error;
    }
  }

  async getOpportunityStats(tenantId: string): Promise<OpportunityStats> {
    try {
      const cacheKey = `opportunities:stats:${tenantId}`;
      const cached = await this.redis.getJson(cacheKey);
      
      if (cached) {
        return cached as OpportunityStats;
      }

      const [
        totalOpportunities,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        totalValueResult,
      ] = await Promise.all([
        this.prisma.crm_opportunities.count({ where: { tenantId } }),
        this.prisma.crm_opportunities.count({ 
          where: { 
            tenantId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
          } 
        }),
        this.prisma.crm_opportunities.count({ 
          where: { 
            tenantId,
            stage: 'CLOSED_WON'
          } 
        }),
        this.prisma.crm_opportunities.count({ 
          where: { 
            tenantId,
            stage: 'CLOSED_LOST'
          } 
        }),
        this.prisma.crm_opportunities.aggregate({
          where: { tenantId },
          _sum: { value: true },
        }),
      ]);

      const totalValue = Number(totalValueResult._sum.value) || 0;
      const averageValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
      const winRate = (wonOpportunities + lostOpportunities) > 0 
        ? Math.round((wonOpportunities / (wonOpportunities + lostOpportunities)) * 100) 
        : 0;

      const stats: OpportunityStats = {
        total: totalOpportunities,
        open: openOpportunities,
        won: wonOpportunities,
        lost: lostOpportunities,
        totalValue,
        averageValue,
        winRate,
      };

      // Cache for 5 minutes
      await this.redis.setJson(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get opportunity stats: ${error.message}`);
      throw error;
    }
  }

  async getOpportunitiesByStage(tenantId: string) {
    try {
      const opportunities = await this.prisma.crm_opportunities.groupBy({
        by: ['stage'],
        where: { tenantId },
        _count: { stage: true },
        _sum: { value: true },
      });

      return opportunities.map(opp => ({
        stage: opp.stage,
        count: opp._count.stage,
        value: Number(opp._sum.value) || 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get opportunities by stage: ${error.message}`);
      throw error;
    }
  }

  async moveToStage(id: string, stage: string, tenantId: string) {
    try {
      const opportunity = await this.update(id, { 
        stage,
        actualCloseDate: ['CLOSED_WON', 'CLOSED_LOST'].includes(stage) ? new Date() : undefined
      }, tenantId);

      this.logger.log(`Opportunity ${id} moved to stage: ${stage}`);
      return opportunity;
    } catch (error) {
      this.logger.error(`Failed to move opportunity to stage: ${error.message}`);
      throw error;
    }
  }
}