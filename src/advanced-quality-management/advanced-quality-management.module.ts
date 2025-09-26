import { Module } from '@nestjs/common';
import { AdvancedQualityManagementController } from './advanced-quality-management.controller';
import { AdvancedQualityManagementService } from './advanced-quality-management.service';

@Module({
  controllers: [AdvancedQualityManagementController],
  providers: [AdvancedQualityManagementService],
  exports: [AdvancedQualityManagementService],
})
export class AdvancedQualityManagementModule {}
