// path: backend/src/tokenization/tokenization.service.ts
// purpose: Main orchestration service for tokenization and blockchain operations
// dependencies: Prisma, Redis, Web3, Queue management, Multi-chain support

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BlockchainService, BlockchainMarketAsset } from './services/blockchain.service';
import { SmartContractService } from './services/smart-contract.service';
import { NftService } from './services/nft.service';
import { WalletService } from './services/wallet.service';
import { TokenService } from './services/token.service';
import { DefiService } from './services/defi.service';
import { StakingService } from './services/staking.service';
import { CrossChainService } from './services/cross-chain.service';
import { TokenomicsService } from './services/tokenomics.service';
import { AuditService } from './services/audit.service';
import { ComplianceService } from '../banking/compliance/compliance.service';
import type { TokenizationWallet } from './services/wallet.service';
import { Fortune500TokenizationConfig } from '../types/fortune500-types';
import {
  AlertSummary,
  MarketAssetSummary,
  PortfolioBreakdown,
  PortfolioPerformance,
  YieldApySummary,
  TokenizationDashboard,
  TransactionSummary,
  StakingPositionSummary,
  NftPortfolioSummary,
  DefiPositionSummary,
  StakingRequest,
  BridgeRequest,
  TransactionHistoryOptions,
} from './types/tokenization.types';

export interface TokenCreationRequest {
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  description?: string;
  logoUrl?: string;
  website?: string;
  whitepaper?: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC1155' | 'BEP20' | 'SPL';
  blockchain: string;
  features: {
    mintable?: boolean;
    burnable?: boolean;
    pausable?: boolean;
    upgradeable?: boolean;
    governance?: boolean;
    staking?: boolean;
  };
  distribution: {
    publicSale: number;
    privateSale: number;
    team: number;
    advisors: number;
    treasury: number;
    liquidity: number;
    marketing: number;
    development: number;
  };
  vestingSchedule?: {
    cliff: number; // months
    duration: number; // months
    tge: number; // percentage at TGE
  };
}

export interface NftCreationRequest {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
  }>;
  collection?: string;
  royalty?: {
    recipient: string;
    percentage: number;
  };
  blockchain: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TokenizationService {
  private readonly logger = new Logger(TokenizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly blockchainService: BlockchainService,
    private readonly smartContractService: SmartContractService,
    private readonly nftService: NftService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    private readonly defiService: DefiService,
    private readonly stakingService: StakingService,
    private readonly crossChainService: CrossChainService,
    private readonly tokenomicsService: TokenomicsService,
    private readonly auditService: AuditService,
    private readonly complianceService: ComplianceService,
    @InjectQueue('blockchain-transactions') private blockchainQueue: Queue,
    @InjectQueue('token-operations') private tokenQueue: Queue,
    @InjectQueue('nft-operations') private nftQueue: Queue,
    @InjectQueue('staking-operations') private stakingQueue: Queue,
    @InjectQueue('defi-operations') private defiQueue: Queue,
  ) {}

  async getDashboard(tenantId: string, userId: string): Promise<TokenizationDashboard> {
    try {
      const cacheKey = `tokenization:dashboard:${tenantId}:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as TokenizationDashboard;
      }

      const wallets = await this.walletService.getUserWallets(tenantId, userId);

      const [
        basePortfolio,
        recentTransactions,
        rawStaking,
        nftData,
        rawDefi,
        marketData,
        alerts,
        performance,
      ] = await Promise.all([
        this.calculatePortfolioValue(tenantId, userId, wallets),
        this.getRecentTransactions(tenantId, userId, 10),
        this.stakingService.getActivePositions(tenantId, userId),
        this.nftService.getUserNfts(tenantId, userId, { limit: 6 }),
        this.defiService.getUserPositions(tenantId, userId),
        this.getMarketData(),
        this.getAlerts(tenantId, userId),
        this.calculatePerformance(tenantId, userId),
      ]);

      const activeStaking = this.mapStakingPositions(rawStaking);
      const nftCollection = this.mapNftCollections(nftData?.nfts ?? []);
      const defiPositions = this.mapDefiPositions(rawDefi);
      const portfolioValue = this.hydratePortfolioBreakdown(
        basePortfolio,
        activeStaking,
        nftCollection,
        defiPositions,
      );
      const yieldApy = this.calculateYieldApy(activeStaking, defiPositions);

      const dashboard: TokenizationDashboard = {
        portfolioValue,
        recentTransactions,
        activeStaking,
        nftCollection,
        defiPositions,
        marketData,
        alerts,
        performance,
        yieldApy,
      };

      await this.persistDashboardSnapshot(tenantId, userId, dashboard);

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(dashboard));

      return dashboard;
    } catch (error) {
      this.logger.error('Error getting tokenization dashboard', error);
      throw error;
    }
  }

  async createToken(tenantId: string, userId: string, request: TokenCreationRequest) {
    try {
      // Validate request
      await this.validateTokenCreation(tenantId, userId, request);

      // Check compliance
      await this.complianceService.validateTokenCreation(tenantId, request);

      // Create token record
      const token = await this.prisma.blockchainToken.create({
        data: {
          tenantId,
          createdBy: userId,
          name: request.name,
          symbol: request.symbol,
          totalSupply: request.totalSupply,
          decimals: request.decimals,
          description: request.description,
          logoUrl: request.logoUrl,
          website: request.website,
          whitepaper: request.whitepaper,
          tokenType: request.tokenType,
          blockchain: request.blockchain,
          features: request.features as Prisma.InputJsonValue,
          distribution: request.distribution as Prisma.InputJsonValue,
          vestingSchedule: request.vestingSchedule as Prisma.InputJsonValue,
          status: 'PENDING',
        },
      });

      // Queue smart contract deployment
      await this.tokenQueue.add('deploy-token', {
        tenantId,
        userId,
        tokenId: token.id,
        request,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        delay: 5000,
      });

      // Log audit event
      await this.auditService.logTokenEvent(tenantId, userId, 'TOKEN_CREATION_INITIATED', {
        tokenId: token.id,
        symbol: request.symbol,
        blockchain: request.blockchain,
      });

      return {
        tokenId: token.id,
        status: 'PENDING',
        message: 'Token creation initiated. Deployment in progress.',
        estimatedTime: '5-10 minutes',
      };
    } catch (error) {
      this.logger.error('Error creating token', error);
      throw error;
    }
  }

  async createNft(tenantId: string, userId: string, request: NftCreationRequest) {
    try {
      // Validate request
      await this.validateNftCreation(tenantId, userId, request);

      // Upload metadata to IPFS
      const metadataUri = await this.nftService.uploadMetadata(request);

      const metadataPayload: Prisma.JsonObject = { metadataUri };
      if (request.metadata && typeof request.metadata === 'object' && !Array.isArray(request.metadata)) {
        Object.assign(metadataPayload, request.metadata as Record<string, unknown>);
      }
      if (request.royalty?.recipient) {
        metadataPayload.royaltyRecipient = request.royalty.recipient;
      }

      const royaltyPercentage =
        typeof request.royalty === 'number'
          ? request.royalty
          : request.royalty?.percentage ?? 0;

      // Create NFT record
      const nft = await this.prisma.nft.create({
        data: {
          tenantId,
          collectionId: request.collection,
          name: request.name,
          description: request.description,
          image: request.image,
          attributes: request.attributes as unknown as Prisma.JsonArray,
          metadata: metadataPayload,
          blockchain: request.blockchain,
          owner: userId,
          royalty: royaltyPercentage,
          contractAddress: 'PENDING', // Will be updated when minting completes
          status: 'PENDING',
        },
      });

      // Queue NFT minting
      await this.nftQueue.add('mint-nft', {
        tenantId,
        userId,
        nftId: nft.id,
        metadataUri,
        request,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        delay: 3000,
      });

      // Log audit event
      await this.auditService.logNftEvent(tenantId, userId, 'NFT_CREATION_INITIATED', {
        nftId: nft.id,
        name: request.name,
        blockchain: request.blockchain,
      });

      return {
        nftId: nft.id,
        status: 'PENDING',
        metadataUri,
        message: 'NFT creation initiated. Minting in progress.',
        estimatedTime: '2-5 minutes',
      };
    } catch (error) {
      this.logger.error('Error creating NFT', error);
      throw error;
    }
  }

  async stakeTokens(tenantId: string, userId: string, stakeRequest: StakingRequest) {
    try {
      // Validate staking request
      await this.validateStakingRequest(tenantId, userId, stakeRequest);

      // Check token balance
      const balance = await this.tokenService.getTokenBalance(
        tenantId,
        userId,
        stakeRequest.tokenId,
      );

      if (parseFloat(balance) < parseFloat(stakeRequest.amount)) {
        throw new BadRequestException('Insufficient token balance');
      }

      // Create staking position
      const stakingPosition = await this.stakingService.createPosition(
        tenantId,
        userId,
        stakeRequest,
      );

      // Queue staking transaction
      await this.stakingQueue.add('stake-tokens', {
        tenantId,
        userId,
        positionId: stakingPosition.id,
        stakeRequest,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        delay: 2000,
      });

      return {
        positionId: stakingPosition.id,
        status: 'PENDING',
        message: 'Staking transaction initiated.',
        estimatedRewards: await this.stakingService.calculateRewards(
          stakeRequest.amount,
          stakeRequest.duration,
          stakeRequest.stakingPoolId,
        ),
      };
    } catch (error) {
      this.logger.error('Error staking tokens', error);
      throw error;
    }
  }

  async bridgeTokens(tenantId: string, userId: string, bridgeRequest: BridgeRequest) {
    try {
      // Validate bridge request
      await this.validateBridgeRequest(tenantId, userId, bridgeRequest);

      // Check if bridge is supported
      const bridgeSupported = await this.crossChainService.isBridgeSupported(
        bridgeRequest.fromChain,
        bridgeRequest.toChain,
      );

      if (!bridgeSupported) {
        throw new BadRequestException('Bridge not supported between these chains');
      }

      // Create bridge transaction
      const bridgeTransaction = await this.crossChainService.createBridgeTransaction(
        tenantId,
        userId,
        bridgeRequest,
      );

      // Queue bridge operation
      await this.blockchainQueue.add('bridge-tokens', {
        tenantId,
        userId,
        transactionId: bridgeTransaction.id,
        bridgeRequest,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        delay: 10000,
      });

      return {
        transactionId: bridgeTransaction.id,
        status: 'PENDING',
        message: 'Cross-chain bridge initiated.',
        estimatedTime: '10-30 minutes',
        fees: await this.crossChainService.calculateBridgeFees(bridgeRequest),
      };
    } catch (error) {
      this.logger.error('Error bridging tokens', error);
      throw error;
    }
  }

  async getTokenomics(tenantId: string, tokenId: string) {
    try {
      const token = await this.prisma.blockchainToken.findFirst({
        where: { id: tokenId, tenantId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 100,
          },
          stakingPools: true,
          vestingSchedules: true,
        },
      });

      if (!token) {
        throw new NotFoundException('Token not found');
      }

      return this.tokenomicsService.generateTokenomicsReport(token);
    } catch (error) {
      this.logger.error('Error getting tokenomics', error);
      throw error;
    }
  }

  async getMarketData(): Promise<MarketAssetSummary[]> {
    try {
      const cacheKey = 'tokenization:market-data';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as MarketAssetSummary[];
      }

      // Fetch market data from multiple sources
      const marketAssets = await this.blockchainService.getMarketData();

      const summaries = marketAssets.map((asset: BlockchainMarketAsset) => ({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        price: asset.price,
        change24h: asset.change24h,
        volume24h: asset.volume24h,
        marketCap: asset.marketCap,
      } satisfies MarketAssetSummary));

      // Cache for 1 minute
      await this.redis.setex(cacheKey, 60, JSON.stringify(summaries));

      return summaries;
    } catch (error) {
      this.logger.error('Error getting market data', error);
      return [];
    }
  }

  async getTransactionHistory(
    tenantId: string,
    userId: string,
    options: TransactionHistoryOptions = {},
  ) {
    try {
      const {
        page = 1,
        limit = 50,
        type,
        blockchain,
        status,
        dateFrom,
        dateTo,
      } = options;

      const where: Prisma.BlockchainTransactionWhereInput = {
        tenantId,
        userId,
      };

      if (type) {
        where.type = type;
      }
      if (blockchain) {
        where.blockchain = blockchain;
      }
      if (status) {
        where.status = status;
      }
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = dateFrom;
        }
        if (dateTo) {
          where.createdAt.lte = dateTo;
        }
      }

      const [transactions, total] = await Promise.all([
        this.prisma.blockchainTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            token: true,
            nft: true,
          },
        }),
        this.prisma.blockchainTransaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error getting transaction history', error);
      throw error;
    }
  }

  // Private helper methods
  private async calculatePortfolioValue(
    tenantId: string,
    userId: string,
    wallets: TokenizationWallet[],
  ): Promise<PortfolioBreakdown> {
    void tenantId;
    void userId;

    if (!wallets.length) {
      return { total: 0, tokens: 0, nfts: 0, staking: 0, defi: 0 };
    }

    try {
      const walletSnapshots = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            return await this.walletService.getWalletValue(wallet.id);
          } catch (error) {
            this.logger.warn(`Failed to load wallet value`, {
              walletId: wallet.id,
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        }),
      );

      const aggregated = walletSnapshots.reduce<PortfolioBreakdown>((acc, snapshot) => {
        if (!snapshot) {
          return acc;
        }

        return {
          total: acc.total + this.toNumber(snapshot.total),
          tokens: acc.tokens + this.toNumber(snapshot.tokens),
          nfts: acc.nfts + this.toNumber(snapshot.nfts),
          staking: acc.staking + this.toNumber(snapshot.staking),
          defi: acc.defi + this.toNumber(snapshot.defi),
        };
      }, { total: 0, tokens: 0, nfts: 0, staking: 0, defi: 0 });

      return this.roundBreakdown(aggregated);
    } catch (error) {
      this.logger.error('Error calculating portfolio value', error);
      return { total: 0, tokens: 0, nfts: 0, staking: 0, defi: 0 };
    }
  }

  private async getRecentTransactions(
    tenantId: string,
    userId: string,
    limit: number,
  ): Promise<TransactionSummary[]> {
    try {
      const transactions = await this.prisma.blockchainTransaction.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          token: { select: { name: true, symbol: true, logoUrl: true } },
          nft: { select: { name: true, image: true } },
        },
      });
      return transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        blockchain: tx.blockchain,
        amount: tx.amount ?? undefined,
        tokenSymbol: tx.token?.symbol,
        createdAt: tx.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error getting recent transactions', error);
      return [];
    }
  }

  private async getAlerts(tenantId: string, userId: string): Promise<AlertSummary[]> {
    try {
      const alerts = await this.prisma.tokenizationAlert.findMany({
        where: {
          tenantId,
          userId,
          read: false,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      return alerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        severity: 'medium',
        createdAt: alert.createdAt,
        isRead: alert.read,
      }));
    } catch (error) {
      this.logger.error('Error getting alerts', error);
      return [];
    }
  }

  private async calculatePerformance(
    _tenantId: string,
    _userId: string,
  ): Promise<PortfolioPerformance> {
    try {
      // This would calculate portfolio performance over different time periods
      // For now, returning mock data
      return {
        daily: 2.5,
        weekly: 8.3,
        monthly: 15.7,
        yearly: 45.2,
      } satisfies PortfolioPerformance;
    } catch (error) {
      this.logger.error('Error calculating performance', error);
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0 } satisfies PortfolioPerformance;
    }
  }

  private mapStakingPositions(
    rawPositions: Awaited<ReturnType<StakingService['getActivePositions']>>,
  ): StakingPositionSummary[] {
    return rawPositions.map((pos) => ({
      id: pos.id,
      protocol: pos.pool?.name ?? pos.token?.symbol ?? 'unknown',
      tokenSymbol: pos.token?.symbol ?? 'unknown',
      stakedAmount: pos.amount ?? '0',
      rewardsAccrued: pos.rewardsAccrued ?? pos.pool?.rewardToken ?? '0',
      apy: typeof pos.pool?.apy === 'number' ? pos.pool?.apy : undefined,
    }));
  }

  private mapNftCollections(
    nfts: Awaited<ReturnType<NftService['getUserNfts']>>['nfts'],
  ): NftPortfolioSummary[] {
    if (!nfts.length) {
      return [];
    }

    const collections = new Map<string, { sample: (typeof nfts)[number]; count: number }>();
    for (const nft of nfts) {
      const key = nft.collectionId ?? 'uncategorized';
      const record = collections.get(key);
      if (record) {
        record.count += 1;
      } else {
        collections.set(key, { sample: nft, count: 1 });
      }
    }

    return Array.from(collections.entries()).map(([collectionId, { sample, count }]) => ({
      id: collectionId,
      name: sample.collection?.name ?? sample.name ?? 'Uncategorized Collection',
      blockchain: sample.blockchain ?? 'unknown',
      items: count,
      floorPrice: sample.marketData?.floorPrice !== undefined
        ? this.normalizeNumber(sample.marketData.floorPrice)
        : undefined,
    }));
  }

  private mapDefiPositions(
    rawPositions: Awaited<ReturnType<DefiService['getUserPositions']>>,
  ): DefiPositionSummary[] {
    return rawPositions.map((pos) => ({
      id: pos.id,
      protocol: pos.protocol ?? pos.blockchain ?? 'unknown',
      positionType: pos.status ?? 'active',
      value: pos.amount ?? '0',
      apy: pos.apy !== undefined ? this.normalizeNumber(this.toNumber(pos.apy)) : undefined,
    }));
  }

  private hydratePortfolioBreakdown(
    base: PortfolioBreakdown,
    staking: StakingPositionSummary[],
    nft: NftPortfolioSummary[],
    defi: DefiPositionSummary[],
  ): PortfolioBreakdown {
    const stakingValue = staking.reduce((sum, position) => sum + this.toNumber(position.stakedAmount), 0);
    const defiValue = defi.reduce((sum, position) => sum + this.toNumber(position.value), 0);
    const nftValue = nft.reduce((sum, entry) => sum + this.toNumber(entry.floorPrice) * entry.items, 0);

    const hydrated: PortfolioBreakdown = {
      tokens: this.normalizeNumber(base.tokens),
      nfts: Math.max(this.normalizeNumber(base.nfts), this.normalizeNumber(nftValue)),
      staking: Math.max(this.normalizeNumber(base.staking), this.normalizeNumber(stakingValue)),
      defi: Math.max(this.normalizeNumber(base.defi), this.normalizeNumber(defiValue)),
      total: 0,
    };

    hydrated.tokens = Math.max(hydrated.tokens, 0);
    hydrated.nfts = Math.max(hydrated.nfts, 0);
    hydrated.staking = Math.max(hydrated.staking, 0);
    hydrated.defi = Math.max(hydrated.defi, 0);

    const sum = hydrated.tokens + hydrated.nfts + hydrated.staking + hydrated.defi;
    const baseTotal = this.normalizeNumber(base.total);
    if (baseTotal > sum) {
      const inferredTokens = this.normalizeNumber(
        baseTotal - (hydrated.nfts + hydrated.staking + hydrated.defi),
      );
      hydrated.tokens = Math.max(hydrated.tokens, inferredTokens);
    }

    hydrated.total = this.normalizeNumber(
      hydrated.tokens + hydrated.nfts + hydrated.staking + hydrated.defi,
    );

    return hydrated;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return 0;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private normalizeNumber(value: unknown): number {
    const numeric = this.toNumber(value);
    if (numeric === 0) {
      return 0;
    }
    return Math.round(numeric * 100) / 100;
  }

  private calculateYieldApy(
    staking: StakingPositionSummary[],
    defi: DefiPositionSummary[],
  ): YieldApySummary | undefined {
    const stakingTotals = staking.reduce(
      (acc, position) => {
        if (typeof position.apy !== 'number') {
          return acc;
        }

        const amount = this.toNumber(position.stakedAmount);
        if (amount <= 0) {
          return acc;
        }

        acc.total += amount;
        acc.weighted += amount * position.apy;
        return acc;
      },
      { total: 0, weighted: 0 },
    );

    const defiTotals = defi.reduce(
      (acc, position) => {
        if (typeof position.apy !== 'number') {
          return acc;
        }

        const value = this.toNumber(position.value);
        if (value <= 0) {
          return acc;
        }

        acc.total += value;
        acc.weighted += value * position.apy;
        return acc;
      },
      { total: 0, weighted: 0 },
    );

    const summary: YieldApySummary = {};

    if (stakingTotals.total > 0) {
      summary.staking = this.normalizeNumber(stakingTotals.weighted / stakingTotals.total);
    }

    if (defiTotals.total > 0) {
      summary.defi = this.normalizeNumber(defiTotals.weighted / defiTotals.total);
    }

    const blendedDenominator = stakingTotals.total + defiTotals.total;
    const blendedNumerator = stakingTotals.weighted + defiTotals.weighted;

    if (blendedDenominator > 0 && blendedNumerator >= 0) {
      summary.blended = this.normalizeNumber(blendedNumerator / blendedDenominator);
    } else if (summary.staking !== undefined || summary.defi !== undefined) {
      const single = summary.staking ?? summary.defi ?? 0;
      summary.blended = this.normalizeNumber(single);
    }

    return Object.keys(summary).length ? summary : undefined;
  }

  private async persistDashboardSnapshot(
    tenantId: string,
    userId: string,
    dashboard: TokenizationDashboard,
  ): Promise<void> {
    try {
      const snapshot = JSON.parse(JSON.stringify(dashboard)) as Prisma.JsonObject;

      await this.prisma.tokenizationDashboardSnapshot.create({
        data: {
          tenantId,
          userId,
          portfolioTotal: new Prisma.Decimal(this.normalizeNumber(dashboard.portfolioValue.total)),
          tokensValue: new Prisma.Decimal(this.normalizeNumber(dashboard.portfolioValue.tokens)),
          nftValue: new Prisma.Decimal(this.normalizeNumber(dashboard.portfolioValue.nfts)),
          stakingValue: new Prisma.Decimal(this.normalizeNumber(dashboard.portfolioValue.staking)),
          defiValue: new Prisma.Decimal(this.normalizeNumber(dashboard.portfolioValue.defi)),
          averageStakingApy: dashboard.yieldApy?.staking ?? null,
          averageDefiApy: dashboard.yieldApy?.defi ?? null,
          blendedYieldApy: dashboard.yieldApy?.blended ?? null,
          alertsCount: dashboard.alerts.length,
          performance: JSON.parse(JSON.stringify(dashboard.performance)) as Prisma.InputJsonValue,
          snapshot,
        },
      });
    } catch (error) {
      this.logger.error('Error persisting tokenization dashboard snapshot', error);
    }
  }

  private roundBreakdown(breakdown: PortfolioBreakdown): PortfolioBreakdown {
    return {
      total: this.normalizeNumber(breakdown.total),
      tokens: this.normalizeNumber(breakdown.tokens),
      nfts: this.normalizeNumber(breakdown.nfts),
      staking: this.normalizeNumber(breakdown.staking),
      defi: this.normalizeNumber(breakdown.defi),
    };
  }

  private async validateTokenCreation(tenantId: string, userId: string, request: TokenCreationRequest) {
    // Validate token parameters
    if (!request.name || !request.symbol || !request.totalSupply) {
      throw new BadRequestException('Missing required token parameters');
    }

    if (request.decimals < 0 || request.decimals > 18) {
      throw new BadRequestException('Invalid decimals value');
    }

    // Check if symbol already exists
    const existingToken = await this.prisma.blockchainToken.findFirst({
      where: {
        tenantId,
        symbol: request.symbol,
        blockchain: request.blockchain,
      },
    });

    if (existingToken) {
      throw new BadRequestException('Token symbol already exists on this blockchain');
    }

    // Validate distribution percentages
    const totalDistribution = Object.values(request.distribution).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalDistribution - 100) > 0.01) {
      throw new BadRequestException('Distribution percentages must sum to 100%');
    }
  }

  private async validateNftCreation(tenantId: string, userId: string, request: NftCreationRequest) {
    if (!request.name || !request.description || !request.image) {
      throw new BadRequestException('Missing required NFT parameters');
    }

    if (request.royalty && (request.royalty.percentage < 0 || request.royalty.percentage > 10)) {
      throw new BadRequestException('Royalty percentage must be between 0% and 10%');
    }
  }

  private async validateStakingRequest(
    tenantId: string,
    userId: string,
    request: StakingRequest,
  ) {
    if (!request.tokenId || !request.amount || !request.duration) {
      throw new BadRequestException('Missing required staking parameters');
    }

    if (parseFloat(request.amount) <= 0) {
      throw new BadRequestException('Staking amount must be positive');
    }

    if (request.duration < 1 || request.duration > 365) {
      throw new BadRequestException('Staking duration must be between 1 and 365 days');
    }
  }

  private async validateBridgeRequest(
    tenantId: string,
    userId: string,
    request: BridgeRequest,
  ) {
    if (!request.tokenId || !request.amount || !request.fromChain || !request.toChain) {
      throw new BadRequestException('Missing required bridge parameters');
    }

    if (request.fromChain === request.toChain) {
      throw new BadRequestException('Source and destination chains must be different');
    }

    if (parseFloat(request.amount) <= 0) {
      throw new BadRequestException('Bridge amount must be positive');
    }
  }
}
