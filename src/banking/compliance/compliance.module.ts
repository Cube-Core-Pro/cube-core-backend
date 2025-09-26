// path: src/banking/compliance/compliance.module.ts
// purpose: Banking Compliance Module - Module configuration for compliance management
// dependencies: NestJS, PrismaModule, ComplianceService, ComplianceController

import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService]
})
export class ComplianceModule {}