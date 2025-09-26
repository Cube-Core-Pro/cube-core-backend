// path: backend/src/modules/enterprise-email/enterprise-email.module.ts
// purpose: Enterprise Email Module with AI anti-spam, filters, signatures, and advanced features
// dependencies: @nestjs/common, prisma, redis, nodemailer, ai-antispam

import { Module } from '@nestjs/common';
import { EnterpriseEmailService } from './enterprise-email.service';
// import { EnterpriseEmailController } from './enterprise-email.controller';
import { EmailFilterService } from './services/email-filter.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailAccountService } from './services/email-account.service';
import { EmailSignatureService } from './services/email-signature.service';
import { AntiSpamService } from './services/anti-spam.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    // EnterpriseEmailController
  ],
  providers: [
    EnterpriseEmailService,
    EmailFilterService,
    EmailAttachmentService,
    EmailAccountService,
    EmailSignatureService,
    AntiSpamService,
  ],
  exports: [
    EnterpriseEmailService,
    EmailFilterService,
    EmailAttachmentService,
    EmailAccountService,
    EmailSignatureService,
    AntiSpamService,
  ],
})
export class EnterpriseEmailModule {}