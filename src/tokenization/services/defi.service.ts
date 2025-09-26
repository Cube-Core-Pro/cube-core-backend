// path: backend/src/tokenization/services/defi.service.ts
// purpose: Simple DeFi helper service returning placeholder data structures

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class DefiService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupportedProtocols(tenantId: string) {
    void tenantId;
    return [
      { id: 'uniswap', name: 'Uniswap v3', chains: ['ethereum', 'polygon'], categories: ['swap', 'liquidity'] },
      { id: 'aave', name: 'Aave', chains: ['ethereum', 'polygon'], categories: ['lending'] },
    ];
  }

  async getUserPositions(tenantId: string, userId: string) {
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { tenantId, userId, type: { in: ['DEFI_LIQUIDITY', 'DEFI_SWAP'] } },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map(tx => {
      const metadata = (tx.metadata ?? {}) as Record<string, unknown>;
      const apy = this.parseApy(metadata);

      return {
        id: tx.id,
        protocol: (metadata.protocol as string) ?? tx.blockchain ?? 'uniswap',
        status: tx.status,
        amount: tx.amount,
        blockchain: tx.blockchain,
        createdAt: tx.createdAt,
        apy,
      };
    });
  }

  async addLiquidity(
    tenantId: string,
    userId: string,
    data: {
      protocol: string;
      poolId: string;
      tokenA: string;
      tokenB: string;
      amountA: string;
      amountB: string;
      slippage: number;
    }
  ) {
    const tx = await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        type: 'DEFI_LIQUIDITY',
        status: 'PENDING',
        amount: data.amountA,
        blockchain: data.protocol,
        metadata: data as Prisma.InputJsonValue,
      },
    });

    return { transactionId: tx.id, status: 'PENDING' };
  }

  async swapTokens(
    tenantId: string,
    userId: string,
    data: {
      protocol: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      minAmountOut: string;
      slippage: number;
    }
  ) {
    const tx = await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        type: 'DEFI_SWAP',
        status: 'PENDING',
        amount: data.amountIn,
        blockchain: data.protocol,
        metadata: data as Prisma.InputJsonValue,
      },
    });

    return { transactionId: tx.id, status: 'PENDING' };
  }

  private parseApy(metadata: Record<string, unknown>): number | undefined {
    const candidates = [
      metadata.apy,
      metadata.apyPercent,
      metadata.apr,
      metadata.yield,
      metadata.rate,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }

      if (typeof candidate === 'string') {
        const normalized = candidate.replace(/%/g, '').trim();
        if (!normalized) {
          continue;
        }

        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return undefined;
  }
}
