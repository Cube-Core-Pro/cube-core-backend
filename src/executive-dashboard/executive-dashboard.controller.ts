// path: backend/src/executive-dashboard/executive-dashboard.controller.ts
// purpose: Fortune 500 Real-time Executive Dashboard REST API Controller
// dependencies: @nestjs/common, @nestjs/swagger

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Executive Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('executive-dashboard')
export class ExecutiveDashboardController {
  private readonly logger = new Logger(ExecutiveDashboardController.name);

  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
  ) {}

  @Get('dashboard')
  @Roles('admin', 'executive', 'ceo', 'cfo', 'coo')
  @ApiOperation({ 
    summary: 'Get Complete Executive Dashboard',
    description: 'Retrieve comprehensive executive dashboard with all key metrics and insights'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive dashboard retrieved successfully' 
  })
  async getExecutiveDashboard() {
    try {
      this.logger.log('Fetching complete executive dashboard');
      const dashboard = await this.executiveDashboardService.getExecutiveDashboard();
      
      return {
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        message: 'Executive dashboard retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching executive dashboard', error);
      throw new HttpException(
        'Failed to retrieve executive dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  @Roles('admin', 'executive', 'ceo', 'cfo', 'coo', 'manager')
  @ApiOperation({ 
    summary: 'Get Executive Summary',
    description: 'Retrieve high-level executive summary with key performance indicators'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive summary retrieved successfully' 
  })
  async getExecutiveSummary() {
    try {
      this.logger.log('Fetching executive summary');
      const summary = await this.executiveDashboardService.getExecutiveSummary();
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
        message: 'Executive summary retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching executive summary', error);
      throw new HttpException(
        'Failed to retrieve executive summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('kpi-overview')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Get KPI Overview',
    description: 'Retrieve comprehensive KPI overview with performance trends'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'KPI overview retrieved successfully' 
  })
  async getKPIOverview() {
    try {
      this.logger.log('Fetching KPI overview');
      const kpiOverview = await this.executiveDashboardService.getKPIOverview();
      
      return {
        success: true,
        data: kpiOverview,
        timestamp: new Date().toISOString(),
        message: 'KPI overview retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching KPI overview', error);
      throw new HttpException(
        'Failed to retrieve KPI overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('financial-metrics')
  @Roles('admin', 'executive', 'cfo', 'finance', 'analyst')
  @ApiOperation({ 
    summary: 'Get Financial Metrics',
    description: 'Retrieve comprehensive financial metrics including revenue, profitability, and cash flow'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Financial metrics retrieved successfully' 
  })
  async getFinancialMetrics() {
    try {
      this.logger.log('Fetching financial metrics');
      const financialMetrics = await this.executiveDashboardService.getFinancialMetrics();
      
      return {
        success: true,
        data: financialMetrics,
        timestamp: new Date().toISOString(),
        message: 'Financial metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching financial metrics', error);
      throw new HttpException(
        'Failed to retrieve financial metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('operational-metrics')
  @Roles('admin', 'executive', 'coo', 'operations', 'manager')
  @ApiOperation({ 
    summary: 'Get Operational Metrics',
    description: 'Retrieve operational metrics including productivity, efficiency, and quality'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Operational metrics retrieved successfully' 
  })
  async getOperationalMetrics() {
    try {
      this.logger.log('Fetching operational metrics');
      const operationalMetrics = await this.executiveDashboardService.getOperationalMetrics();
      
      return {
        success: true,
        data: operationalMetrics,
        timestamp: new Date().toISOString(),
        message: 'Operational metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching operational metrics', error);
      throw new HttpException(
        'Failed to retrieve operational metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('strategic-metrics')
  @Roles('admin', 'executive', 'ceo', 'strategist')
  @ApiOperation({ 
    summary: 'Get Strategic Metrics',
    description: 'Retrieve strategic metrics including innovation, market expansion, and sustainability'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Strategic metrics retrieved successfully' 
  })
  async getStrategicMetrics() {
    try {
      this.logger.log('Fetching strategic metrics');
      const strategicMetrics = await this.executiveDashboardService.getStrategicMetrics();
      
      return {
        success: true,
        data: strategicMetrics,
        timestamp: new Date().toISOString(),
        message: 'Strategic metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching strategic metrics', error);
      throw new HttpException(
        'Failed to retrieve strategic metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('risk-metrics')
  @Roles('admin', 'executive', 'risk_manager', 'compliance')
  @ApiOperation({ 
    summary: 'Get Risk Metrics',
    description: 'Retrieve comprehensive risk metrics and assessment'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk metrics retrieved successfully' 
  })
  async getRiskMetrics() {
    try {
      this.logger.log('Fetching risk metrics');
      const riskMetrics = await this.executiveDashboardService.getRiskMetrics();
      
      return {
        success: true,
        data: riskMetrics,
        timestamp: new Date().toISOString(),
        message: 'Risk metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching risk metrics', error);
      throw new HttpException(
        'Failed to retrieve risk metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('market-metrics')
  @Roles('admin', 'executive', 'marketing', 'sales', 'analyst')
  @ApiOperation({ 
    summary: 'Get Market Metrics',
    description: 'Retrieve market metrics including market share, growth, and competitive position'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Market metrics retrieved successfully' 
  })
  async getMarketMetrics() {
    try {
      this.logger.log('Fetching market metrics');
      const marketMetrics = await this.executiveDashboardService.getMarketMetrics();
      
      return {
        success: true,
        data: marketMetrics,
        timestamp: new Date().toISOString(),
        message: 'Market metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching market metrics', error);
      throw new HttpException(
        'Failed to retrieve market metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('talent-metrics')
  @Roles('admin', 'executive', 'hr', 'manager')
  @ApiOperation({ 
    summary: 'Get Talent Metrics',
    description: 'Retrieve talent metrics including employee engagement, productivity, and diversity'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Talent metrics retrieved successfully' 
  })
  async getTalentMetrics() {
    try {
      this.logger.log('Fetching talent metrics');
      const talentMetrics = await this.executiveDashboardService.getTalentMetrics();
      
      return {
        success: true,
        data: talentMetrics,
        timestamp: new Date().toISOString(),
        message: 'Talent metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching talent metrics', error);
      throw new HttpException(
        'Failed to retrieve talent metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('customer-metrics')
  @Roles('admin', 'executive', 'customer_success', 'sales', 'marketing')
  @ApiOperation({ 
    summary: 'Get Customer Metrics',
    description: 'Retrieve customer metrics including satisfaction, lifetime value, and segmentation'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Customer metrics retrieved successfully' 
  })
  async getCustomerMetrics() {
    try {
      this.logger.log('Fetching customer metrics');
      const customerMetrics = await this.executiveDashboardService.getCustomerMetrics();
      
      return {
        success: true,
        data: customerMetrics,
        timestamp: new Date().toISOString(),
        message: 'Customer metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching customer metrics', error);
      throw new HttpException(
        'Failed to retrieve customer metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('competitive-metrics')
  @Roles('admin', 'executive', 'strategist', 'marketing', 'analyst')
  @ApiOperation({ 
    summary: 'Get Competitive Metrics',
    description: 'Retrieve competitive metrics including market position and competitive advantages'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Competitive metrics retrieved successfully' 
  })
  async getCompetitiveMetrics() {
    try {
      this.logger.log('Fetching competitive metrics');
      const competitiveMetrics = await this.executiveDashboardService.getCompetitiveMetrics();
      
      return {
        success: true,
        data: competitiveMetrics,
        timestamp: new Date().toISOString(),
        message: 'Competitive metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching competitive metrics', error);
      throw new HttpException(
        'Failed to retrieve competitive metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('real-time-alerts')
  @Roles('admin', 'executive', 'manager', 'operator')
  @ApiOperation({ 
    summary: 'Get Real-time Alerts',
    description: 'Retrieve real-time alerts requiring executive attention'
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by alert type' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by alert category' })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time alerts retrieved successfully' 
  })
  async getRealTimeAlerts(
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    try {
      this.logger.log('Fetching real-time alerts');
      const alerts = await this.executiveDashboardService.getRealTimeAlerts();
      
      // Apply filters if provided
      let filteredAlerts = alerts;
      if (type) {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
      }
      if (category) {
        filteredAlerts = filteredAlerts.filter(alert => alert.category === category);
      }
      
      return {
        success: true,
        data: filteredAlerts,
        totalCount: alerts.length,
        filteredCount: filteredAlerts.length,
        timestamp: new Date().toISOString(),
        message: 'Real-time alerts retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching real-time alerts', error);
      throw new HttpException(
        'Failed to retrieve real-time alerts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('executive-insights')
  @Roles('admin', 'executive', 'strategist', 'analyst')
  @ApiOperation({ 
    summary: 'Get Executive Insights',
    description: 'Retrieve AI-powered executive insights and recommendations'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by insight category' })
  @ApiQuery({ name: 'confidence', required: false, description: 'Minimum confidence threshold' })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive insights retrieved successfully' 
  })
  async getExecutiveInsights(
    @Query('category') category?: string,
    @Query('confidence') confidence?: number,
  ) {
    try {
      this.logger.log('Fetching executive insights');
      const insights = await this.executiveDashboardService.getExecutiveInsights();
      
      // Apply filters if provided
      let filteredInsights = insights;
      if (category) {
        filteredInsights = filteredInsights.filter(insight => insight.category === category);
      }
      if (confidence) {
        filteredInsights = filteredInsights.filter(insight => insight.confidence >= confidence);
      }
      
      return {
        success: true,
        data: filteredInsights,
        totalCount: insights.length,
        filteredCount: filteredInsights.length,
        timestamp: new Date().toISOString(),
        message: 'Executive insights retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching executive insights', error);
      throw new HttpException(
        'Failed to retrieve executive insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stream/metrics')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Stream Real-time Executive Metrics',
    description: 'Get streaming real-time executive metrics for live dashboards'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time metrics stream initiated successfully' 
  })
  async streamExecutiveMetrics() {
    try {
      this.logger.log('Initiating executive metrics stream');
      const stream = await this.executiveDashboardService.streamExecutiveMetrics();
      
      return {
        success: true,
        data: stream,
        timestamp: new Date().toISOString(),
        message: 'Executive metrics stream initiated successfully'
      };
    } catch (error) {
      this.logger.error('Error initiating executive metrics stream', error);
      throw new HttpException(
        'Failed to initiate executive metrics stream',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-report')
  @Roles('admin', 'executive', 'ceo', 'cfo', 'coo')
  @ApiOperation({ 
    summary: 'Generate Executive Report',
    description: 'Generate comprehensive executive report for specified timeframe'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Executive report generated successfully' 
  })
  async generateExecutiveReport(
    @Body() reportRequest: { 
      timeframe: string; 
      includeDetails?: boolean;
      sections?: string[];
      format?: 'json' | 'pdf' | 'excel';
    }
  ) {
    try {
      this.logger.log(`Generating executive report for ${reportRequest.timeframe}`);
      const report = await this.executiveDashboardService.generateExecutiveReport(reportRequest.timeframe);
      
      return {
        success: true,
        data: report,
        timestamp: new Date().toISOString(),
        message: 'Executive report generated successfully'
      };
    } catch (error) {
      this.logger.error('Error generating executive report', error);
      throw new HttpException(
        'Failed to generate executive report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check')
  @ApiOperation({ 
    summary: 'Executive Dashboard Health Check',
    description: 'Check the health and status of the Executive Dashboard service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check completed successfully' 
  })
  async healthCheck() {
    try {
      this.logger.log('Performing Executive Dashboard health check');
      
      return {
        success: true,
        status: 'healthy',
        service: 'Executive Dashboard',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        capabilities: [
          'Real-time Metrics',
          'Financial Analytics',
          'Operational Insights',
          'Strategic Planning',
          'Risk Assessment',
          'Market Intelligence',
          'Talent Analytics',
          'Customer Intelligence',
          'Competitive Analysis'
        ],
        message: 'Executive Dashboard is operational'
      };
    } catch (error) {
      this.logger.error('Error during health check', error);
      throw new HttpException(
        'Health check failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('performance-summary')
  @Roles('admin', 'executive', 'manager')
  @ApiOperation({ 
    summary: 'Get Performance Summary',
    description: 'Retrieve consolidated performance summary across all business dimensions'
  })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for performance summary' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance summary retrieved successfully' 
  })
  async getPerformanceSummary(@Query('period') period: string = 'current') {
    try {
      this.logger.log(`Fetching performance summary for period: ${period}`);
      
      const [
        executiveSummary,
        kpiOverview,
        financialMetrics,
        operationalMetrics,
        strategicMetrics
      ] = await Promise.all([
        this.executiveDashboardService.getExecutiveSummary(),
        this.executiveDashboardService.getKPIOverview(),
        this.executiveDashboardService.getFinancialMetrics(),
        this.executiveDashboardService.getOperationalMetrics(),
        this.executiveDashboardService.getStrategicMetrics()
      ]);

      const performanceSummary = {
        period,
        overallPerformance: executiveSummary.overallPerformance,
        kpiSummary: {
          totalKPIs: kpiOverview.totalKPIs,
          onTargetPercentage: (kpiOverview.onTargetKPIs / kpiOverview.totalKPIs) * 100,
          improvingPercentage: (kpiOverview.improvingKPIs / kpiOverview.totalKPIs) * 100
        },
        financialSummary: {
          revenue: financialMetrics.revenue.totalRevenue,
          revenueGrowth: financialMetrics.revenue.revenueGrowth,
          profitMargin: financialMetrics.profitability.netMargin,
          cashPosition: financialMetrics.cashFlow.cashPosition
        },
        operationalSummary: {
          productivity: operationalMetrics.productivity.overallProductivity,
          efficiency: operationalMetrics.efficiency.operationalEfficiency,
          quality: operationalMetrics.quality.overallQuality
        },
        strategicSummary: {
          strategicAlignment: strategicMetrics.strategicAlignment,
          innovationIndex: strategicMetrics.innovationMetrics.innovationIndex,
          sustainabilityScore: strategicMetrics.sustainabilityMetrics.sustainabilityScore
        },
        generatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: performanceSummary,
        timestamp: new Date().toISOString(),
        message: 'Performance summary retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching performance summary', error);
      throw new HttpException(
        'Failed to retrieve performance summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
