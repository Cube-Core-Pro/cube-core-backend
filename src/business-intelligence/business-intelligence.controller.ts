import { Controller, Get } from '@nestjs/common';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { Fortune500BusinessIntelligenceConfig } from '../types/fortune500-types';

@Controller('business-intelligence')
export class BusinessIntelligenceController {
  constructor(private readonly svc: BusinessIntelligenceService) {}

  @Get('health')
  health(): Fortune500BusinessIntelligenceConfig {
    return this.svc.health();
  }
}
