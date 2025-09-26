import { Controller, Get } from '@nestjs/common';
import { SmartAgricultureService } from './smart-agriculture.service';
import { Fortune500AgricultureConfig } from '../types/fortune500-types';

@Controller('smart-agriculture')
export class SmartAgricultureController {
  constructor(private readonly svc: SmartAgricultureService) {}

  @Get('health')
  health(): Fortune500AgricultureConfig {
    return this.svc.health();
  }
}
