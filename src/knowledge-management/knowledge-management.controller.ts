import { Controller, Get } from '@nestjs/common';
import { KnowledgeManagementService } from './knowledge-management.service';
import { Fortune500KnowledgeConfig } from '../types/fortune500-types';

@Controller('knowledge-management')
export class KnowledgeManagementController {
  constructor(private readonly svc: KnowledgeManagementService) {}

  @Get('health')
  health(): Fortune500KnowledgeConfig {
    return this.svc.health();
  }
}
