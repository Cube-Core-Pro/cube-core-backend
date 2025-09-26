import { Module } from '@nestjs/common';
import { DigitalAssetManagementController } from './digital-asset-management.controller';
import { DigitalAssetManagementService } from './digital-asset-management.service';

@Module({
  controllers: [DigitalAssetManagementController],
  providers: [DigitalAssetManagementService],
  exports: [DigitalAssetManagementService],
})
export class DigitalAssetManagementModule {}
