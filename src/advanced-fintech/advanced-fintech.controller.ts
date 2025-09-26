import { Controller, Get } from '@nestjs/common';
import { AdvancedFintechService } from './advanced-fintech.service';
import { Fortune500FintechConfig } from '../types/fortune500-types';

@Controller('advanced-fintech')
export class AdvancedFintechController {
  constructor(private readonly svc: AdvancedFintechService) {}

  @Get('health')
  health(): Fortune500FintechConfig {
    return this.svc.health();
  }
}
