import { Controller, Get } from '@nestjs/common';
import { AdvancedDocumentManagementService } from './advanced-document-management.service';
import { Fortune500DocumentConfig } from '../types/fortune500-types';

@Controller('advanced-document-management')
export class AdvancedDocumentManagementController {
  constructor(private readonly svc: AdvancedDocumentManagementService) {}

  @Get('health')
  health(): Fortune500DocumentConfig {
    return this.svc.health();
  }
}
