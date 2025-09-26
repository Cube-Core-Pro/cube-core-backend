import { Controller, Get } from '@nestjs/common';
import { RiskManagementService } from './risk-management.service';
import { Fortune500RiskConfig } from '../types/fortune500-types';

@Controller('risk-management')
export class RiskManagementController {
  constructor(private readonly svc: RiskManagementService) {}

  @Get('health')
  health(): Fortune500RiskConfig {
    return this.svc.health();
  }
}
