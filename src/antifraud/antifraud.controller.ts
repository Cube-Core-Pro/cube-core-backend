import { Controller, Get } from '@nestjs/common';
import { AntifraudService } from './antifraud.service';
import { Fortune500AntifraudConfig } from '../types/fortune500-types';

@Controller('antifraud')
export class AntifraudController {
  constructor(private readonly svc: AntifraudService) {}

  @Get('health')
  health(): Fortune500AntifraudConfig {
    return this.svc.health();
  }
}
