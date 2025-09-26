import { Controller, Get } from '@nestjs/common';
import { AiEthicsService } from './ai-ethics.service';
import { Fortune500AIEthicsConfig } from '../types/fortune500-types';

@Controller('ai-ethics')
export class AiEthicsController {
  constructor(private readonly svc: AiEthicsService) {}

  @Get('health')
  health(): Fortune500AIEthicsConfig {
    return this.svc.health();
  }
}
