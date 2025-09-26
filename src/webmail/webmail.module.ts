// path: src/webmail/webmail.module.ts
// purpose: Enterprise WebMail module - basic implementation
// dependencies: NestJS, Prisma

import { Module } from '@nestjs/common';
import { WebmailController } from './webmail.controller';
import { WebmailService } from './webmail.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WebmailController],
  providers: [WebmailService],
  exports: [WebmailService],
})
export class WebmailModule {}
