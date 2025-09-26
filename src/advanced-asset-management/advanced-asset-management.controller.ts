import { Controller, Get } from '@nestjs/common';
import { AdvancedAssetManagementService } from './advanced-asset-management.service';
import { Fortune500AssetConfig } from '../types/fortune500-types';

@Controller('advanced-asset-management')
export class AdvancedAssetManagementController {
  constructor(private readonly svc: AdvancedAssetManagementService) {}

  @Get('health')
  health(): Fortune500AssetConfig {
    return this.svc.health();
  }
}
