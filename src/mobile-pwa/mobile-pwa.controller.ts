import { Controller, Get } from '@nestjs/common';
import { MobilePwaService } from './mobile-pwa.service';
import { Fortune500MobileConfig } from '../types/fortune500-types';

@Controller('mobile-pwa')
export class MobilePwaController {
  constructor(private readonly svc: MobilePwaService) {}

  @Get('health')
  health(): Fortune500MobileConfig {
    return this.svc.health();
  }
}
