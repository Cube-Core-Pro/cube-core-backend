// path: backend/src/modules/predictive/predictive.module.ts
// purpose: Predictive Analytics module for Fortune500 AI-powered forecasting and insights
// dependencies: NestJS, Prisma, Redis, Bull Queue, TensorFlow

import { Module } from '@nestjs/common';
import { PredictiveController } from './predictive.controller';
import { PredictiveService } from './predictive.service';

// Core Services
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';
import { ForecastingService } from './services/forecasting.service';
import { DataMiningService } from './services/data-mining.service';
import { MLModelService } from './services/ml-model.service';
import { TrendAnalysisService } from './services/trend-analysis.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue(
      {
        name: 'ml-training',
      },
      {
        name: 'prediction-processing',
      },
      {
        name: 'data-analysis',
      },
    ),
  ],
  controllers: [PredictiveController],
  providers: [
    // Core Service
    PredictiveService,
    
    // Analytics Services
    PredictiveAnalyticsService,
    ForecastingService,
    DataMiningService,
    MLModelService,
    TrendAnalysisService,
    AnomalyDetectionService,
  ],
  exports: [
    PredictiveService,
    PredictiveAnalyticsService,
    ForecastingService,
    DataMiningService,
    MLModelService,
    TrendAnalysisService,
    AnomalyDetectionService,
  ],
})
export class PredictiveModule {}