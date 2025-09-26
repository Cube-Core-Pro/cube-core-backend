import { Controller, Get } from '@nestjs/common';
import { AiModulesService } from './ai-modules.service';
import { Fortune500AIModulesConfig } from '../types/fortune500-types';

@Controller('ai-modules')
export class AiModulesController {
  constructor(private readonly svc: AiModulesService) {}

  @Get('health')
  health(): Fortune500AIModulesConfig {
    return this.svc.health();
  }
}
