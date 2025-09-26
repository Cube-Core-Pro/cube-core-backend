import { Module } from '@nestjs/common';
import { AdvancedInventoryManagementController } from './advanced-inventory-management.controller';
import { AdvancedInventoryManagementService } from './advanced-inventory-management.service';

@Module({
  controllers: [AdvancedInventoryManagementController],
  providers: [AdvancedInventoryManagementService],
  exports: [AdvancedInventoryManagementService],
})
export class AdvancedInventoryManagementModule {}
