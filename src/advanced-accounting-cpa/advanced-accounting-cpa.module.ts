import { Module } from '@nestjs/common';
import { AdvancedAccountingCpaController } from './advanced-accounting-cpa.controller';
import { AdvancedAccountingCpaService } from './advanced-accounting-cpa.service';

@Module({
  controllers: [AdvancedAccountingCpaController],
  providers: [AdvancedAccountingCpaService],
  exports: [AdvancedAccountingCpaService],
})
export class AdvancedAccountingCpaModule {}
