import { Controller, Get } from '@nestjs/common';
import { RealTimeCommunicationService } from './real-time-communication.service';
import { Fortune500RealTimeCommunicationConfig } from '../types/fortune500-types';

@Controller('real-time-communication')
export class RealTimeCommunicationController {
  constructor(private readonly svc: RealTimeCommunicationService) {}

  @Get('health')
  health(): Fortune500RealTimeCommunicationConfig {
    return this.svc.health();
  }
}
