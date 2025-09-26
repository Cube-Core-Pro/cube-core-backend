// path: backend/src/crm/controllers/activities.controller.ts
// purpose: REST API controller for CRM activities
// dependencies: ActivitiesService, AuthGuard, RolesGuard

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ActivitiesService, CreateActivityDto, UpdateActivityDto } from "../services/activities.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/types/user.types";

@ApiTags('CRM - Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Create a new activity' })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    return this.activitiesService.create(createActivityDto, req.user.id, req.user.tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get all activities with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'contactId', required: false, type: String, description: 'Filter by contact ID' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by activity type' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('contactId') contactId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.activitiesService.findAll(req.user.tenantId, pageNum, limitNum, contactId, type, status);
  }

  @Get('upcoming')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get upcoming activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Upcoming activities retrieved successfully' })
  async getUpcoming(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activitiesService.getUpcomingActivities(req.user.tenantId, req.user.id, limitNum);
  }

  @Get('overdue')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get overdue activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Overdue activities retrieved successfully' })
  async getOverdue(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activitiesService.getOverdueActivities(req.user.tenantId, req.user.id, limitNum);
  }

  @Get('by-type')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get activities grouped by type' })
  @ApiResponse({ status: 200, description: 'Activities by type retrieved successfully' })
  async getByType(@Request() req) {
    return this.activitiesService.getActivitiesByType(req.user.tenantId, req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get an activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.activitiesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Update an activity' })
  @ApiResponse({ status: 200, description: 'Activity updated successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req,
  ) {
    return this.activitiesService.update(id, updateActivityDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiResponse({ status: 204, description: 'Activity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.activitiesService.remove(id, req.user.tenantId);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Mark activity as completed' })
  @ApiResponse({ status: 200, description: 'Activity completed successfully' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async complete(
    @Param('id') id: string,
    @Request() req,
    @Body('outcome') outcome?: string,
    @Body('nextAction') nextAction?: string,
  ) {
    return this.activitiesService.completeActivity(id, outcome, nextAction, req.user.tenantId);
  }
}