// path: backend/src/dashboard/dashboard.controller.ts
// purpose: Dashboard endpoints for analytics and system metrics
// dependencies: DashboardService, JWT guards

import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags('dashboard')
@Controller('v1/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview metrics' })
  @ApiResponse({ status: 200, description: 'Overview metrics retrieved successfully' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  getAnalytics(@Query('period') period: string = '30d') {
    return this.dashboardService.getAnalytics(period);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent system activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  getRecentActivities(@Query('limit') limit: number = 10) {
    return this.dashboardService.getRecentActivities(limit);
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'System health metrics retrieved successfully' })
  getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('financial-summary')
  @ApiOperation({ summary: 'Get financial summary' })
  @ApiQuery({ name: 'period', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiResponse({ status: 200, description: 'Financial summary retrieved successfully' })
  getFinancialSummary(@Query('period') period: string = '30d') {
    return this.dashboardService.getFinancialSummary(period);
  }

  @Get('user-metrics')
  @ApiOperation({ summary: 'Get user metrics' })
  @ApiResponse({ status: 200, description: 'User metrics retrieved successfully' })
  getUserMetrics() {
    return this.dashboardService.getUserMetrics();
  }
}