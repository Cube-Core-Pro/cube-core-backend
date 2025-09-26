import { Controller, Get } from '@nestjs/common';
import { AssetManagementService } from './asset-management.service';
import { Fortune500AssetConfig } from '../types/fortune500-types';

@Controller('asset-management')
export class AssetManagementController {
  constructor(private readonly svc: AssetManagementService) {}

  @Get('health')
  health(): Fortune500AssetConfig {
    return this.svc.health();
  }
}
