// path: backend/src/siat/siat.controller.ts
// purpose: SIAT controller for no-code AI module generation
// dependencies: @nestjs/common, class-validator, swagger

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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SiatService } from './siat.service';
import { 
  CreateSiatFlowDto, 
  UpdateSiatFlowDto, 
  GenerateModuleDto,
  DeployModuleDto,
  SiatFlowResponseDto,
  SiatExecutionResponseDto
} from './dto/siat.dto';
import { PaginationDto } from '../common/dto/base.dto';
import { Fortune500SiatConfig } from '../types/fortune500-types';

@ApiTags('SIAT - No-Code AI Builder')
@Controller('siat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SiatController {
  constructor(private readonly siatService: SiatService) {}

  @Post('flows')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Create new SIAT flow from prompt' })
  @ApiResponse({ status: 201, description: 'Flow created successfully', type: SiatFlowResponseDto })
  async createFlow(
    @Body() createFlowDto: CreateSiatFlowDto,
    @Request() req: any
  ): Promise<SiatFlowResponseDto> {
    return this.siatService.createFlow(createFlowDto, req.user);
  }

  @Get('flows')
  @Roles('ADMIN', 'DEVELOPER', 'USER')
  @ApiOperation({ summary: 'Get all SIAT flows' })
  @ApiResponse({ status: 200, description: 'Flows retrieved successfully' })
  async getFlows(
    @Query() pagination: PaginationDto,
    @Request() req: any
  ) {
    return this.siatService.getFlows(pagination, req.user.tenantId);
  }

  @Get('flows/:id')
  @Roles('ADMIN', 'DEVELOPER', 'USER')
  @ApiOperation({ summary: 'Get SIAT flow by ID' })
  @ApiResponse({ status: 200, description: 'Flow retrieved successfully', type: SiatFlowResponseDto })
  async getFlow(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<SiatFlowResponseDto> {
    return this.siatService.getFlow(id, req.user.tenantId);
  }

  @Put('flows/:id')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Update SIAT flow' })
  @ApiResponse({ status: 200, description: 'Flow updated successfully', type: SiatFlowResponseDto })
  async updateFlow(
    @Param('id') id: string,
    @Body() updateFlowDto: UpdateSiatFlowDto,
    @Request() req: any
  ): Promise<SiatFlowResponseDto> {
    return this.siatService.updateFlow(id, updateFlowDto, req.user);
  }

  @Delete('flows/:id')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Delete SIAT flow' })
  @ApiResponse({ status: 200, description: 'Flow deleted successfully' })
  async deleteFlow(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatService.deleteFlow(id, req.user.tenantId);
  }

  @Post('generate')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Generate module from AI prompt' })
  @ApiResponse({ status: 201, description: 'Module generated successfully' })
  async generateModule(
    @Body() generateDto: GenerateModuleDto,
    @Request() req: any
  ) {
    return this.siatService.generateModule(generateDto, req.user);
  }

  @Post('flows/:id/execute')
  @Roles('ADMIN', 'DEVELOPER', 'USER')
  @ApiOperation({ summary: 'Execute SIAT flow' })
  @ApiResponse({ status: 200, description: 'Flow executed successfully', type: SiatExecutionResponseDto })
  async executeFlow(
    @Param('id') id: string,
    @Body() executionData: any,
    @Request() req: any
  ): Promise<SiatExecutionResponseDto> {
    return this.siatService.executeFlow(id, executionData, req.user);
  }

  @Post('deploy')
  @Roles('ADMIN', 'DEVELOPER')
  @ApiOperation({ summary: 'Deploy generated module' })
  @ApiResponse({ status: 200, description: 'Module deployed successfully' })
  async deployModule(
    @Body() deployDto: DeployModuleDto,
    @Request() req: any
  ) {
    return this.siatService.deployModule(deployDto, req.user);
  }

  @Get('templates')
  @Roles('ADMIN', 'DEVELOPER', 'USER')
  @ApiOperation({ summary: 'Get available SIAT templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Request() req: any) {
    return this.siatService.getTemplates(req.user.tenantId);
  }

  @Get('executions/:flowId')
  @Roles('ADMIN', 'DEVELOPER', 'USER')
  @ApiOperation({ summary: 'Get flow execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  async getExecutionHistory(
    @Param('flowId') flowId: string,
    @Query() pagination: PaginationDto,
    @Request() req: any
  ) {
    return this.siatService.getExecutionHistory(flowId, pagination, req.user.tenantId);
  }
}