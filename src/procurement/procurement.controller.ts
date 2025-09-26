import { Controller, Get } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { Fortune500ProcurementConfig } from '../types/fortune500-types';

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly svc: ProcurementService) {}

  @Get('health')
  health(): Fortune500ProcurementConfig {
    return this.svc.health();
  }
}
