import { Controller, Get } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { Fortune500LoggingConfig } from '../types/fortune500-types';

@Controller('logger')
export class LoggerController {
  constructor(private readonly svc: LoggerService) {}

  @Get('health')
  health(): Fortune500LoggingConfig {
    return this.svc.health();
  }
}
