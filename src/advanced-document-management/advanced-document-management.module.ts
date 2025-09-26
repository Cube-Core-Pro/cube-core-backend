import { Module } from '@nestjs/common';
import { AdvancedDocumentManagementController } from './advanced-document-management.controller';
import { AdvancedDocumentManagementService } from './advanced-document-management.service';

@Module({
  controllers: [AdvancedDocumentManagementController],
  providers: [AdvancedDocumentManagementService],
  exports: [AdvancedDocumentManagementService],
})
export class AdvancedDocumentManagementModule {}
