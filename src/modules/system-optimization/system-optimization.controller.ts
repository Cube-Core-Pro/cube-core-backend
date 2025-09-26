// path: backend/src/modules/system-optimization/system-optimization.controller.ts
// purpose: Controller for system optimization endpoints
// dependencies: @nestjs/common, system-optimization.service

import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SystemOptimizationService } from './system-optimization.service';

@ApiTags('System Optimization')
@Controller('system-optimization')
export class SystemOptimizationController {
  constructor(
    private readonly systemOptimizationService: SystemOptimizationService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    return this.systemOptimizationService.getSystemHealth();
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Optimize system performance' })
  @ApiResponse({ status: 200, description: 'System optimization completed' })
  async optimizeSystem() {
    return this.systemOptimizationService.optimizeSystemPerformance();
  }
}