import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Fortune500ConfigConfig } from '../types/fortune500-types';

@Controller('config')
export class ConfigController {
  constructor(private readonly svc: ConfigService) {}

  @Get('health')
  health(): Fortune500ConfigConfig {
    return this.svc.health();
  }
}
