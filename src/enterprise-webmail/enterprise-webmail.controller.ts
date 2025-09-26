import { Controller, Get } from '@nestjs/common';
import { EnterpriseWebmailService } from './enterprise-webmail.service';

@Controller('enterprise-webmail')
export class EnterpriseWebmailController {
  constructor(private readonly svc: EnterpriseWebmailService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
