// path: backend/src/crm/services/pipeline.service.ts
// purpose: Advanced pipeline management with automation and forecasting
// dependencies: PrismaService, EmailService, NotificationService

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../email/email.service";
import { LoggerService } from "../../logger/logger.service";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  isActive: boolean;
  automationRules?: AutomationRule[];
}

export interface AutomationRule {
  id: string;
  trigger: 'stage_change' | 'time_based' | 'activity_completion';
  conditions: Record<string, any>;
  actions: AutomationAction[];
}

export interface AutomationAction {
  type: 'send_email' | 'create_task' | 'update_field' | 'notify_user';
  parameters: Record<string, any>;
}

export interface PipelineMetrics {
  totalValue: number;
  averageDealSize: number;
  conversionRate: number;
  averageSalesCycle: number;
  stageMetrics: StageMetrics[];
  forecast: ForecastData;
}

export interface StageMetrics {
  stage: string;
  count: number;
  value: number;
  averageTime: number;
  conversionRate: number;
}

export interface ForecastData {
  thisMonth: number;
  nextMonth: number;
  thisQuarter: number;
  nextQuarter: number;
  confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {}

  async getPipelineStages(_tenantId: string): Promise<PipelineStage[]> {
    // For now, return default stages - in production this would be configurable
    return [
      { id: '1', name: 'Prospecting', order: 1, probability: 10, isActive: true },
      { id: '2', name: 'Qualification', order: 2, probability: 25, isActive: true },
      { id: '3', name: 'Proposal', order: 3, probability: 50, isActive: true },
      { id: '4', name: 'Negotiation', order: 4, probability: 75, isActive: true },
      { id: '5', name: 'Closed Won', order: 5, probability: 100, isActive: true },
      { id: '6', name: 'Closed Lost', order: 6, probability: 0, isActive: true },
    ];
  }

  async getPipelineMetrics(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<PipelineMetrics> {
    const whereClause = {
      tenantId,
      ...(dateRange && {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const opportunities = await this.prisma.crm_opportunities.findMany({
      where: whereClause,
      include: {
        crm_contacts: true,
      },
    });

    const totalValue = opportunities.reduce((sum, opp) => sum + Number(opp.value), 0);
    const averageDealSize = opportunities.length > 0 ? totalValue / opportunities.length : 0;

    // Calculate stage metrics
    const stageGroups = opportunities.reduce((acc, opp) => {
      if (!acc[opp.stage]) {
        acc[opp.stage] = [];
      }
      acc[opp.stage].push(opp);
      return acc;
    }, {} as Record<string, any[]>);

    const stageMetrics: StageMetrics[] = Object.entries(stageGroups).map(([stage, opps]) => ({
      stage,
      count: opps.length,
      value: opps.reduce((sum, opp) => sum + Number(opp.value), 0),
      averageTime: this.calculateAverageStageTime(opps),
      conversionRate: this.calculateStageConversionRate(stage, opportunities),
    }));

    // Calculate overall conversion rate
    const closedWon = opportunities.filter(opp => opp.stage === 'CLOSED_WON').length;
    const conversionRate = opportunities.length > 0 ? (closedWon / opportunities.length) * 100 : 0;

    // Calculate average sales cycle
    const averageSalesCycle = this.calculateAverageSalesCycle(opportunities);

    // Generate forecast
    const forecast = await this.generateForecast(tenantId, opportunities);

    return {
      totalValue,
      averageDealSize,
      conversionRate,
      averageSalesCycle,
      stageMetrics,
      forecast,
    };
  }

  async moveOpportunityToStage(
    opportunityId: string,
    newStage: string,
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<any> {
    const opportunity = await this.prisma.crm_opportunities.findFirst({
      where: { id: opportunityId, tenantId },
      include: { crm_contacts: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const oldStage = opportunity.stage;

    // Update opportunity stage
    const updatedOpportunity = await this.prisma.crm_opportunities.update({
      where: { id: opportunityId },
      data: {
        stage: newStage,
        updatedAt: new Date(),
        ...(newStage === 'CLOSED_WON' && { actualCloseDate: new Date() }),
        ...(newStage === 'CLOSED_LOST' && { actualCloseDate: new Date() }),
      },
      include: {
        crm_contacts: true,
        users: true,
      },
    });

    // Create activity record for stage change
    await this.prisma.crm_activities.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        contactId: opportunity.contactId,
        userId,
        type: 'STAGE_CHANGE',
        subject: `Opportunity moved from ${oldStage} to ${newStage}`,
        description: notes || `Stage changed automatically`,
        status: 'COMPLETED',
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Execute automation rules for stage change
    await this.executeAutomationRules(updatedOpportunity, 'stage_change', { oldStage, newStage });

    this.logger.log(`Opportunity ${opportunityId} moved from ${oldStage} to ${newStage}`, 'PipelineService');

    return updatedOpportunity;
  }

  async getOpportunitiesByStage(tenantId: string, stage?: string) {
    const where = {
      tenantId,
      ...(stage && { stage }),
    };

    const opportunities = await this.prisma.crm_opportunities.findMany({
      where,
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
      orderBy: [
        { stage: 'asc' },
        { expectedCloseDate: 'asc' },
      ],
    });

    // Group by stage
    const groupedOpportunities = opportunities.reduce((acc, opp) => {
      if (!acc[opp.stage]) {
        acc[opp.stage] = [];
      }
      acc[opp.stage].push(opp);
      return acc;
    }, {} as Record<string, any[]>);

    return groupedOpportunities;
  }

  async getWonLostAnalysis(tenantId: string, dateRange?: { start: Date; end: Date }) {
    const whereClause = {
      tenantId,
      stage: { in: ['CLOSED_WON', 'CLOSED_LOST'] },
      ...(dateRange && {
        actualCloseDate: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const closedOpportunities = await this.prisma.crm_opportunities.findMany({
      where: whereClause,
      include: {
        crm_contacts: true,
      },
    });

    const won = closedOpportunities.filter(opp => opp.stage === 'CLOSED_WON');
    const lost = closedOpportunities.filter(opp => opp.stage === 'CLOSED_LOST');

    const wonValue = won.reduce((sum, opp) => sum + Number(opp.value), 0);
    const lostValue = lost.reduce((sum, opp) => sum + Number(opp.value), 0);

    // Analyze loss reasons
    const lossReasons = lost.reduce((acc, opp) => {
      const reason = opp.lossReason || 'Unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      won: {
        count: won.length,
        value: wonValue,
        averageValue: won.length > 0 ? wonValue / won.length : 0,
      },
      lost: {
        count: lost.length,
        value: lostValue,
        averageValue: lost.length > 0 ? lostValue / lost.length : 0,
        reasons: lossReasons,
      },
      winRate: closedOpportunities.length > 0 ? (won.length / closedOpportunities.length) * 100 : 0,
    };
  }

  private calculateAverageStageTime(opportunities: any[]): number {
    // Simplified calculation - in production would track stage history
    const now = new Date();
    const totalDays = opportunities.reduce((sum, opp) => {
      const daysSinceCreated = Math.floor((now.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + daysSinceCreated;
    }, 0);

    return opportunities.length > 0 ? totalDays / opportunities.length : 0;
  }

  private calculateStageConversionRate(stage: string, allOpportunities: any[]): number {
    // Simplified calculation - in production would track stage transitions
    const stageOpps = allOpportunities.filter(opp => opp.stage === stage);
    const totalOpps = allOpportunities.length;
    return totalOpps > 0 ? (stageOpps.length / totalOpps) * 100 : 0;
  }

  private calculateAverageSalesCycle(opportunities: any[]): number {
    const closedOpps = opportunities.filter(opp => 
      opp.actualCloseDate && ['CLOSED_WON', 'CLOSED_LOST'].includes(opp.stage)
    );

    if (closedOpps.length === 0) return 0;

    const totalDays = closedOpps.reduce((sum, opp) => {
      const days = Math.floor((opp.actualCloseDate.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return totalDays / closedOpps.length;
  }

  private async generateForecast(tenantId: string, opportunities: any[]): Promise<ForecastData> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1);

    const activeOpportunities = opportunities.filter(opp => 
      !['CLOSED_WON', 'CLOSED_LOST'].includes(opp.stage)
    );

    const thisMonthForecast = this.calculatePeriodForecast(activeOpportunities, thisMonth, nextMonth);
    const nextMonthForecast = this.calculatePeriodForecast(activeOpportunities, nextMonth, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1));
    const thisQuarterForecast = this.calculatePeriodForecast(activeOpportunities, thisQuarter, nextQuarter);
    const nextQuarterForecast = this.calculatePeriodForecast(activeOpportunities, nextQuarter, new Date(nextQuarter.getFullYear(), nextQuarter.getMonth() + 3, 1));

    return {
      thisMonth: thisMonthForecast,
      nextMonth: nextMonthForecast,
      thisQuarter: thisQuarterForecast,
      nextQuarter: nextQuarterForecast,
      confidence: 'medium', // Would be calculated based on historical accuracy
    };
  }

  private calculatePeriodForecast(opportunities: any[], startDate: Date, endDate: Date): number {
    return opportunities
      .filter(opp => opp.expectedCloseDate && opp.expectedCloseDate >= startDate && opp.expectedCloseDate < endDate)
      .reduce((sum, opp) => sum + (Number(opp.value) * (opp.probability / 100)), 0);
  }

  private async executeAutomationRules(opportunity: any, trigger: string, context: any) {
    // Placeholder for automation rule execution
    // In production, this would load and execute configured automation rules
    this.logger.log(`Executing automation rules for opportunity ${opportunity.id} with trigger ${trigger}`, 'PipelineService');
    
    // Example: Send notification email when opportunity moves to proposal stage
    if (trigger === 'stage_change' && context.newStage === 'PROPOSAL') {
      try {
        await this.emailService.sendEmail({
          to: opportunity.users?.email || 'admin@company.com',
          subject: `Opportunity "${opportunity.name}" moved to Proposal stage`,
          template: 'opportunity-stage-change',
          context: {
            opportunityName: opportunity.name,
            contactName: `${opportunity.crm_contacts.firstName} ${opportunity.crm_contacts.lastName}`,
            newStage: context.newStage,
            value: opportunity.value,
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send automation email: ${error.message}`, 'PipelineService');
      }
    }
  }
}
