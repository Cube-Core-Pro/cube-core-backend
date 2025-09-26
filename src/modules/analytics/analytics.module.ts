// path: backend/src/modules/analytics/analytics.module.ts
// purpose: Advanced Analytics module for Fortune500 business intelligence and insights
// dependencies: @nestjs/common, prisma, data processing, machine learning

import { Module } from '@nestjs/common';
import { ProductivityOptimizationController } from './controllers/productivity-optimization.controller';
import { ProductivityOptimizationService } from './services/productivity-optimization.service';
import { BusinessIntelligenceService } from './services/business-intelligence.service';
import { DataVisualizationService } from './services/data-visualization.service';
import { ReportingService } from './services/reporting.service';
import { MetricsService } from './services/metrics.service';
import { ForecastingService } from './services/forecasting.service';
import { PerformanceAnalyticsService } from './services/performance-analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    ProductivityOptimizationController,
  ],
  providers: [
    ProductivityOptimizationService,
    BusinessIntelligenceService,
    DataVisualizationService,
    ReportingService,
    MetricsService,
    ForecastingService,
    PerformanceAnalyticsService,
  ],
  exports: [
    ProductivityOptimizationService,
    BusinessIntelligenceService,
    DataVisualizationService,
    ReportingService,
    MetricsService,
    ForecastingService,
    PerformanceAnalyticsService,
  ],
})
export class AnalyticsModule {}