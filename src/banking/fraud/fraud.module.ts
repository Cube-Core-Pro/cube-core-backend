// path: src/banking/fraud/fraud.module.ts
// purpose: Fraud Detection Module - Module configuration for fraud detection
// dependencies: NestJS, PrismaModule, FraudService, FraudController

import { Module } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FraudController],
  providers: [FraudService],
  exports: [FraudService]
})
export class FraudModule {}