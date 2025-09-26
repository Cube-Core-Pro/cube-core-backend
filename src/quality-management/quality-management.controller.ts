import { Controller, Get } from '@nestjs/common';
import { QualityManagementService } from './quality-management.service';

@Controller('quality-management')
export class QualityManagementController {
  constructor(private readonly svc: QualityManagementService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
