// path: backend/src/enterprise-webmail/enterprise-webmail.module.ts
// purpose: Module for Enterprise WebMail functionality
// dependencies: @nestjs/common, prisma, auth

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailController } from './controllers/email.controller';
import { EmailService } from './services/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService]
})
export class EnterpriseWebmailModule {}