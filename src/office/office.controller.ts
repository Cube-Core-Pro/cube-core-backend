// path: src/office/office.controller.ts
// purpose: Office Suite REST API controller with basic operations
// dependencies: NestJS, Swagger, Office Service

import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { OfficeService } from './office.service';
import { CreateFolderDto } from './dto/office.dto';
import { Fortune500OfficeConfig } from '../types/fortune500-types';

@ApiTags('Office Suite')
@Controller('office')
export class OfficeController {
  constructor(
    private readonly officeService: OfficeService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Office module health check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Office module is healthy' })
  health(): Fortune500OfficeConfig {
    return this.officeService.health();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get office suite dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.officeService.getDashboard(tenantId, userId);
  }

  @Get('folders')
  @ApiOperation({ summary: 'Get folders' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Folders retrieved successfully' })
  async getFolders(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.officeService.getFolders(tenantId, userId);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create folder' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Folder created successfully' })
  async createFolder(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() createFolderDto: CreateFolderDto
  ) {
    return this.officeService.createFolder(tenantId, userId, createFolderDto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently accessed documents' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent documents retrieved successfully' })
  async getRecentDocuments(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.officeService.getRecentDocuments(tenantId, userId);
  }
}