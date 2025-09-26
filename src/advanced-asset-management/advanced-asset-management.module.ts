import { Module } from '@nestjs/common';
import { AdvancedAssetManagementController } from './advanced-asset-management.controller';
import { AdvancedAssetManagementService } from './advanced-asset-management.service';

@Module({
  controllers: [AdvancedAssetManagementController],
  providers: [AdvancedAssetManagementService],
  exports: [AdvancedAssetManagementService],
})
export class AdvancedAssetManagementModule {}
