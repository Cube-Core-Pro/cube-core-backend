import { Module } from '@nestjs/common';
import { AiPredictiveBiController } from './ai-predictive-bi.controller';
import { AiPredictiveBiService } from './ai-predictive-bi.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AiPredictiveBiController],
  providers: [
    AiPredictiveBiService,
  ],
  exports: [
    AiPredictiveBiService,
  ],
})
export class AiPredictiveBiModule {}
