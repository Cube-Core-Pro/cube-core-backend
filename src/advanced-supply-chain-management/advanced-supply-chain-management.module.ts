import { Module } from '@nestjs/common';
import { AdvancedSupplyChainManagementController } from './advanced-supply-chain-management.controller';
import { AdvancedSupplyChainManagementService } from './advanced-supply-chain-management.service';

@Module({
  controllers: [AdvancedSupplyChainManagementController],
  providers: [AdvancedSupplyChainManagementService],
  exports: [AdvancedSupplyChainManagementService],
})
export class AdvancedSupplyChainManagementModule {}
