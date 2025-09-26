import { Module } from '@nestjs/common';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { UnitService } from './services/unit.service';
import { TreezorService } from './services/treezor.service';
import { BankingProviderRegistry } from './services/provider-registry.service';

@Module({
  controllers: [BankingController],
  providers: [BankingService, UnitService, TreezorService, BankingProviderRegistry],
  exports: [BankingService, UnitService, TreezorService, BankingProviderRegistry],
})
export class BankingModule {}
