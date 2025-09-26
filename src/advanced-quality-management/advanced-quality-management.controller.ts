import { Controller, Get } from '@nestjs/common';
import { AdvancedQualityManagementService } from './advanced-quality-management.service';
import { Fortune500QualityConfig } from '../types/fortune500-types';

@Controller('advanced-quality-management')
export class AdvancedQualityManagementController {
  constructor(private readonly svc: AdvancedQualityManagementService) {}

  @Get('health')
  health(): Fortune500QualityConfig {
    return this.svc.health();
  }
}
