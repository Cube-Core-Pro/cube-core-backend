import { Controller, Get } from '@nestjs/common';
import { ProjectManagementService } from './project-management.service';
import { Fortune500ProjectConfig } from '../types/fortune500-types';

@Controller('project-management')
export class ProjectManagementController {
  constructor(private readonly svc: ProjectManagementService) {}

  @Get('health')
  health(): Fortune500ProjectConfig {
    return this.svc.health();
  }
}
