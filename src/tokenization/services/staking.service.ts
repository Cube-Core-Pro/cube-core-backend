// path: backend/src/tokenization/services/staking.service.ts
// purpose: Manage staking pools and positions for tokenization module

import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class StakingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStakingPools(tenantId: string) {
    return this.prisma.tokenStakingPool.findMany({
      where: { token: { tenantId } },
      include: { token: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActivePositions(tenantId: string, userId: string) {
    return this.prisma.tokenStakingPosition.findMany({
      where: { tenantId, userId, status: 'ACTIVE' },
      include: { pool: true, token: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPosition(
    tenantId: string,
    userId: string,
    request: { tokenId: string; amount: string; duration: number; stakingPoolId?: string }
  ) {
    const pool = request.stakingPoolId
      ? await this.prisma.tokenStakingPool.findUnique({ where: { id: request.stakingPoolId } })
      : await this.prisma.tokenStakingPool.findFirst({ where: { tokenId: request.tokenId } });

    if (!pool) {
      throw new BadRequestException('Staking pool not found');
    }

    const position = await this.prisma.tokenStakingPosition.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        poolId: pool.id,
        tokenId: request.tokenId,
        amount: request.amount,
        durationDays: request.duration,
        status: 'ACTIVE',
      },
    });

    return position;
  }

  async unstakeTokens(tenantId: string, userId: string, positionId: string) {
    const position = await this.prisma.tokenStakingPosition.findFirst({
      where: { id: positionId, tenantId, userId },
      include: { token: true },
    });
    if (!position) {
      throw new BadRequestException('Staking position not found');
    }

    await this.prisma.tokenStakingPosition.update({
      where: { id: positionId },
      data: { status: 'UNSTAKED', updatedAt: new Date() },
    });

    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        tokenId: position.tokenId,
        type: 'STAKING_UNSTAKE',
        status: 'PENDING',
        amount: position.amount,
        metadata: { positionId } as Prisma.InputJsonValue,
        blockchain: position.token?.blockchain ?? 'ethereum',
      },
    });

    return { status: 'IN_PROGRESS', positionId };
  }

  async claimRewards(tenantId: string, userId: string, positionId: string) {
    const position = await this.prisma.tokenStakingPosition.findFirst({
      where: { id: positionId, tenantId, userId },
      include: { token: true },
    });
    if (!position) {
      throw new BadRequestException('Staking position not found');
    }

    const rewards = position.rewardsAccrued ?? '0';

    await this.prisma.tokenStakingPosition.update({
      where: { id: positionId },
      data: { rewardsAccrued: '0', updatedAt: new Date() },
    });

    await this.prisma.blockchainTransaction.create({
      data: {
        id: randomUUID(),
        tenantId,
        userId,
        tokenId: position.tokenId,
        type: 'STAKING_REWARD',
        status: 'PENDING',
        amount: rewards,
        metadata: { positionId } as Prisma.InputJsonValue,
        blockchain: position.token?.blockchain ?? 'ethereum',
      },
    });

    return { status: 'IN_PROGRESS', positionId, rewards };
  }

  async calculateRewards(amount: string, duration: number, stakingPoolId?: string) {
    let apy = 0.1;
    if (stakingPoolId) {
      const pool = await this.prisma.tokenStakingPool.findUnique({ where: { id: stakingPoolId } });
      apy = pool?.apy ?? apy;
    }

    const amountNumber = Number(amount);
    const reward = amountNumber * (apy / 365) * duration;

    return {
      estimatedRewards: reward,
      apy,
      duration,
    };
  }
}
