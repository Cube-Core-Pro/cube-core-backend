// path: backend/src/ai-analytics-engine/ai-analytics-engine.module.ts
// purpose: Advanced AI Analytics Engine Module
// dependencies: @nestjs/common, prisma, redis

import { Module } from '@nestjs/common';
import { AIAnalyticsEngineController } from './ai-analytics-engine.controller';
import { AIAnalyticsEngineService } from './ai-analytics-engine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AIAnalyticsEngineController],
  providers: [AIAnalyticsEngineService],
  exports: [AIAnalyticsEngineService],
})
export class AIAnalyticsEngineModule {}