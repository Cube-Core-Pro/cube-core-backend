import { Controller, Get } from '@nestjs/common';
import { DevopsDeploymentService } from './devops-deployment.service';

@Controller('devops-deployment')
export class DevopsDeploymentController {
  constructor(private readonly svc: DevopsDeploymentService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
