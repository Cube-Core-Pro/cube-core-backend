import { Controller, Get } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { Fortune500ComplianceConfig } from '../types/fortune500-types';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly svc: ComplianceService) {}

  @Get('health')
  health(): Fortune500ComplianceConfig {
    return this.svc.health();
  }
}
