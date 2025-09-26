import { Controller, Get } from '@nestjs/common';
import { HrService } from './hr.service';
import { Fortune500HrConfig } from '../types/fortune500-types';

@Controller('hr')
export class HrController {
  constructor(private readonly svc: HrService) {}

  @Get('health')
  health(): Fortune500HrConfig {
    return this.svc.health();
  }
}
