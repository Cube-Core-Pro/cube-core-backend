// path: backend/src/health/health.controller.ts
// purpose: Health check endpoints for monitoring and load balancers
// dependencies: NestJS Terminus, HealthService

import { Controller, Get, Header, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { Response } from 'express';
import { Fortune500HealthConfig } from '../types/fortune500-types';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    return this.healthService.check();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health status' })
  async detailedCheck() {
    return this.healthService.detailedCheck();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness() {
    return this.healthService.readinessCheck();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return this.healthService.livenessCheck();
  }

  @Get('/../metrics')
  @ApiOperation({ summary: 'Prometheus-style metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus exposition format' })
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Res() res: Response) {
    if (process.env.ENABLE_METRICS === 'false') {
      return res.status(404).send('metrics disabled');
    }
    const body = await this.healthService.metrics();
    res.status(200).send(body);
  }
}
