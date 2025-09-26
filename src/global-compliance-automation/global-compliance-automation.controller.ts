import { Controller, Get } from '@nestjs/common';
import { GlobalComplianceAutomationService } from './global-compliance-automation.service';
import { Fortune500GlobalComplianceAutomationConfig } from '../types/fortune500-types';

@Controller('global-compliance-automation')
export class GlobalComplianceAutomationController {
  constructor(private readonly svc: GlobalComplianceAutomationService) {}

  @Get('health')
  health(): Fortune500GlobalComplianceAutomationConfig {
    return this.svc.health();
  }
}
