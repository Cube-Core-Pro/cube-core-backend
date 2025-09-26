import { Controller, Get } from '@nestjs/common';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { Fortune500PerformanceConfig } from '../types/fortune500-types';

@Controller('performance-monitoring')
export class PerformanceMonitoringController {
  constructor(private readonly svc: PerformanceMonitoringService) {}

  @Get('health')
  health(): Fortune500PerformanceConfig {
    return this.svc.health();
  }
}
