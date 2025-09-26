import { Module } from '@nestjs/common';
import { AdvancedReportingController } from './advanced-reporting.controller';
import { AdvancedReportingService } from './advanced-reporting.service';

@Module({
  controllers: [AdvancedReportingController],
  providers: [AdvancedReportingService],
  exports: [AdvancedReportingService],
})
export class AdvancedReportingModule {}
