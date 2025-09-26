// path: src/banking/accounting/accounting.module.ts
// purpose: Banking Accounting Module - Module configuration for accounting management
// dependencies: NestJS, PrismaModule, AccountingService, AccountingController

import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService]
})
export class AccountingModule {}