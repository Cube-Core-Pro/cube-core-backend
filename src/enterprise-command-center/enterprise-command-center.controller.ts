// path: backend/src/enterprise-command-center/enterprise-command-center.controller.ts
// purpose: Fortune 500 Enterprise Command Center REST API Controller
// dependencies: @nestjs/common, @nestjs/swagger

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EnterpriseCommandCenterService } from './enterprise-command-center.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Enterprise Command Center')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enterprise-command-center')
export class EnterpriseCommandCenterController {
  private readonly logger = new Logger(EnterpriseCommandCenterController.name);

  constructor(
    private readonly commandCenterService: EnterpriseCommandCenterService,
  ) {}

  @Get('dashboard')
  @Roles('admin', 'executive', 'manager')
  @ApiOperation({ 
    summary: 'Get Enterprise Command Center Dashboard',
    description: 'Retrieve comprehensive enterprise dashboard with real-time metrics, alerts, and insights'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Enterprise command center dashboard retrieved successfully' 
  })
  async getEnterpriseCommandCenter() {
    try {
      this.logger.log('Fetching Enterprise Command Center dashboard');
      const dashboard = await this.commandCenterService.getEnterpriseCommandCenter();
      
      return {
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        message: 'Enterprise Command Center dashboard retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching Enterprise Command Center dashboard', error);
      throw new HttpException(
        'Failed to retrieve Enterprise Command Center dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('organization-health')
  @Roles('admin', 'executive', 'manager')
  @ApiOperation({ 
    summary: 'Get Organization Health Metrics',
    description: 'Retrieve comprehensive organization health scores across all business dimensions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization health metrics retrieved successfully' 
  })
  async getOrganizationHealth() {
    try {
      this.logger.log('Fetching organization health metrics');
      const health = await this.commandCenterService.getOrganizationHealth();
      
      return {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
        message: 'Organization health metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching organization health metrics', error);
      throw new HttpException(
        'Failed to retrieve organization health metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('real-time-metrics')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Get Real-time Business Metrics',
    description: 'Retrieve live business metrics including users, transactions, revenue, and performance indicators'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time metrics retrieved successfully' 
  })
  async getRealTimeMetrics() {
    try {
      this.logger.log('Fetching real-time business metrics');
      const metrics = await this.commandCenterService.getRealTimeMetrics();
      
      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
        message: 'Real-time metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching real-time metrics', error);
      throw new HttpException(
        'Failed to retrieve real-time metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('executive-alerts')
  @Roles('admin', 'executive')
  @ApiOperation({ 
    summary: 'Get Executive Alerts',
    description: 'Retrieve critical alerts requiring executive attention with priority and urgency levels'
  })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by alert priority' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by alert category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by alert status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive alerts retrieved successfully' 
  })
  async getExecutiveAlerts(
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    try {
      this.logger.log('Fetching executive alerts');
      const alerts = await this.commandCenterService.getExecutiveAlerts();
      
      // Apply filters if provided
      let filteredAlerts = alerts;
      if (priority) {
        filteredAlerts = filteredAlerts.filter(alert => alert.priority === priority);
      }
      if (category) {
        filteredAlerts = filteredAlerts.filter(alert => alert.category === category);
      }
      if (status) {
        filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
      }
      
      return {
        success: true,
        data: filteredAlerts,
        totalCount: alerts.length,
        filteredCount: filteredAlerts.length,
        timestamp: new Date().toISOString(),
        message: 'Executive alerts retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching executive alerts', error);
      throw new HttpException(
        'Failed to retrieve executive alerts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('business-intelligence')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Get Business Intelligence Insights',
    description: 'Retrieve comprehensive business intelligence including market trends, competitor analysis, and customer insights'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Business intelligence insights retrieved successfully' 
  })
  async getBusinessIntelligence() {
    try {
      this.logger.log('Fetching business intelligence insights');
      const intelligence = await this.commandCenterService.getBusinessIntelligence();
      
      return {
        success: true,
        data: intelligence,
        timestamp: new Date().toISOString(),
        message: 'Business intelligence insights retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching business intelligence insights', error);
      throw new HttpException(
        'Failed to retrieve business intelligence insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('operational-status')
  @Roles('admin', 'executive', 'manager', 'operator')
  @ApiOperation({ 
    summary: 'Get Operational Status',
    description: 'Retrieve comprehensive operational status including systems, processes, and service levels'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Operational status retrieved successfully' 
  })
  async getOperationalStatus() {
    try {
      this.logger.log('Fetching operational status');
      const status = await this.commandCenterService.getOperationalStatus();
      
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
        message: 'Operational status retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching operational status', error);
      throw new HttpException(
        'Failed to retrieve operational status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('strategic-insights')
  @Roles('admin', 'executive', 'strategist')
  @ApiOperation({ 
    summary: 'Get Strategic Insights',
    description: 'Retrieve AI-powered strategic insights and recommendations for business growth and optimization'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by insight category' })
  @ApiQuery({ name: 'confidence', required: false, description: 'Minimum confidence threshold' })
  @ApiResponse({ 
    status: 200, 
    description: 'Strategic insights retrieved successfully' 
  })
  async getStrategicInsights(
    @Query('category') category?: string,
    @Query('confidence') confidence?: number,
  ) {
    try {
      this.logger.log('Fetching strategic insights');
      const insights = await this.commandCenterService.getStrategicInsights();
      
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
        message: 'Strategic insights retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching strategic insights', error);
      throw new HttpException(
        'Failed to retrieve strategic insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('risk-assessment')
  @Roles('admin', 'executive', 'risk-manager')
  @ApiOperation({ 
    summary: 'Get Risk Assessment',
    description: 'Retrieve comprehensive risk assessment including risk categories, top risks, and mitigation strategies'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Risk assessment retrieved successfully' 
  })
  async getRiskAssessment() {
    try {
      this.logger.log('Fetching risk assessment');
      const assessment = await this.commandCenterService.getRiskAssessment();
      
      return {
        success: true,
        data: assessment,
        timestamp: new Date().toISOString(),
        message: 'Risk assessment retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching risk assessment', error);
      throw new HttpException(
        'Failed to retrieve risk assessment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('performance-indicators')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Get Performance Indicators',
    description: 'Retrieve key performance indicators (KPIs) with current values, targets, and trends'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by KPI category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by KPI status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance indicators retrieved successfully' 
  })
  async getPerformanceIndicators(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    try {
      this.logger.log('Fetching performance indicators');
      const indicators = await this.commandCenterService.getPerformanceIndicators();
      
      // Apply filters if provided
      let filteredIndicators = indicators;
      if (category) {
        filteredIndicators = filteredIndicators.filter(indicator => indicator.category === category);
      }
      if (status) {
        filteredIndicators = filteredIndicators.filter(indicator => indicator.status === status);
      }
      
      return {
        success: true,
        data: filteredIndicators,
        totalCount: indicators.length,
        filteredCount: filteredIndicators.length,
        timestamp: new Date().toISOString(),
        message: 'Performance indicators retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching performance indicators', error);
      throw new HttpException(
        'Failed to retrieve performance indicators',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stream/real-time-metrics')
  @Roles('admin', 'executive', 'manager', 'analyst')
  @ApiOperation({ 
    summary: 'Stream Real-time Metrics',
    description: 'Get streaming real-time metrics for live dashboards'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time metrics stream initiated successfully' 
  })
  async streamRealTimeMetrics() {
    try {
      this.logger.log('Initiating real-time metrics stream');
      const stream = await this.commandCenterService.streamRealTimeMetrics();
      
      return {
        success: true,
        data: stream,
        timestamp: new Date().toISOString(),
        message: 'Real-time metrics stream initiated successfully'
      };
    } catch (error) {
      this.logger.error('Error initiating real-time metrics stream', error);
      throw new HttpException(
        'Failed to initiate real-time metrics stream',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('executive-report')
  @Roles('admin', 'executive')
  @ApiOperation({ 
    summary: 'Generate Executive Report',
    description: 'Generate comprehensive executive report for specified timeframe'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Executive report generated successfully' 
  })
  async generateExecutiveReport(
    @Body() reportRequest: { timeframe: string; includeDetails?: boolean }
  ) {
    try {
      this.logger.log(`Generating executive report for ${reportRequest.timeframe}`);
      const report = await this.commandCenterService.generateExecutiveReport(reportRequest.timeframe);
      
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

  @Post('predictive-analytics')
  @Roles('admin', 'executive', 'analyst')
  @ApiOperation({ 
    summary: 'Run Predictive Analytics',
    description: 'Execute AI-powered predictive analytics for specified business category'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Predictive analytics completed successfully' 
  })
  async runPredictiveAnalytics(
    @Body() analyticsRequest: { category: string; timeframe?: string; parameters?: any }
  ) {
    try {
      this.logger.log(`Running predictive analytics for ${analyticsRequest.category}`);
      const analytics = await this.commandCenterService.predictiveAnalytics(analyticsRequest.category);
      
      return {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
        message: 'Predictive analytics completed successfully'
      };
    } catch (error) {
      this.logger.error('Error running predictive analytics', error);
      throw new HttpException(
        'Failed to run predictive analytics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health-check')
  @ApiOperation({ 
    summary: 'Enterprise Command Center Health Check',
    description: 'Check the health and status of the Enterprise Command Center service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check completed successfully' 
  })
  async healthCheck() {
    try {
      this.logger.log('Performing Enterprise Command Center health check');
      
      return {
        success: true,
        status: 'healthy',
        service: 'Enterprise Command Center',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Enterprise Command Center is operational'
      };
    } catch (error) {
      this.logger.error('Error during health check', error);
      throw new HttpException(
        'Health check failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('analytics/summary')
  @Roles('admin', 'executive', 'analyst')
  @ApiOperation({ 
    summary: 'Get Analytics Summary',
    description: 'Retrieve comprehensive analytics summary across all business dimensions'
  })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Analytics summary retrieved successfully' 
  })
  async getAnalyticsSummary(@Query('period') period: string = 'current') {
    try {
      this.logger.log(`Fetching analytics summary for period: ${period}`);
      
      const [
        organizationHealth,
        realTimeMetrics,
        businessIntelligence,
        riskAssessment,
        performanceIndicators
      ] = await Promise.all([
        this.commandCenterService.getOrganizationHealth(),
        this.commandCenterService.getRealTimeMetrics(),
        this.commandCenterService.getBusinessIntelligence(),
        this.commandCenterService.getRiskAssessment(),
        this.commandCenterService.getPerformanceIndicators()
      ]);

      const summary = {
        period,
        organizationHealth,
        realTimeMetrics,
        businessIntelligence,
        riskAssessment,
        performanceIndicators,
        generatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
        message: 'Analytics summary retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching analytics summary', error);
      throw new HttpException(
        'Failed to retrieve analytics summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('insights/recommendations')
  @Roles('admin', 'executive', 'strategist')
  @ApiOperation({ 
    summary: 'Get AI-Powered Recommendations',
    description: 'Retrieve AI-generated recommendations based on current business state and trends'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter recommendations by category' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter recommendations by priority' })
  @ApiResponse({ 
    status: 200, 
    description: 'AI-powered recommendations retrieved successfully' 
  })
  async getAIRecommendations(
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    try {
      this.logger.log('Fetching AI-powered recommendations');
      
      // Mock AI recommendations - replace with actual AI service
      const recommendations = [
        {
          id: 'REC-001',
          category: 'operational',
          priority: 'high',
          title: 'Optimize Customer Onboarding Process',
          description: 'AI analysis suggests 23% efficiency improvement possible',
          confidence: 0.87,
          expectedImpact: 'Reduce onboarding time by 2.3 days',
          implementation: 'Automate document verification and approval workflow',
          timeline: '4-6 weeks',
          resources: ['Development team', 'Process analyst'],
          roi: 185000
        },
        {
          id: 'REC-002',
          category: 'financial',
          priority: 'medium',
          title: 'Diversify Revenue Streams',
          description: 'Market analysis indicates opportunity in adjacent markets',
          confidence: 0.73,
          expectedImpact: 'Potential 15% revenue increase',
          implementation: 'Develop new product line for SMB market',
          timeline: '6-12 months',
          resources: ['Product team', 'Marketing', 'Sales'],
          roi: 2500000
        }
      ];

      // Apply filters
      let filteredRecommendations = recommendations;
      if (category) {
        filteredRecommendations = filteredRecommendations.filter(rec => rec.category === category);
      }
      if (priority) {
        filteredRecommendations = filteredRecommendations.filter(rec => rec.priority === priority);
      }
      
      return {
        success: true,
        data: filteredRecommendations,
        totalCount: recommendations.length,
        filteredCount: filteredRecommendations.length,
        timestamp: new Date().toISOString(),
        message: 'AI-powered recommendations retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching AI recommendations', error);
      throw new HttpException(
        'Failed to retrieve AI recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
