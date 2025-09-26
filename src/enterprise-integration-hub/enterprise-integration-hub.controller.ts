import { Controller, Get } from '@nestjs/common';
import { EnterpriseIntegrationHubService } from './enterprise-integration-hub.service';

@Controller('enterprise-integration-hub')
export class EnterpriseIntegrationHubController {
  constructor(private readonly svc: EnterpriseIntegrationHubService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
