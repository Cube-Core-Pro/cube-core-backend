import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { PerformanceReviewController } from './controllers/performance-review.controller';
import { PerformanceReviewService } from './services/performance-review.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HrController, PerformanceReviewController],
  providers: [HrService, PerformanceReviewService],
  exports: [HrService, PerformanceReviewService],
})
export class HrModule {}
