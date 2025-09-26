// path: backend/src/crm/crm.controller.ts
// purpose: Main CRM controller for dashboard and analytics
// dependencies: CrmService, AuthGuard

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { CrmService } from "./crm.service";
import { ContactsService } from "./services/contacts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Fortune500CrmConfig } from '../types/fortune500-types';

@ApiTags('CRM - Dashboard')
@Controller('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly contactsService: ContactsService,
  ) {}

  // CRM Dashboard Endpoints
  @Get('dashboard')
  @ApiOperation({ summary: 'Get CRM dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  getDashboard(@Request() req) {
    return this.crmService.getDashboardStats(req.user.tenantId);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get sales pipeline data' })
  @ApiResponse({ status: 200, description: 'Pipeline data retrieved successfully' })
  getSalesPipeline(@Request() req) {
    return this.crmService.getSalesPipeline(req.user.tenantId);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (30d, 90d, 1y)' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  getPerformanceMetrics(@Query('period') period?: string, @Request() req?) {
    return this.crmService.getPerformanceMetrics(req.user.tenantId, period);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get recent CRM activities' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  getRecentActivities(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Request() req,
  ) {
    return this.crmService.getRecentActivities(req.user.tenantId, limit);
  }

  @Get('upcoming-activities')
  @ApiOperation({ summary: 'Get upcoming activities' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Upcoming activities retrieved successfully' })
  getUpcomingActivities(
    @Request() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.crmService.getUpcomingActivities(req.user.tenantId, req.user.id, limit);
  }

  @Get('overdue-activities')
  @ApiOperation({ summary: 'Get overdue activities' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Overdue activities retrieved successfully' })
  getOverdueActivities(
    @Request() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.crmService.getOverdueActivities(req.user.tenantId, req.user.id, limit);
  }
}