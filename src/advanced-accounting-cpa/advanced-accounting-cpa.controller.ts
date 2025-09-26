import { Controller, Get } from '@nestjs/common';
import { AdvancedAccountingCpaService } from './advanced-accounting-cpa.service';
import { Fortune500AccountingConfig } from '../types/fortune500-types';

@Controller('advanced-accounting-cpa')
export class AdvancedAccountingCpaController {
  constructor(private readonly svc: AdvancedAccountingCpaService) {}

  @Get('health')
  health(): Fortune500AccountingConfig {
    return this.svc.health();
  }
}
