import { Controller, Get } from '@nestjs/common';
import { QuantumComputingService } from './quantum-computing.service';
import { Fortune500QuantumConfig } from '../types/fortune500-types';

@Controller('quantum-computing')
export class QuantumComputingController {
  constructor(private readonly svc: QuantumComputingService) {}

  @Get('health')
  health(): Fortune500QuantumConfig {
    return this.svc.health();
  }
}
