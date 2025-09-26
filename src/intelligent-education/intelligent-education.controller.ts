import { Controller, Get } from '@nestjs/common';
import { IntelligentEducationService } from './intelligent-education.service';
import { Fortune500EducationConfig } from '../types/fortune500-types';

@Controller('intelligent-education')
export class IntelligentEducationController {
  constructor(private readonly svc: IntelligentEducationService) {}

  @Get('health')
  health(): Fortune500EducationConfig {
    return this.svc.health();
  }
}
