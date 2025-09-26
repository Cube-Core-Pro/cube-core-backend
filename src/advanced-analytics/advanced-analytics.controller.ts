import { Controller, Get } from '@nestjs/common';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { Fortune500AnalyticsConfig } from '../types/fortune500-types';

@Controller('advanced-analytics')
export class AdvancedAnalyticsController {
  constructor(private readonly svc: AdvancedAnalyticsService) {}

  @Get('health')
  health(): Fortune500AnalyticsConfig {
    return this.svc.health();
  }
}
