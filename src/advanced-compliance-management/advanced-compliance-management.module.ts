import { Module } from '@nestjs/common';
import { AdvancedComplianceManagementController } from './advanced-compliance-management.controller';
import { AdvancedComplianceManagementService } from './advanced-compliance-management.service';

@Module({
  controllers: [AdvancedComplianceManagementController],
  providers: [AdvancedComplianceManagementService],
  exports: [AdvancedComplianceManagementService],
})
export class AdvancedComplianceManagementModule {}
