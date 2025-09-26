import { Module } from '@nestjs/common';
import { AiEthicsController } from './ai-ethics.controller';
import { AiEthicsService } from './ai-ethics.service';

@Module({
  controllers: [AiEthicsController],
  providers: [AiEthicsService],
  exports: [AiEthicsService],
})
export class AiEthicsModule {}
