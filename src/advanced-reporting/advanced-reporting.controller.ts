import { Controller, Get } from '@nestjs/common';
import { AdvancedReportingService } from './advanced-reporting.service';
import { Fortune500ReportingConfig } from '../types/fortune500-types';

@Controller('advanced-reporting')
export class AdvancedReportingController {
  constructor(private readonly svc: AdvancedReportingService) {}

  @Get('health')
  health(): Fortune500ReportingConfig {
    return this.svc.health();
  }
}
