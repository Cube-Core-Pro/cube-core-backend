import { Controller, Get } from '@nestjs/common';
import { TelemedicineHealthtechService } from './telemedicine-healthtech.service';
import { Fortune500HealthcareConfig } from '../types/fortune500-types';

@Controller('telemedicine-healthtech')
export class TelemedicineHealthtechController {
  constructor(private readonly svc: TelemedicineHealthtechService) {}

  @Get('health')
  health(): Fortune500HealthcareConfig {
    return this.svc.health();
  }
}
