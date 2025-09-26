// path: src/pos/pos.controller.ts
// purpose: Main POS controller with health check and dashboard endpoints
// dependencies: @nestjs/common, @nestjs/swagger, PosService, AuthGuard

import { Controller, Get, Post, Body, Query,  Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateCustomerDto } from './dto';
import { Fortune500PosConfig } from '../types/fortune500-types';

@ApiTags('POS - Main')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('health')
  @ApiOperation({ summary: 'POS module health check' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  health(): Fortune500PosConfig {
    return this.posService.health();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get POS dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboard(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    return this.posService.getDashboardStats(tenantId);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createCustomer(@Request() req: any, @Body() createCustomerDto: CreateCustomerDto) {
    const tenantId = req.user?.tenantId;
    return this.posService.createCustomer(tenantId, createCustomerDto);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all customers with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async findCustomers(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.posService.findCustomers(tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findCustomer(@Request() req: any, @Query('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.posService.findCustomer(tenantId, id);
  }
}
