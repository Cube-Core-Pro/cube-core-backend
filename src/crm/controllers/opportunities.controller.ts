// path: backend/src/crm/controllers/opportunities.controller.ts
// purpose: REST API controller for CRM opportunities
// dependencies: OpportunitiesService, AuthGuard, RolesGuard

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
import { OpportunitiesService, CreateOpportunityDto, UpdateOpportunityDto } from "../services/opportunities.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/types/user.types";

@ApiTags('CRM - Opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async create(@Body() createOpportunityDto: CreateOpportunityDto, @Request() req) {
    return this.opportunitiesService.create(createOpportunityDto, req.user.tenantId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get all opportunities with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'stage', required: false, type: String, description: 'Filter by stage' })
  @ApiResponse({ status: 200, description: 'Opportunities retrieved successfully' })
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.opportunitiesService.findAll(req.user.tenantId, pageNum, limitNum, search, stage);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get opportunity statistics' })
  @ApiResponse({ status: 200, description: 'Opportunity stats retrieved successfully' })
  async getStats(@Request() req) {
    return this.opportunitiesService.getOpportunityStats(req.user.tenantId);
  }

  @Get('by-stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get opportunities grouped by stage' })
  @ApiResponse({ status: 200, description: 'Opportunities by stage retrieved successfully' })
  async getByStage(@Request() req) {
    return this.opportunitiesService.getOpportunitiesByStage(req.user.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  @ApiOperation({ summary: 'Get an opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.opportunitiesService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
    @Request() req,
  ) {
    return this.opportunitiesService.update(id, updateOpportunityDto, req.user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an opportunity' })
  @ApiResponse({ status: 204, description: 'Opportunity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.opportunitiesService.remove(id, req.user.tenantId);
  }

  @Patch(':id/stage')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Move opportunity to different stage' })
  @ApiResponse({ status: 200, description: 'Opportunity stage updated successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async moveToStage(
    @Param('id') id: string,
    @Body('stage') stage: string,
    @Request() req,
  ) {
    return this.opportunitiesService.moveToStage(id, stage, req.user.tenantId);
  }
}