import { Controller, Get } from '@nestjs/common';
import { AutonomousBusinessOpsService } from './autonomous-business-ops.service';
import { Fortune500AutonomousOpsConfig } from '../types/fortune500-types';

@Controller('autonomous-business-ops')
export class AutonomousBusinessOpsController {
  constructor(private readonly svc: AutonomousBusinessOpsService) {}

  @Get('health')
  health(): Fortune500AutonomousOpsConfig {
    return this.svc.health();
  }
}
