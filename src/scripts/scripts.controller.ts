import { Controller, Get } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { Fortune500ScriptsConfig } from '../types/fortune500-types';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly svc: ScriptsService) {}

  @Get('health')
  health(): Fortune500ScriptsConfig {
    return this.svc.health();
  }
}
