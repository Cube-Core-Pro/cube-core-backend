import { Module } from '@nestjs/common';
import { ScmController } from './scm.controller';
import { ScmService } from './scm.service';
import { SupplierController } from './controllers/supplier.controller';
import { SupplierService } from './services/supplier.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScmController, SupplierController],
  providers: [ScmService, SupplierService],
  exports: [ScmService, SupplierService],
})
export class ScmModule {}
