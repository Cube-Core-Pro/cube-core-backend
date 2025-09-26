// path: backend/src/modules/automation/controllers/metrics.controller.ts
// purpose: REST API endpoints for automation metrics and monitoring
// dependencies: @nestjs/common, metrics service

import { Controller, Get, Post, Body, Query, UseGuards, ParseArrayPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../../auth/guards/roles.guard';
// import { Roles } from '../../../auth/decorators/roles.decorator';
// import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AutomationMetricsService, SystemMetrics, Alert, AlertRule } from '../services/automation-metrics.service';

export class CreateAlertRuleDto {
  name: string;
  metric: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  recipients: string[];
}

export class MetricsQueryDto {
  timeRange?: '1h' | '6h' | '24h' | '7d' = '1h';
  tenantId?: string;
}

@ApiTags('Automation Metrics')
@Controller('api/automation/metrics')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @ApiBearerAuth()
export class MetricsController {
  constructor(private readonly metricsService: AutomationMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  // @Roles('admin', 'automation_manager', 'viewer')
  async getMetrics(
    @Query() query: MetricsQueryDto,
    // @CurrentUser() user: any
  ): Promise<SystemMetrics> {
    const tenantId = query.tenantId || 'default';
    return this.metricsService.getMetrics(tenantId, query.timeRange);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved successfully' })
  // @Roles('admin', 'automation_manager')
  async getAlerts(
    @Query('tenantId') tenantId: string,
    // @CurrentUser() user: any
  ): Promise<Alert[]> {
    const effectiveTenantId = tenantId || 'default';
    return this.metricsService.getAlerts(effectiveTenantId);
  }

  @Post('alerts/rules')
  @ApiOperation({ summary: 'Create alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created successfully' })
  // @Roles('admin', 'automation_manager')
  async createAlertRule(
    @Body() createAlertRuleDto: CreateAlertRuleDto,
    // @CurrentUser() user: any
  ): Promise<AlertRule> {
    return this.metricsService.createAlertRule({
      ...createAlertRuleDto,
      recipients: [...createAlertRuleDto.recipients, 'default']
    });
  }

  @Post('record')
  @ApiOperation({ summary: 'Record custom metric' })
  @ApiResponse({ status: 201, description: 'Metric recorded successfully' })
  // @Roles('admin', 'automation_manager')
  async recordMetric(
    @Body() body: {
      metric: string;
      value: number;
      labels?: Record<string, string>;
      type?: 'counter' | 'gauge' | 'histogram' | 'summary';
    },
    // @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    this.metricsService.recordMetric(
      body.metric,
      body.value,
      { ...body.labels, tenantId: 'default' },
      body.type
    );

    return { success: true };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get metrics dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  // @Roles('admin', 'automation_manager', 'viewer')
  async getDashboard(
    @Query() query: MetricsQueryDto,
    // @CurrentUser() user: any
  ) {
    const tenantId = query.tenantId || 'default';
    const metrics = await this.metricsService.getMetrics(tenantId, query.timeRange);
    const alerts = await this.metricsService.getAlerts(tenantId);

    return {
      metrics,
      alerts: alerts.filter(a => a.status === 'firing'),
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.rule.severity === 'critical').length,
        warningAlerts: alerts.filter(a => a.rule.severity === 'warning').length,
        systemHealth: this.calculateSystemHealth(metrics),
      }
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health status retrieved successfully' })
  async getHealthStatus(/* @CurrentUser() user: any */) {
    const tenantId = 'default';
    const metrics = await this.metricsService.getMetrics(tenantId, '1h');
    const alerts = await this.metricsService.getAlerts(tenantId);

    const health = this.calculateSystemHealth(metrics);
    const status = health >= 80 ? 'healthy' : health >= 60 ? 'degraded' : 'unhealthy';

    return {
      status,
      score: health,
      timestamp: new Date(),
      components: {
        performance: metrics.performance.executionTime.avg < 1000 ? 'healthy' : 'degraded',
        reliability: metrics.reliability.successRate >= 95 ? 'healthy' : 'degraded',
        capacity: Math.max(metrics.capacity.cpu, metrics.capacity.memory) < 80 ? 'healthy' : 'degraded',
        alerts: alerts.filter(a => a.status === 'firing').length === 0 ? 'healthy' : 'degraded'
      },
      details: {
        uptime: metrics.reliability.uptime,
        availability: metrics.reliability.availability,
        errorRate: metrics.reliability.errorRate,
        activeAlerts: alerts.filter(a => a.status === 'firing').length,
      }
    };
  }

  private calculateSystemHealth(metrics: SystemMetrics): number {
    // Calculate weighted health score (0-100)
    const performanceScore = Math.max(0, 100 - (metrics.performance.executionTime.avg / 10));
    const reliabilityScore = metrics.reliability.successRate;
    const capacityScore = 100 - Math.max(metrics.capacity.cpu, metrics.capacity.memory);

    // Weighted average: reliability 40%, performance 35%, capacity 25%
    return Math.round(
      reliabilityScore * 0.4 +
      performanceScore * 0.35 +
      capacityScore * 0.25
    );
  }
}