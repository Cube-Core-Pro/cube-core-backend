import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ExecutiveDashboardService } from '../services/executive-dashboard.service';

@ApiTags('Executive Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('executive')
export class ExecutiveDashboardController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService
  ) {}

  @Get('dashboard/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Executive KPI Dashboard',
    description: 'Fortune 500 level executive dashboard with comprehensive KPIs across all business functions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive dashboard data retrieved successfully' 
  })
  async getExecutiveKPIs(@Param('tenantId') tenantId: string) {
    return this.executiveDashboardService.getExecutiveKPIs(tenantId);
  }

  @Get('alerts/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Real-time Executive Alerts',
    description: 'Critical and important alerts requiring executive attention'
  })
  async getExecutiveAlerts(@Param('tenantId') tenantId: string) {
    return this.executiveDashboardService.getExecutiveAlerts(tenantId);
  }

  @Get('competitive-intelligence/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Competitive Intelligence',
    description: 'Market position, competitor analysis, and strategic insights'
  })
  async getCompetitiveIntelligence(@Param('tenantId') tenantId: string) {
    return this.executiveDashboardService.getCompetitiveIntelligence(tenantId);
  }

  @Get('financial-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CFO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Financial KPIs',
    description: 'Comprehensive financial metrics for CFO-level reporting'
  })
  async getFinancialKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      financialMetrics: dashboard.financialMetrics
    };
  }

  @Get('operational-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'COO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Operational KPIs',
    description: 'Operational excellence metrics for COO-level reporting'
  })
  async getOperationalKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      operationalMetrics: dashboard.operationalMetrics
    };
  }

  @Get('risk-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CRO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Risk KPIs',
    description: 'Enterprise risk management metrics for CRO-level reporting'
  })
  async getRiskKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      riskMetrics: dashboard.riskMetrics
    };
  }

  @Get('compliance-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CCO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Compliance KPIs',
    description: 'Compliance and governance metrics for CCO-level reporting'
  })
  async getComplianceKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      complianceMetrics: dashboard.complianceMetrics
    };
  }

  @Get('human-capital-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CHRO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Human Capital KPIs',
    description: 'Workforce and talent management metrics for CHRO-level reporting'
  })
  async getHumanCapitalKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      humanCapitalMetrics: dashboard.humanCapitalMetrics
    };
  }

  @Get('customer-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CMO', 'CCO_CUSTOMER', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Customer KPIs',
    description: 'Customer experience and growth metrics for CMO/CCO-level reporting'
  })
  async getCustomerKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      customerMetrics: dashboard.customerMetrics
    };
  }

  @Get('innovation-kpis/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'CTO', 'CIO', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Innovation & Technology KPIs',
    description: 'Innovation and digital transformation metrics for CTO/CIO-level reporting'
  })
  async getInnovationKPIs(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      innovationMetrics: dashboard.innovationMetrics
    };
  }

  @Get('health-score/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Overall Health Score',
    description: 'Enterprise-wide health score and critical indicators'
  })
  async getHealthScore(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      overallHealthScore: dashboard.executiveSummary.overallHealthScore,
      criticalAlerts: dashboard.executiveSummary.criticalAlerts,
      topOpportunities: dashboard.executiveSummary.topOpportunities
    };
  }

  @Get('strategic-recommendations/:tenantId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE')
  @ApiOperation({ 
    summary: 'Get Strategic Recommendations',
    description: 'AI-powered strategic recommendations for executive decision making'
  })
  async getStrategicRecommendations(@Param('tenantId') tenantId: string) {
    const dashboard = await this.executiveDashboardService.getExecutiveKPIs(tenantId);
    return {
      timestamp: dashboard.timestamp,
      tenantId: dashboard.tenantId,
      strategicRecommendations: dashboard.executiveSummary.strategicRecommendations
    };
  }
}