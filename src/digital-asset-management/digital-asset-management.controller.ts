import { Controller, Get } from '@nestjs/common';
import { DigitalAssetManagementService } from './digital-asset-management.service';

@Controller('digital-asset-management')
export class DigitalAssetManagementController {
  constructor(private readonly svc: DigitalAssetManagementService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
