// path: backend/src/tokenization/services/token.service.ts
// purpose: Token-centric orchestration helpers (mint/burn/analytics/settings)

import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface TokenFilters {
  blockchain?: string;
  status?: string;
}

@Injectable()
export class TokenService {
  private readonly settingsCache = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) {}

  async getUserTokens(tenantId: string, userId: string, filters: TokenFilters = {}) {
    const where: Prisma.BlockchainTokenWhereInput = {
      tenantId,
      createdBy: userId,
    };

    if (filters.blockchain) {
      where.blockchain = filters.blockchain;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return this.prisma.blockchainToken.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTokenDetails(tenantId: string, tokenId: string) {
    const token = await this.prisma.blockchainToken.findFirst({
      where: { id: tokenId, tenantId },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 25 },
        stakingPools: true,
        vestingSchedules: true,
      },
    });

    if (!token) {
      throw new BadRequestException('Token not found');
    }

    return token;
  }

  async mintTokens(
    tenantId: string,
    userId: string,
    tokenId: string,
    data: { amount: string; recipient: string; reason?: string }
  ) {
    const token = await this.getTokenDetails(tenantId, tokenId);
    const amountBigInt = BigInt(data.amount);
    const currentSupply = BigInt(token.totalSupply ?? '0');

    await this.prisma.blockchainToken.update({
      where: { id: tokenId },
      data: { totalSupply: (currentSupply + amountBigInt).toString() },
    });

    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        tokenId,
        type: 'TOKEN_MINT',
        status: 'PENDING',
        amount: data.amount,
        toAddress: data.recipient,
        blockchain: token.blockchain,
        metadata: {
          reason: data.reason ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return { status: 'IN_PROGRESS', tokenId, minted: data.amount };
  }

  async burnTokens(
    tenantId: string,
    userId: string,
    tokenId: string,
    data: { amount: string; reason?: string }
  ) {
    const token = await this.getTokenDetails(tenantId, tokenId);
    const amountBigInt = BigInt(data.amount);
    const currentSupply = BigInt(token.totalSupply ?? '0');

    if (amountBigInt > currentSupply) {
      throw new BadRequestException('Burn amount exceeds total supply');
    }

    await this.prisma.blockchainToken.update({
      where: { id: tokenId },
      data: { totalSupply: (currentSupply - amountBigInt).toString() },
    });

    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        tokenId,
        type: 'TOKEN_BURN',
        status: 'PENDING',
        amount: data.amount,
        blockchain: token.blockchain,
        metadata: {
          reason: data.reason ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return { status: 'IN_PROGRESS', tokenId, burned: data.amount };
  }

  async getPortfolioAnalytics(tenantId: string, userId: string, period: string) {
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { tenantId, userId },
      select: { createdAt: true, amount: true, type: true },
    });

    const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0);

    return {
      period,
      totalVolume,
      transactionCount: transactions.length,
      allocations: [],
    };
  }

  async getPerformanceMetrics(tenantId: string, userId: string, period: string) {
    const analytics = await this.getPortfolioAnalytics(tenantId, userId, period);
    return {
      period,
      roi: analytics.totalVolume * 0.02,
      volatility: 0.1,
      sharpeRatio: 1.2,
    };
  }

  async getSettings(tenantId: string, userId: string) {
    const key = `${tenantId}:${userId}`;
    return this.settingsCache.get(key) ?? {
      defaultNetwork: 'ethereum',
      gasPreference: 'standard',
      slippageTolerance: 0.5,
      notifications: {
        transactions: true,
        priceAlerts: true,
        stakingRewards: true,
        nftActivity: true,
      },
      privacy: {
        hideBalances: false,
        hideTransactions: false,
      },
    };
  }

  async updateSettings(tenantId: string, userId: string, settings: Record<string, any>) {
    const key = `${tenantId}:${userId}`;
    this.settingsCache.set(key, { ...(await this.getSettings(tenantId, userId)), ...settings });
    return this.getSettings(tenantId, userId);
  }

  async getTokenBalance(tenantId: string, userId: string, tokenId: string): Promise<string> {
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { tenantId, userId, tokenId },
      select: { amount: true, type: true },
    });

    const balance = transactions.reduce((acc, tx) => {
      const value = Number(tx.amount ?? 0);
      if (tx.type === 'TOKEN_BURN') {
        return acc - value;
      }
      return acc + value;
    }, 0);

    return balance.toString();
  }
}
