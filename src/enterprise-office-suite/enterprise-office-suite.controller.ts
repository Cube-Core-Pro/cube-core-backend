import { Controller, Get } from '@nestjs/common';
import { EnterpriseOfficeSuiteService } from './enterprise-office-suite.service';

@Controller('enterprise-office-suite')
export class EnterpriseOfficeSuiteController {
  constructor(private readonly svc: EnterpriseOfficeSuiteService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
