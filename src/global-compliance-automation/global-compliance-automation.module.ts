import { Module } from '@nestjs/common';
import { GlobalComplianceAutomationController } from './global-compliance-automation.controller';
import { GlobalComplianceAutomationService } from './global-compliance-automation.service';

@Module({
  controllers: [GlobalComplianceAutomationController],
  providers: [GlobalComplianceAutomationService],
  exports: [GlobalComplianceAutomationService],
})
export class GlobalComplianceAutomationModule {}
