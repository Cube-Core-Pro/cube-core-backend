// path: backend/src/enterprise-office-suite/enterprise-office-suite.module.ts
// purpose: Module for Enterprise Office Suite functionality
// dependencies: @nestjs/common, prisma, auth

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentController } from './controllers/document.controller';
import { DocumentService } from './services/document.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService]
})
export class EnterpriseOfficeSuiteModule {}