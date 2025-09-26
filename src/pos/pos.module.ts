// path: src/pos/pos.module.ts
// purpose: POS module configuration with all controllers and services
// dependencies: @nestjs/common, DatabaseModule, controllers, services

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PosController } from './pos.controller';
import { PosProductController } from './controllers/pos-product.controller';
import { PosTransactionController } from './controllers/pos-transaction.controller';
import { PosService } from './pos.service';
import { PosProductService } from './services/pos-product.service';
import { PosTransactionService } from './services/pos-transaction.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    PosController,
    PosProductController,
    PosTransactionController,
  ],
  providers: [
    PosService,
    PosProductService,
    PosTransactionService,
  ],
  exports: [
    PosService,
    PosProductService,
    PosTransactionService,
  ],
})
export class PosModule {}
