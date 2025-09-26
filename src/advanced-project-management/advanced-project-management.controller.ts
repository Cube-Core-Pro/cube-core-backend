import { Controller, Get } from '@nestjs/common';
import { AdvancedProjectManagementService } from './advanced-project-management.service';
import { Fortune500ProjectConfig } from '../types/fortune500-types';

@Controller('advanced-project-management')
export class AdvancedProjectManagementController {
  constructor(private readonly svc: AdvancedProjectManagementService) {}

  @Get('health')
  health(): Fortune500ProjectConfig {
    return this.svc.health();
  }
}
