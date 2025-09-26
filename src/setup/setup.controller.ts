import { Controller, Get } from '@nestjs/common';
import { SetupService } from './setup.service';
import { Fortune500SetupConfig } from '../types/fortune500-types';

@Controller('setup')
export class SetupController {
  constructor(private readonly svc: SetupService) {}

  @Get('health')
  health(): Fortune500SetupConfig {
    return this.svc.health();
  }
}
