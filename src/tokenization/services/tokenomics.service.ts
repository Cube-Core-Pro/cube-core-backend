// path: backend/src/tokenization/services/tokenomics.service.ts
// purpose: Provide lightweight tokenomics summaries for tokens

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TokenomicsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateTokenomicsReport(token: any) {
    if (!token) {
      return null;
    }

    const totalSupply = Number(token.totalSupply ?? 0);
    const circulating = totalSupply * 0.6;
    const locked = totalSupply - circulating;

    const transactions = await this.prisma.blockchainTransaction.count({
      where: { tokenId: token.id },
    });

    return {
      tokenId: token.id,
      totalSupply,
      circulatingSupply: circulating,
      lockedSupply: locked,
      holders: Math.max(1, Math.round(transactions / 3)),
      marketCapEstimate: circulating * 1.25,
      velocity: transactions / Math.max(1, totalSupply),
      updatedAt: new Date(),
    };
  }
}
