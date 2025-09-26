import { Controller, Get } from '@nestjs/common';
import { DocumentManagementService } from './document-management.service';

@Controller('document-management')
export class DocumentManagementController {
  constructor(private readonly svc: DocumentManagementService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
