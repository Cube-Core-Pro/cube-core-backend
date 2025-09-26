// path: backend/src/crm/crm.service.ts
// purpose: Main CRM service for dashboard stats and analytics
// dependencies: ContactsService, OpportunitiesService, ActivitiesService, RedisService

import { Injectable, Logger } from "@nestjs/common";
import { ContactsService } from "./services/contacts.service";
import { OpportunitiesService } from "./services/opportunities.service";
import { ActivitiesService } from "./services/activities.service";
import { RedisService } from "../redis/redis.service";
import { CrmDashboardStats, SalesPipeline, PerformanceMetrics } from "./interfaces/stats.interface";
import { Fortune500CrmConfig } from '../types/fortune500-types';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private contactsService: ContactsService,
    private opportunitiesService: OpportunitiesService,
    private activitiesService: ActivitiesService,
    private redis: RedisService,
  ) {}

  async getDashboardStats(tenantId: string): Promise<CrmDashboardStats> {
    try {
      const cacheKey = `crm:dashboard:stats:${tenantId}`;
      const cached = await this.redis.getJson(cacheKey);
      
      if (cached) {
        return cached as CrmDashboardStats;
      }

      const [
        contactStats,
        opportunityStats,
      ] = await Promise.all([
        this.contactsService.getContactStats(tenantId),
        this.opportunitiesService.getOpportunityStats(tenantId),
      ]);

      // Create placeholder lead stats based on contacts
      const leadStats = {
        total: contactStats.total,
        new: Math.floor(contactStats.total * 0.4), // 40% new leads
        qualified: Math.floor(contactStats.total * 0.3), // 30% qualified
        closedWon: Math.floor(contactStats.total * 0.2), // 20% closed won
        closedLost: Math.floor(contactStats.total * 0.1), // 10% closed lost
        newThisMonth: contactStats.newThisMonth,
        totalEstimatedValue: opportunityStats.totalValue,
        conversionRate: opportunityStats.winRate,
        qualificationRate: 75, // Default qualification rate
      };

      const stats: CrmDashboardStats = {
        customers: {
          total: contactStats.active,
          active: contactStats.active,
          prospects: contactStats.total - contactStats.active,
          business: Math.floor(contactStats.total * 0.3),
          individual: Math.floor(contactStats.total * 0.7),
          newThisMonth: contactStats.newThisMonth,
          activePercentage: contactStats.total > 0 ? Math.round((contactStats.active / contactStats.total) * 100) : 0,
          conversionRate: leadStats.conversionRate,
        },
        leads: leadStats,
        opportunities: opportunityStats,
        contacts: contactStats,
        summary: {
          totalCustomers: contactStats.active,
          totalLeads: leadStats.total,
          totalOpportunities: opportunityStats.total,
          totalContacts: contactStats.total,
          conversionRate: leadStats.conversionRate,
          customerGrowth: contactStats.newThisMonth,
          leadGrowth: leadStats.newThisMonth,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache for 10 minutes
      await this.redis.setJson(cacheKey, stats, 600);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get dashboard stats: ${error.message}`);
      throw error;
    }
  }

  async getSalesPipeline(tenantId: string): Promise<SalesPipeline> {
    try {
      const cacheKey = `crm:sales-pipeline:${tenantId}`;
      const cached = await this.redis.getJson(cacheKey);
      
      if (cached) {
        return cached as SalesPipeline;
      }

      const opportunitiesByStage = await this.opportunitiesService.getOpportunitiesByStage(tenantId);
      const opportunityStats = await this.opportunitiesService.getOpportunityStats(tenantId);

      const pipeline: SalesPipeline = {
        stages: opportunitiesByStage.map(stage => ({
          name: this.formatStageName(stage.stage),
          count: stage.count,
          value: stage.value,
        })),
        totalValue: opportunityStats.totalValue,
        conversionRate: opportunityStats.winRate,
      };

      // Cache for 15 minutes
      await this.redis.setJson(cacheKey, pipeline, 900);

      return pipeline;
    } catch (error) {
      this.logger.error(`Failed to get sales pipeline: ${error.message}`);
      throw error;
    }
  }

  async getPerformanceMetrics(tenantId: string, period = '30d'): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `crm:performance:${tenantId}:${period}`;
      const cached = await this.redis.getJson(cacheKey);
      
      if (cached) {
        return cached as PerformanceMetrics;
      }

      const [contactStats, opportunityStats] = await Promise.all([
        this.contactsService.getContactStats(tenantId),
        this.opportunitiesService.getOpportunityStats(tenantId),
      ]);

      const metrics: PerformanceMetrics = {
        period,
        customerAcquisition: contactStats.newThisMonth,
        leadGeneration: contactStats.newThisMonth,
        conversionRate: opportunityStats.winRate,
        customerRetention: contactStats.total > 0 ? Math.round((contactStats.active / contactStats.total) * 100) : 0,
        averageDealSize: opportunityStats.averageValue,
        salesVelocity: this.calculateSalesVelocity(opportunityStats),
        customerLifetimeValue: this.calculateCustomerLifetimeValue(opportunityStats),
      };

      // Cache for 30 minutes
      await this.redis.setJson(cacheKey, metrics, 1800);

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get performance metrics: ${error.message}`);
      throw error;
    }
  }

  async getRecentActivities(tenantId: string, limit = 10) {
    try {
      return await this.activitiesService.findAll(tenantId, 1, limit);
    } catch (error) {
      this.logger.error(`Failed to get recent activities: ${error.message}`);
      throw error;
    }
  }

  async getUpcomingActivities(tenantId: string, userId?: string, limit = 10) {
    try {
      return await this.activitiesService.getUpcomingActivities(tenantId, userId, limit);
    } catch (error) {
      this.logger.error(`Failed to get upcoming activities: ${error.message}`);
      throw error;
    }
  }

  async getOverdueActivities(tenantId: string, userId?: string, limit = 10) {
    try {
      return await this.activitiesService.getOverdueActivities(tenantId, userId, limit);
    } catch (error) {
      this.logger.error(`Failed to get overdue activities: ${error.message}`);
      throw error;
    }
  }

  private formatStageName(stage: string): string {
    return stage.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private calculateSalesVelocity(opportunityStats: any): number {
    // Simple calculation: average deal size * win rate / average sales cycle (assumed 30 days)
    return Math.round((opportunityStats.averageValue * (opportunityStats.winRate / 100)) / 30);
  }

  private calculateCustomerLifetimeValue(opportunityStats: any): number {
    // Simple calculation: average deal size * 3 (assumed repeat purchases)
    return Math.round(opportunityStats.averageValue * 3);
  }
}