import { Controller, Get } from '@nestjs/common';
import { AdvancedSupplyChainManagementService } from './advanced-supply-chain-management.service';
import { Fortune500SupplyChainConfig } from '../types/fortune500-types';

@Controller('advanced-supply-chain-management')
export class AdvancedSupplyChainManagementController {
  constructor(private readonly svc: AdvancedSupplyChainManagementService) {}

  @Get('health')
  health(): Fortune500SupplyChainConfig {
    return this.svc.health();
  }
}
