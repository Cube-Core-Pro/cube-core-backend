import { Controller, Get } from '@nestjs/common';
import { AdvancedRiskManagementService } from './advanced-risk-management.service';
import { Fortune500RiskManagementConfig } from '../types/fortune500-types';

@Controller('advanced-risk-management')
export class AdvancedRiskManagementController {
  constructor(private readonly svc: AdvancedRiskManagementService) {}

  @Get('health')
  health(): Fortune500RiskManagementConfig {
    return this.svc.health();
  }
}
