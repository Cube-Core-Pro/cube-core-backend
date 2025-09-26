import { Module } from '@nestjs/common';
import { TokenizationBlockchainController } from './tokenization-blockchain.controller';
import { TokenizationBlockchainService } from './tokenization-blockchain.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Fortune 500 Blockchain & Tokenization Suite
import {
  EnterpriseBlockchainService,
  DigitalAssetTokenizationService,
  SmartContractAutomationService,
  CentralBankDigitalCurrencyService,
  NFTEnterpriseService,
  BlockchainComplianceService,
  CryptographicSecurityService,
  DistributedLedgerService,
  CrossChainInteroperabilityService,
  BlockchainAnalyticsService,
  DecentralizedIdentityService,
  CorporateTokenEconomyService
} from './services';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [TokenizationBlockchainController],
  providers: [
    TokenizationBlockchainService,
    // Fortune 500 Blockchain Platform
    EnterpriseBlockchainService,
    DigitalAssetTokenizationService,
    SmartContractAutomationService,
    CentralBankDigitalCurrencyService,
    NFTEnterpriseService,
    BlockchainComplianceService,
    CryptographicSecurityService,
    DistributedLedgerService,
    CrossChainInteroperabilityService,
    BlockchainAnalyticsService,
    DecentralizedIdentityService,
    CorporateTokenEconomyService,
  ],
  exports: [
    TokenizationBlockchainService,
    EnterpriseBlockchainService,
    DigitalAssetTokenizationService,
    SmartContractAutomationService,
    CentralBankDigitalCurrencyService,
    NFTEnterpriseService,
    BlockchainComplianceService,
    CryptographicSecurityService,
    DistributedLedgerService,
    CrossChainInteroperabilityService,
    BlockchainAnalyticsService,
    DecentralizedIdentityService,
    CorporateTokenEconomyService,
  ],
})
export class TokenizationBlockchainModule {}
