import { Module } from '@nestjs/common';
import { PciDssComplianceController } from './pci-dss-compliance.controller';
import { PciDssComplianceService } from './pci-dss-compliance.service';

@Module({
  controllers: [PciDssComplianceController],
  providers: [PciDssComplianceService],
  exports: [PciDssComplianceService],
})
export class PciDssComplianceModule {}
