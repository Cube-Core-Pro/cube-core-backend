// path: backend/src/modules/webmail/webmail.module.ts
// purpose: Enterprise WebMail module for email management and communication
// dependencies: NestJS, Prisma, IMAP/SMTP, Bull, Redis

import { Module } from '@nestjs/common';
import { WebmailController } from './webmail.controller';
import { WebmailService } from './webmail.service';
import { EmailService } from './services/email.service';
import { FolderService } from './services/folder.service';
import { TemplateService } from './services/template.service';
import { AttachmentService } from './services/attachment.service';
import { FilterService } from './services/filter.service';
import { EmailSecurityService } from './services/email-security.service';
import { EmailAnalyticsService } from './services/email-analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { EmailProcessingProcessor } from './processors/email-processing.processor';
import { EmailSecurityProcessor } from './processors/email-security.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'email-processing',
    }),
    BullModule.registerQueue({
      name: 'email-security',
    }),
  ],
  controllers: [WebmailController],
  providers: [
    WebmailService,
    EmailService,
    FolderService,
    TemplateService,
    AttachmentService,
    FilterService,
    EmailSecurityService,
    EmailAnalyticsService,
    EmailProcessingProcessor,
    EmailSecurityProcessor,
  ],
  exports: [
    WebmailService,
    EmailService,
    FolderService,
    TemplateService,
    AttachmentService,
    FilterService,
    EmailSecurityService,
    EmailAnalyticsService,
  ],
})
export class WebmailModule {}
