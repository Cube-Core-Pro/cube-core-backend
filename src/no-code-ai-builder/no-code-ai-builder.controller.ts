import { Controller, Get } from '@nestjs/common';
import { NoCodeAiBuilderService } from './no-code-ai-builder.service';
import { Fortune500NoCodeConfig } from '../types/fortune500-types';

@Controller('no-code-ai-builder')
export class NoCodeAiBuilderController {
  constructor(private readonly svc: NoCodeAiBuilderService) {}

  @Get('health')
  health(): Fortune500NoCodeConfig {
    return this.svc.health();
  }
}
