import { Controller, Get } from '@nestjs/common';
import { AiModuleGeneratorService } from './ai-module-generator.service';
import { Fortune500AIModuleGeneratorConfig } from '../types/fortune500-types';

@Controller('ai-module-generator')
export class AiModuleGeneratorController {
  constructor(private readonly svc: AiModuleGeneratorService) {}

  @Get('health')
  health(): Fortune500AIModuleGeneratorConfig {
    return this.svc.health();
  }
}
