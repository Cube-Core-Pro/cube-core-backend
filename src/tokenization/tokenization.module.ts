// path: backend/src/tokenization/tokenization.module.ts
// purpose: Enterprise Tokenization & Blockchain module with DeFi, NFT, and smart contracts
// dependencies: NestJS, Prisma, Redis, Web3, Ethers, IPFS, Queue processing

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TokenizationController } from './tokenization.controller';
import { TokenizationService } from './tokenization.service';
import { BlockchainService } from './services/blockchain.service';
import { SmartContractService } from './services/smart-contract.service';
import { NftService } from './services/nft.service';
import { WalletService } from './services/wallet.service';
import { TokenService } from './services/token.service';
import { DefiService } from './services/defi.service';
import { StakingService } from './services/staking.service';
import { CrossChainService } from './services/cross-chain.service';
import { IpfsService } from './services/ipfs.service';
import { TokenomicsService } from './services/tokenomics.service';
import { AuditService } from './services/audit.service';
import { ComplianceService } from '../banking/compliance/compliance.service';
import { TokenizationGateway } from './tokenization.gateway';

// Queue Processors
import { BlockchainProcessor } from './processors/blockchain.processor';
import { TokenProcessor } from './processors/token.processor';
import { NftProcessor } from './processors/nft.processor';
import { StakingProcessor } from './processors/staking.processor';

@Module({
  imports: [
    // Queue Management for blockchain operations
    BullModule.registerQueue(
      { name: 'blockchain-transactions' },
      { name: 'token-operations' },
      { name: 'nft-operations' },
      { name: 'staking-operations' },
      { name: 'defi-operations' },
      { name: 'cross-chain-operations' },
    ),
  ],
  controllers: [TokenizationController],
  providers: [
    // Core Services
    TokenizationService,
    BlockchainService,
    SmartContractService,
    NftService,
    WalletService,
    TokenService,
    DefiService,
    StakingService,
    CrossChainService,
    IpfsService,
    TokenomicsService,
    AuditService,
    ComplianceService,

    // Real-time Gateway
    TokenizationGateway,

    // Queue Processors
    BlockchainProcessor,
    TokenProcessor,
    NftProcessor,
    StakingProcessor,
  ],
  exports: [
    TokenizationService,
    BlockchainService,
    SmartContractService,
    NftService,
    WalletService,
    TokenService,
    DefiService,
    StakingService,
    CrossChainService,
  ],
})
export class TokenizationModule {}
