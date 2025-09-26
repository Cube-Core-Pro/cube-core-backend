// path: backend/src/modules/office/office.module.ts
// purpose: Office Suite module for document management and collaboration
// dependencies: NestJS, Prisma, Bull, Redis

import { Module } from '@nestjs/common';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';
import { DocumentService } from './services/document.service';
import { SpreadsheetService } from './services/spreadsheet.service';
import { PresentationService } from './services/presentation.service';
import { CollaborationService } from './services/collaboration.service';
import { TemplateService } from './services/template.service';
import { FolderService } from './services/folder.service';
import { ImportExportService } from './services/import-export.service';

// Advanced AI Services
import { AiDocumentAnalysisService } from './services/ai-document-analysis.service';
import { IntelligentCollaborationService } from './services/intelligent-collaboration.service';
import { SmartFormattingService } from './services/smart-formatting.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { FileStorageModule } from '../../storage/file-storage.module';
import { AuditModule } from '../../audit/audit.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    FileStorageModule,
    AuditModule,
    NotificationsModule,
    BullModule.registerQueue(
      {
        name: 'office-processing',
      },
      {
        name: 'import-export',
      },
      {
        name: 'ai-document-analysis',
      },
      {
        name: 'intelligent-collaboration',
      },
      {
        name: 'smart-formatting',
      },
    ),
  ],
  controllers: [OfficeController],
  providers: [
    // Core Services
    OfficeService,
    DocumentService,
    SpreadsheetService,
    PresentationService,
    CollaborationService,
    TemplateService,
    FolderService,
    ImportExportService,
    
    // Advanced AI Services
    AiDocumentAnalysisService,
    IntelligentCollaborationService,
    SmartFormattingService,
  ],
  exports: [
    OfficeService, 
    PresentationService,
    AiDocumentAnalysisService,
    IntelligentCollaborationService,
    SmartFormattingService,
  ],
})
export class OfficeModule {}
