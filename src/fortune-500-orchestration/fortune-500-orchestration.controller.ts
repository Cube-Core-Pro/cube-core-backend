import { Controller, Get } from '@nestjs/common';
import { Fortune500OrchestrationService } from './fortune-500-orchestration.service';

@Controller('fortune-500-orchestration')
export class Fortune500OrchestrationController {
  constructor(
    private readonly orchestrationService: Fortune500OrchestrationService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    return this.orchestrationService.getOrchestrationDashboard();
  }
}
