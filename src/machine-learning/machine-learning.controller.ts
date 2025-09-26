import { Controller, Get } from '@nestjs/common';
import { MachineLearningService } from './machine-learning.service';
import { Fortune500MachineLearningConfig } from '../types/fortune500-types';

@Controller('machine-learning')
export class MachineLearningController {
  constructor(private readonly svc: MachineLearningService) {}

  @Get('health')
  health(): Fortune500MachineLearningConfig {
    return this.svc.health();
  }
}
