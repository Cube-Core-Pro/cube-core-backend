import { Controller, Get } from '@nestjs/common';
import { AdvancedInventoryManagementService } from './advanced-inventory-management.service';
import { Fortune500InventoryConfig } from '../types/fortune500-types';

@Controller('advanced-inventory-management')
export class AdvancedInventoryManagementController {
  constructor(private readonly svc: AdvancedInventoryManagementService) {}

  @Get('health')
  health(): Fortune500InventoryConfig {
    return this.svc.health();
  }
}
