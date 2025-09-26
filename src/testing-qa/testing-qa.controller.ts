import { Controller, Get } from '@nestjs/common';
import { TestingQaService } from './testing-qa.service';
import { Fortune500QaConfig } from '../types/fortune500-types';

@Controller('testing-qa')
export class TestingQaController {
  constructor(private readonly svc: TestingQaService) {}

  @Get('health')
  health(): Fortune500QaConfig {
    return this.svc.health();
  }
}
