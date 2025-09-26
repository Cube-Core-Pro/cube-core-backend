import { Controller, Get } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Fortune500BillingConfig } from '../types/fortune500-types';

@Controller('billing')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Get('health')
  health(): Fortune500BillingConfig {
    return this.svc.health();
  }
}
