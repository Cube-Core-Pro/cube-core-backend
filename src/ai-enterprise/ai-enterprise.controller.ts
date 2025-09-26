import { Controller, Get } from '@nestjs/common';
import { AiEnterpriseService } from './ai-enterprise.service';
import { Fortune500AIEnterpriseConfig } from '../types/fortune500-types';

@Controller('ai-enterprise')
export class AiEnterpriseController {
  constructor(private readonly svc: AiEnterpriseService) {}

  @Get('health')
  health(): Fortune500AIEnterpriseConfig {
    return this.svc.health();
  }
}
