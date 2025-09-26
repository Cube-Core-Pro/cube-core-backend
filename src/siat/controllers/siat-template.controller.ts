// path: backend/src/siat/controllers/siat-template.controller.ts
// purpose: Controller for SIAT template management
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
import { SiatTemplateService } from '../services/siat-template.service';
import { CreateSiatTemplateDto } from '../dto/create-siat-template.dto';

@ApiTags('SIAT Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('siat/templates')
export class SiatTemplateController {
  constructor(private readonly siatTemplateService: SiatTemplateService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Create a new SIAT template' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'SIAT template created successfully' 
  })
  async create(
    @Body() createSiatTemplateDto: CreateSiatTemplateDto,
    @Request() req: any
  ) {
    return this.siatTemplateService.create(
      createSiatTemplateDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all SIAT templates' })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    type: String,
    description: 'Filter by template type'
  })
  @ApiQuery({ 
    name: 'includeSystem', 
    required: false, 
    type: Boolean,
    description: 'Include system templates'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of SIAT templates' 
  })
  async findAll(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('includeSystem') includeSystem?: boolean
  ) {
    return this.siatTemplateService.findAll(
      req.user.tenantId,
      req.user.id,
      type,
      includeSystem
    );
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get SIAT template by ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT template details' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'SIAT template not found' 
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.siatTemplateService.findOne(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update SIAT template' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT template updated successfully' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateSiatTemplateDto: Partial<CreateSiatTemplateDto>,
    @Request() req: any
  ) {
    return this.siatTemplateService.update(
      id,
      updateSiatTemplateDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Delete SIAT template' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'SIAT template deleted successfully' 
  })
  async remove(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.siatTemplateService.remove(
      id,
      req.user.tenantId,
      req.user.id
    );
    return { message: 'SIAT template deleted successfully' };
  }
}