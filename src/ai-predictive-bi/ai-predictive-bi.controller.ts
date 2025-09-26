import { Controller, Get } from '@nestjs/common';
import { AiPredictiveBiService } from './ai-predictive-bi.service';
import { Fortune500AIPredictiveBIConfig } from '../types/fortune500-types';

@Controller('ai-predictive-bi')
export class AiPredictiveBiController {
  constructor(private readonly svc: AiPredictiveBiService) {}

  @Get('health')
  health(): Fortune500AIPredictiveBIConfig {
    return this.svc.health();
  }
}
