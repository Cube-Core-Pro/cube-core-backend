import { Controller, Get } from '@nestjs/common';
import { SmartCitiesIotService } from './smart-cities-iot.service';
import { Fortune500SmartCitiesConfig } from '../types/fortune500-types';

@Controller('smart-cities-iot')
export class SmartCitiesIotController {
  constructor(private readonly svc: SmartCitiesIotService) {}

  @Get('health')
  health(): Fortune500SmartCitiesConfig {
    return this.svc.health();
  }
}
