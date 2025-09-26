import { Module } from '@nestjs/common';
import { QualityManagementController } from './quality-management.controller';
import { QualityManagementService } from './quality-management.service';

@Module({
  controllers: [QualityManagementController],
  providers: [QualityManagementService],
  exports: [QualityManagementService],
})
export class QualityManagementModule {}
