import { Controller, Get } from '@nestjs/common';
import { MarketingAutomationSocialService } from './marketing-automation-social.service';
import { Fortune500MarketingConfig } from '../types/fortune500-types';

@Controller('marketing-automation-social')
export class MarketingAutomationSocialController {
  constructor(private readonly svc: MarketingAutomationSocialService) {}

  @Get('health')
  health(): Fortune500MarketingConfig {
    return this.svc.health();
  }
}
