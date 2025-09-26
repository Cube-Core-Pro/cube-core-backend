import { Controller, Get } from '@nestjs/common';
import { TestService } from './test.service';
import { Fortune500TestConfig } from '../types/fortune500-types';

@Controller('test')
export class TestController {
  constructor(private readonly svc: TestService) {}

  @Get('health')
  health(): Fortune500TestConfig {
    return this.svc.health();
  }
}
