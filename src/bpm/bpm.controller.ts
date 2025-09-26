import { Controller, Get } from '@nestjs/common';
import { BpmService } from './bpm.service';
import { Fortune500BpmConfig } from '../types/fortune500-types';

@Controller('bpm')
export class BpmController {
  constructor(private readonly svc: BpmService) {}

  @Get('health')
  health(): Fortune500BpmConfig {
    return this.svc.health();
  }
}
