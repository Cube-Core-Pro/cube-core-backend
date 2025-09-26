// path: backend/src/siat/controllers/siat-flow.controller.ts
// purpose: Controller for SIAT flow management
// dependencies: @nestjs/common, @nestjs/swagger, guards, services

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SiatFlowService } from '../services/siat-flow.service';
import { CreateSiatFlowDto } from '../dto/create-siat-flow.dto';
import { UpdateSiatFlowDto } from '../dto/update-siat-flow.dto';
import { ExecuteSiatFlowDto } from '../dto/execute-siat-flow.dto';

@ApiTags('SIAT Flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('siat/flows')
export class SiatFlowController {
  constructor(private readonly siatFlowService: SiatFlowService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Create a new SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'SIAT flow created successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data' 
  })
  async create(
    @Body() createSiatFlowDto: CreateSiatFlowDto,
    @Request() req: any
  ) {
    return this.siatFlowService.create(
      createSiatFlowDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all SIAT flows' })
  @ApiQuery({ 
    name: 'includePublic', 
    required: false, 
    type: Boolean,
    description: 'Include public flows from other tenants'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of SIAT flows' 
  })
  async findAll(
    @Request() req: any,
    @Query('includePublic') includePublic?: boolean
  ) {
    return this.siatFlowService.findAll(
      req.user.tenantId,
      req.user.id,
      includePublic
    );
  }

  @Get('stats')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get SIAT flow statistics' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT flow statistics' 
  })
  async getStats(@Request() req: any) {
    return this.siatFlowService.getFlowStats(req.user.tenantId);
  }

  @Get('by-tag/:tag')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get SIAT flows by tag' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of SIAT flows with the specified tag' 
  })
  async findByTag(
    @Param('tag') tag: string,
    @Request() req: any
  ) {
    return this.siatFlowService.getFlowsByTag(
      tag,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get SIAT flow by ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT flow details' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'SIAT flow not found' 
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatFlowService.findOne(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get(':id/executions')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get execution history for a SIAT flow' })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Maximum number of executions to return'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Execution history' 
  })
  async getExecutionHistory(
    @Param('id') id: string,
    @Request() req: any,
    @Query('limit') limit?: number
  ) {
    return this.siatFlowService.getExecutionHistory(
      id,
      req.user.tenantId,
      req.user.id,
      limit
    );
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT flow updated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'SIAT flow not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateSiatFlowDto: UpdateSiatFlowDto,
    @Request() req: any
  ) {
    return this.siatFlowService.update(
      id,
      updateSiatFlowDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Post(':id/execute')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Execute a SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Flow execution started' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'SIAT flow not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Flow is not executable' 
  })
  async execute(
    @Param('id') id: string,
    @Body() executeDto: Partial<ExecuteSiatFlowDto>,
    @Request() req: any
  ) {
    const executeSiatFlowDto: ExecuteSiatFlowDto = {
      flowId: id,
      inputData: executeDto.inputData || {}
    };

    return this.siatFlowService.execute(
      executeSiatFlowDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Post(':id/activate')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Activate a SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Flow activated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Cannot activate flow' 
  })
  async activate(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatFlowService.activate(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Post(':id/deactivate')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Deactivate a SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Flow deactivated successfully' 
  })
  async deactivate(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatFlowService.deactivate(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Post(':id/duplicate')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Duplicate a SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Flow duplicated successfully' 
  })
  async duplicate(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatFlowService.duplicate(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Delete SIAT flow' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'SIAT flow deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'SIAT flow not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions' 
  })
  async remove(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.siatFlowService.remove(
      id,
      req.user.tenantId,
      req.user.id
    );
    return { message: 'SIAT flow deleted successfully' };
  }
}