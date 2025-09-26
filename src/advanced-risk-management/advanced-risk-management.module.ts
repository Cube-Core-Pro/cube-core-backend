import { Module } from '@nestjs/common';
import { AdvancedRiskManagementController } from './advanced-risk-management.controller';
import { AdvancedRiskManagementService } from './advanced-risk-management.service';

@Module({
  controllers: [AdvancedRiskManagementController],
  providers: [AdvancedRiskManagementService],
  exports: [AdvancedRiskManagementService],
})
export class AdvancedRiskManagementModule {}
