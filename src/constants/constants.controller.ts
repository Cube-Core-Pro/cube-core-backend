import { Controller, Get } from '@nestjs/common';
import { ConstantsService } from './constants.service';
import { Fortune500ConstantsConfig } from '../types/fortune500-types';

@Controller('constants')
export class ConstantsController {
  constructor(private readonly svc: ConstantsService) {}

  @Get('health')
  health(): Fortune500ConstantsConfig {
    return this.svc.health();
  }
}
