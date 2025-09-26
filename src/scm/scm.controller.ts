import { Controller, Get } from '@nestjs/common';
import { ScmService } from './scm.service';
import { Fortune500ScmConfig } from '../types/fortune500-types';

@Controller('scm')
export class ScmController {
  constructor(private readonly svc: ScmService) {}

  @Get('health')
  health(): Fortune500ScmConfig {
    return this.svc.health();
  }
}
