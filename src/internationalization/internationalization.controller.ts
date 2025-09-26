import { Controller, Get } from '@nestjs/common';
import { InternationalizationService } from './internationalization.service';
import { Fortune500InternationalizationConfig } from '../types/fortune500-types';

@Controller('internationalization')
export class InternationalizationController {
  constructor(private readonly svc: InternationalizationService) {}

  @Get('health')
  health(): Fortune500InternationalizationConfig {
    return this.svc.health();
  }
}
