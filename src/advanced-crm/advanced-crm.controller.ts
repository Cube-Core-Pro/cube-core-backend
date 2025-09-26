import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { AdvancedCrmService } from './advanced-crm.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
import { Fortune500AdvancedCrmConfig } from '../types/fortune500-types';

@Controller('advanced-crm')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class AdvancedCrmController {
  private readonly logger = new Logger(AdvancedCrmController.name);

  constructor(private readonly crmService: AdvancedCrmService) {}

  @Get('health')
  getHealth() {
    return this.crmService.health();
  }

  // ==================== CUSTOMER MANAGEMENT ====================

  @Get('customers/:tenantId')
  // @Roles('admin', 'sales_manager', 'sales_rep')
  async getCustomers(
    @Param('tenantId') tenantId: string,
    @Query() filters?: any
  ) {
    try {
      this.logger.log(`Fetching customers for tenant: ${tenantId}`);
      return await this.crmService.getCustomers(tenantId, filters);
    } catch (error) {
      this.logger.error(`Error fetching customers: ${error.message}`);
      throw error;
    }
  }

  @Get('customers/:tenantId/:customerId')
  // @Roles('admin', 'sales_manager', 'sales_rep', 'customer_success')
  async getCustomerById(
    @Param('tenantId') tenantId: string,
    @Param('customerId') customerId: string
  ) {
    try {
      this.logger.log(`Fetching customer ${customerId} for tenant: ${tenantId}`);
      return await this.crmService.getCustomerById(tenantId, customerId);
    } catch (error) {
      this.logger.error(`Error fetching customer: ${error.message}`);
      throw error;
    }
  }

  @Get('customers/:tenantId/:customerId/journey')
  // @Roles('admin', 'sales_manager', 'customer_success', 'analyst')
  async getCustomerJourney(
    @Param('tenantId') tenantId: string,
    @Param('customerId') customerId: string
  ) {
    try {
      this.logger.log(`Fetching customer journey for customer: ${customerId}, tenant: ${tenantId}`);
      return await this.crmService.getCustomerJourney(tenantId, customerId);
    } catch (error) {
      this.logger.error(`Error fetching customer journey: ${error.message}`);
      throw error;
    }
  }

  // ==================== SALES ANALYTICS ====================

  @Get('analytics/sales/:tenantId')
  // @Roles('admin', 'sales_manager', 'analyst', 'executive')
  async getSalesMetrics(
    @Param('tenantId') tenantId: string,
    @Query('period') period?: string
  ) {
    try {
      this.logger.log(`Fetching sales metrics for tenant: ${tenantId}, period: ${period}`);
      return await this.crmService.getSalesMetrics(tenantId, period);
    } catch (error) {
      this.logger.error(`Error fetching sales metrics: ${error.message}`);
      throw error;
    }
  }

  @Get('analytics/forecast/:tenantId')
  // @Roles('admin', 'sales_manager', 'analyst', 'executive')
  async getSalesForecast(
    @Param('tenantId') tenantId: string,
    @Query('months') months?: number
  ) {
    try {
      this.logger.log(`Generating sales forecast for tenant: ${tenantId}, months: ${months}`);
      return await this.crmService.getSalesForecast(tenantId, months);
    } catch (error) {
      this.logger.error(`Error generating sales forecast: ${error.message}`);
      throw error;
    }
  }

  // ==================== CUSTOMER SEGMENTATION ====================

  @Get('segments/:tenantId')
  // @Roles('admin', 'marketing_manager', 'sales_manager', 'analyst')
  async getCustomerSegments(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching customer segments for tenant: ${tenantId}`);
      return await this.crmService.getCustomerSegments(tenantId);
    } catch (error) {
      this.logger.error(`Error fetching customer segments: ${error.message}`);
      throw error;
    }
  }

  // ==================== LEAD SCORING & QUALIFICATION ====================

  @Post('leads/score/:tenantId')
  // @Roles('admin', 'sales_manager', 'marketing_manager')
  async scoreLeads(
    @Param('tenantId') tenantId: string,
    @Body() leads: any[]
  ) {
    try {
      this.logger.log(`Scoring ${leads.length} leads for tenant: ${tenantId}`);
      return await this.crmService.scoreLeads(tenantId, leads);
    } catch (error) {
      this.logger.error(`Error scoring leads: ${error.message}`);
      throw error;
    }
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  @Get('campaigns/metrics/:tenantId')
  // @Roles('admin', 'marketing_manager', 'campaign_manager')
  async getCampaignMetrics(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching campaign metrics for tenant: ${tenantId}`);
      return await this.crmService.getCampaignMetrics(tenantId);
    } catch (error) {
      this.logger.error(`Error fetching campaign metrics: ${error.message}`);
      throw error;
    }
  }

  // ==================== CHURN PREDICTION ====================

  @Get('analytics/churn/:tenantId')
  // @Roles('admin', 'customer_success', 'sales_manager', 'executive')
  async predictChurn(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Running churn prediction for tenant: ${tenantId}`);
      return await this.crmService.predictChurn(tenantId);
    } catch (error) {
      this.logger.error(`Error predicting churn: ${error.message}`);
      throw error;
    }
  }

  // ==================== COMPETITIVE INTELLIGENCE ====================

  @Get('competitive/intelligence/:tenantId')
  // @Roles('admin', 'sales_manager', 'marketing_manager', 'executive')
  async getCompetitiveIntelligence(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching competitive intelligence for tenant: ${tenantId}`);
      return await this.crmService.getCompetitiveIntelligence(tenantId);
    } catch (error) {
      this.logger.error(`Error fetching competitive intelligence: ${error.message}`);
      throw error;
    }
  }

  // ==================== SALES PERFORMANCE ====================

  @Get('performance/sales-reps/:tenantId')
  // @Roles('admin', 'sales_manager')
  async getSalesRepPerformance(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching sales rep performance for tenant: ${tenantId}`);
      
      return {
        performanceMetrics: [
          {
            repId: 'rep-001',
            name: 'John Anderson',
            territory: 'North America',
            quota: 2000000,
            achieved: 2350000,
            attainment: 117.5,
            dealsWon: 23,
            averageDealSize: 102174,
            salesCycle: 67, // days
            activities: 456,
            pipelineValue: 3200000,
            ranking: 1
          },
          {
            repId: 'rep-002',
            name: 'Sarah Chen',
            territory: 'APAC',
            quota: 1800000,
            achieved: 1650000,
            attainment: 91.7,
            dealsWon: 19,
            averageDealSize: 86842,
            salesCycle: 72,
            activities: 398,
            pipelineValue: 2800000,
            ranking: 2
          }
        ],
        teamMetrics: {
          totalQuota: 15000000,
          totalAchieved: 14250000,
          teamAttainment: 95.0,
          topPerformer: 'John Anderson',
          improvementNeeded: ['Sarah Chen', 'Mike Johnson'],
          averageDealSize: 94508,
          averageSalesCycle: 69.5
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching sales rep performance: ${error.message}`);
      throw error;
    }
  }

  // ==================== PIPELINE MANAGEMENT ====================

  @Get('pipeline/:tenantId')
  // @Roles('admin', 'sales_manager', 'sales_rep')
  async getPipelineAnalysis(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching pipeline analysis for tenant: ${tenantId}`);
      
      return {
        pipelineOverview: {
          totalValue: 45000000,
          weightedValue: 28500000,
          dealCount: 234,
          averageDealSize: 192308,
          averageSalesCycle: 89,
          conversionRate: 23.5
        },
        stageAnalysis: [
          {
            stage: 'prospecting',
            dealCount: 89,
            value: 12500000,
            averageTime: 14, // days
            conversionRate: 45.2,
            stagnantDeals: 12
          },
          {
            stage: 'qualification',
            dealCount: 67,
            value: 15200000,
            averageTime: 21,
            conversionRate: 62.3,
            stagnantDeals: 8
          },
          {
            stage: 'proposal',
            dealCount: 45,
            value: 11800000,
            averageTime: 18,
            conversionRate: 71.1,
            stagnantDeals: 5
          },
          {
            stage: 'negotiation',
            dealCount: 33,
            value: 5500000,
            averageTime: 12,
            conversionRate: 84.8,
            stagnantDeals: 3
          }
        ],
        riskAnalysis: {
          atRiskDeals: [
            {
              dealId: 'deal-001',
              customerName: 'Risk Corp',
              value: 500000,
              stage: 'negotiation',
              riskFactors: ['Budget concerns', 'Competitor pressure'],
              probability: 35,
              daysStagnant: 45
            }
          ],
          upcomingRenewals: 23,
          expansionOpportunities: 15
        },
        recommendations: [
          'Focus on qualification stage - 12 deals stagnant',
          'Accelerate proposal reviews - average time too high',
          'Address at-risk deals immediately',
          'Leverage expansion opportunities in Q4'
        ]
      };
    } catch (error) {
      this.logger.error(`Error fetching pipeline analysis: ${error.message}`);
      throw error;
    }
  }

  // ==================== CUSTOMER SUCCESS METRICS ====================

  @Get('success/metrics/:tenantId')
  // @Roles('admin', 'customer_success', 'executive')
  async getCustomerSuccessMetrics(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching customer success metrics for tenant: ${tenantId}`);
      
      return {
        healthScores: {
          healthy: 156, // Green
          atRisk: 34,   // Yellow
          critical: 8   // Red
        },
        satisfactionMetrics: {
          averageScore: 4.2,
          npsScore: 67,
          responseRate: 78.5,
          trendDirection: 'improving'
        },
        adoptionMetrics: {
          averageAdoption: 73.5,
          powerUsers: 89,
          lowUsage: 23,
          featureAdoption: {
            coreFeatures: 95.2,
            advancedFeatures: 67.8,
            newFeatures: 34.1
          }
        },
        retentionMetrics: {
          grossRetention: 94.2,
          netRetention: 112.5,
          churnRate: 5.8,
          expansionRate: 18.3
        },
        supportMetrics: {
          averageResponseTime: '2.3 hours',
          resolutionTime: '18.7 hours',
          firstCallResolution: 67.2,
          satisfactionScore: 4.4
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching customer success metrics: ${error.message}`);
      throw error;
    }
  }

  // ==================== REVENUE INTELLIGENCE ====================

  @Get('revenue/intelligence/:tenantId')
  // @Roles('admin', 'sales_manager', 'revenue_ops', 'executive')
  async getRevenueIntelligence(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Fetching revenue intelligence for tenant: ${tenantId}`);
      
      return {
        revenueMetrics: {
          currentQuarter: {
            actual: 28500000,
            target: 30000000,
            attainment: 95.0,
            forecast: 29200000
          },
          yearToDate: {
            actual: 125000000,
            target: 120000000,
            attainment: 104.2,
            forecast: 135000000
          }
        },
        growthAnalysis: {
          quarterOverQuarter: 12.5,
          yearOverYear: 18.7,
          newBusinessGrowth: 25.3,
          expansionGrowth: 15.8,
          churnImpact: -3.2
        },
        segmentPerformance: [
          {
            segment: 'Enterprise',
            revenue: 85000000,
            growth: 22.1,
            contribution: 68.0
          },
          {
            segment: 'Mid-Market',
            revenue: 28000000,
            growth: 15.7,
            contribution: 22.4
          },
          {
            segment: 'SMB',
            revenue: 12000000,
            growth: 8.3,
            contribution: 9.6
          }
        ],
        predictiveInsights: {
          quarterEndForecast: 29200000,
          confidence: 87.5,
          riskFactors: ['Economic uncertainty', 'Competitive pressure'],
          opportunities: ['Product expansion', 'Geographic growth'],
          recommendations: [
            'Accelerate enterprise deals in pipeline',
            'Focus on expansion revenue',
            'Address at-risk renewals'
          ]
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching revenue intelligence: ${error.message}`);
      throw error;
    }
  }
}