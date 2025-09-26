// path: backend/src/tokenization/services/wallet.service.ts
// purpose: Lightweight wallet orchestration helpers used by tokenization controller
// note: current implementation provides in-memory/derived data until full wallet storage is available

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenizationWallet {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  type: 'HOT' | 'COLD' | 'MULTISIG' | 'ADDRESS_ONLY';
  createdAt: Date;
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserWallets(tenantId: string, userId: string): Promise<TokenizationWallet[]> {
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { tenantId, userId },
      select: { fromAddress: true, toAddress: true, blockchain: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const wallets = new Map<string, TokenizationWallet>();
    for (const tx of transactions) {
      const addresses = [tx.fromAddress, tx.toAddress].filter(Boolean) as string[];
      for (const address of addresses) {
        if (!wallets.has(address)) {
          wallets.set(address, {
            id: randomUUID(),
            name: address.slice(0, 6) + '...' + address.slice(-4),
            address,
            blockchain: tx.blockchain || 'ethereum',
            type: 'ADDRESS_ONLY',
            createdAt: tx.createdAt,
          });
        }
      }
    }

    return Array.from(wallets.values());
  }

  async createWallet(
    tenantId: string,
    userId: string,
    walletData: { name: string; blockchain: string; type: 'HOT' | 'COLD' | 'MULTISIG'; description?: string }
  ) {
    const wallet: TokenizationWallet = {
      id: randomUUID(),
      name: walletData.name,
      address: randomUUID().replace(/-/g, '').slice(0, 40),
      blockchain: walletData.blockchain,
      type: walletData.type,
      createdAt: new Date(),
    };

    // Persist as an audit-friendly entry in blockchainTransactions for traceability (synthetic record)
    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        type: 'WALLET_CREATE',
        status: 'CONFIRMED',
        blockchain: wallet.blockchain,
        toAddress: wallet.address,
        metadata: {
          source: 'wallet-service',
          action: 'create-wallet',
          description: walletData.description ?? null,
        } as Prisma.InputJsonValue,
      },
    });

    return wallet;
  }

  async importWallet(
    tenantId: string,
    userId: string,
    importData: {
      name: string;
      blockchain: string;
      address?: string;
      privateKey?: string;
      mnemonic?: string;
      type: 'ADDRESS_ONLY' | 'PRIVATE_KEY' | 'MNEMONIC';
    }
  ) {
    const address = importData.address || randomUUID().replace(/-/g, '').slice(0, 40);
    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        type: 'WALLET_IMPORT',
        status: 'CONFIRMED',
        blockchain: importData.blockchain,
        toAddress: address,
        metadata: {
          source: 'wallet-service',
          action: 'import-wallet',
          importType: importData.type,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      id: randomUUID(),
      name: importData.name,
      address,
      blockchain: importData.blockchain,
      type: importData.type === 'ADDRESS_ONLY' ? 'ADDRESS_ONLY' : 'HOT',
      createdAt: new Date(),
    } satisfies TokenizationWallet;
  }

  async getWalletBalance(tenantId: string, userId: string, walletId: string) {
    // Aggregate outgoing vs incoming mock transactions as a provisional balance tracker
    const transactions = await this.prisma.blockchainTransaction.findMany({
      where: { tenantId, userId },
      select: { amount: true },
    });

    const balance = transactions.reduce((acc, tx) => acc + Number(tx.amount ?? 0), 0);
    return {
      walletId,
      balance: balance.toString(),
      currency: 'TOKEN',
      updatedAt: new Date(),
    };
  }

  async getWalletTransactions(
    tenantId: string,
    userId: string,
    walletId: string,
    options: { page?: number; limit?: number }
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.blockchainTransaction.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blockchainTransaction.count({ where: { tenantId, userId } }),
    ]);

    return {
      walletId,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getWalletValue(walletId: string) {
    return {
      total: 0,
      tokens: 0,
      nfts: 0,
      staking: 0,
      defi: 0,
      walletId,
    };
  }
}
