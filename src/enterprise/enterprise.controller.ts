import { Controller, Get } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly svc: EnterpriseService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
