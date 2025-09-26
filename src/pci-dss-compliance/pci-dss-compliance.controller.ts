import { Controller, Get } from '@nestjs/common';
import { PciDssComplianceService } from './pci-dss-compliance.service';
import { Fortune500PciDssComplianceConfig } from '../types/fortune500-types';

@Controller('pci-dss-compliance')
export class PciDssComplianceController {
  constructor(private readonly svc: PciDssComplianceService) {}

  @Get('health')
  health(): Fortune500PciDssComplianceConfig {
    return this.svc.health();
  }
}
