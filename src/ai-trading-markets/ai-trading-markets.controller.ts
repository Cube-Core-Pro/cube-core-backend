import { Controller, Get } from '@nestjs/common';
import { AiTradingMarketsService } from './ai-trading-markets.service';
import { Fortune500TradingConfig } from '../types/fortune500-types';

@Controller('ai-trading-markets')
export class AiTradingMarketsController {
  constructor(private readonly svc: AiTradingMarketsService) {}

  @Get('health')
  health(): Fortune500TradingConfig {
    return this.svc.health();
  }
}
