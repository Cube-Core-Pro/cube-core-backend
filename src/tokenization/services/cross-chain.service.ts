// path: backend/src/tokenization/services/cross-chain.service.ts
// purpose: Manage cross-chain bridge metadata and history

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

const SUPPORTED_BRIDGES = [
  { id: 'wormhole', name: 'Wormhole', chains: ['ethereum', 'solana', 'polygon', 'bsc'] },
  { id: 'polygon-bridge', name: 'Polygon PoS Bridge', chains: ['ethereum', 'polygon'] },
  { id: 'arbitrum-anytrust', name: 'Arbitrum AnyTrust', chains: ['ethereum', 'arbitrum'] },
];

@Injectable()
export class CrossChainService {
  constructor(private readonly prisma: PrismaService) {}

  getSupportedBridges() {
    return SUPPORTED_BRIDGES;
  }

  async isBridgeSupported(fromChain: string, toChain: string) {
    return SUPPORTED_BRIDGES.some(bridge =>
      bridge.chains.includes(fromChain) && bridge.chains.includes(toChain)
    );
  }

  async createBridgeTransaction(
    tenantId: string,
    userId: string,
    bridgeRequest: {
      tokenId: string;
      amount: string;
      fromChain: string;
      toChain: string;
      recipientAddress?: string;
    }
  ) {
    const transaction = await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        tokenId: bridgeRequest.tokenId,
        type: 'CROSS_CHAIN',
        status: 'PENDING',
        amount: bridgeRequest.amount,
        blockchain: bridgeRequest.fromChain,
        metadata: bridgeRequest as Prisma.InputJsonValue,
      },
    });

    return transaction;
  }

  async calculateBridgeFees(bridgeRequest: {
    amount: string;
    fromChain: string;
    toChain: string;
  }) {
    const baseFee = 0.001; // 0.1%
    const amountNumber = Number(bridgeRequest.amount ?? 0);
    const variableFee = amountNumber * baseFee;

    return {
      bridge: bridgeRequest.fromChain + '-' + bridgeRequest.toChain,
      estimatedFee: variableFee,
      currency: 'TOKEN',
    };
  }

  async getTransactionHistory(
    tenantId: string,
    userId: string,
    options: { page: number; limit: number }
  ) {
    const page = options.page;
    const limit = options.limit;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.blockchainTransaction.findMany({
        where: { tenantId, userId, type: 'CROSS_CHAIN' },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blockchainTransaction.count({ where: { tenantId, userId, type: 'CROSS_CHAIN' } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
