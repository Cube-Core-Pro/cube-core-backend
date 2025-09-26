import { Module } from '@nestjs/common';
import { AiTradingMarketsController } from './ai-trading-markets.controller';
import { AiTradingMarketsService } from './ai-trading-markets.service';

@Module({
  controllers: [AiTradingMarketsController],
  providers: [AiTradingMarketsService],
  exports: [AiTradingMarketsService],
})
export class AiTradingMarketsModule {}
