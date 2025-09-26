import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface CorporateTokenMetadata {
  symbol: string;
  totalSupply: number;
  purpose: string;
}

interface CorporateTokenEconomy {
  economyId: string;
  name: string;
  description?: string;
  tokens: {
    utilityToken: CorporateTokenMetadata;
    governanceToken: CorporateTokenMetadata;
  };
  stakingPrograms: {
    employeeStaking: StakingProgram;
    partnerStaking: StakingProgram;
  };
  incentivePrograms: {
    performanceRewards: boolean;
    referralBonuses: boolean;
    innovationRewards: boolean;
    loyaltyPrograms: boolean;
  };
  governance: {
    votingPower: string;
    proposalThreshold: number;
    votingPeriod: number;
    executionDate?: Date;
    executionDelay: number;
  };
  createdAt: Date;
  active: boolean;
}

interface StakingProgram {
  rewards: number;
  lockPeriod: number;
  minimumStake: number;
}

interface TokenStake {
  stakeId: string;
  economyId: string;
  stakeholder: string;
  amount: number;
  program: string;
  startDate: string | Date;
  endDate: string | Date;
  rewards: number;
  status: 'active' | 'completed' | 'cancelled';
}

interface StakeRewardsSummary {
  stakeId: string;
  principal: number;
  daysPassed: number;
  rewardRate: number;
  accruedRewards: number;
  totalValue: number;
  calculatedAt: Date;
}

interface GovernanceProposal {
  proposalId: string;
  economyId: string;
  title: string;
  description: string;
  proposer: string;
  type: string;
  votingStart: Date;
  votingEnd: Date;
  executionDate: Date;
  status: 'active' | 'closed' | 'executed';
  votes: {
    for: number;
    against: number;
    abstain: number;
  };
  voters: string[];
  createdAt: Date;
}

@Injectable()
export class CorporateTokenEconomyService {
  private readonly logger = new Logger(CorporateTokenEconomyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTokenEconomy(tenantId: string, economyData: any): Promise<CorporateTokenEconomy> {
    const economyId = `economy-${Date.now()}`;
    
    const tokenEconomy: CorporateTokenEconomy = {
      economyId,
      name: economyData.name,
      description: economyData.description,
      tokens: {
        utilityToken: {
          symbol: economyData.utilityToken?.symbol || 'CORP',
          totalSupply: economyData.utilityToken?.totalSupply || 1000000,
          purpose: 'Internal corporate utility and rewards'
        },
        governanceToken: {
          symbol: economyData.governanceToken?.symbol || 'GOV',
          totalSupply: economyData.governanceToken?.totalSupply || 100000,
          purpose: 'Corporate governance and voting rights'
        }
      },
      stakingPrograms: {
        employeeStaking: {
          rewards: 0.15, // 15% APY
          lockPeriod: 365, // days
          minimumStake: 100
        },
        partnerStaking: {
          rewards: 0.12, // 12% APY
          lockPeriod: 180, // days
          minimumStake: 1000
        }
      },
      incentivePrograms: {
        performanceRewards: true,
        referralBonuses: true,
        innovationRewards: true,
        loyaltyPrograms: true
      },
      governance: {
        votingPower: 'token-weighted',
        proposalThreshold: 1000,
        votingPeriod: 7, // days
        executionDelay: 2 // days
      },
      createdAt: new Date(),
      active: true
    };

    await this.redis.setJson(`token_economy:${tenantId}:${economyId}`, tokenEconomy, 86400);
    return tokenEconomy;
  }

  async stakeTokens(tenantId: string, economyId: string, stakeholder: string, amount: number, program: string): Promise<TokenStake> {
    const stakeId = `stake-${Date.now()}`;
    
    const stake: TokenStake = {
      stakeId,
      economyId,
      stakeholder,
      amount,
      program,
      startDate: new Date(),
      endDate: new Date(Date.now() + (program === 'employee' ? 365 : 180) * 24 * 60 * 60 * 1000),
      rewards: 0,
      status: 'active'
    };

    await this.redis.setJson(`token_stake:${tenantId}:${stakeId}`, stake, 86400);
    return stake;
  }

  async calculateRewards(tenantId: string, stakeId: string): Promise<StakeRewardsSummary> {
    const stake = (await this.redis.getJson(`token_stake:${tenantId}:${stakeId}`)) as TokenStake | null;
    
    if (!stake) {
      throw new Error('Stake not found');
    }

    const startDate = new Date(stake.startDate);
    const daysPassed = Math.floor((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const rewardRate = stake.program === 'employee' ? 0.15 : 0.12;
    const rewards = (stake.amount * rewardRate * daysPassed) / 365;

    return {
      stakeId,
      principal: stake.amount,
      daysPassed,
      rewardRate,
      accruedRewards: rewards,
      totalValue: stake.amount + rewards,
      calculatedAt: new Date()
    };
  }

  async createGovernanceProposal(tenantId: string, economyId: string, proposalData: any): Promise<GovernanceProposal> {
    const proposalId = `proposal-${Date.now()}`;
    
    const proposal: GovernanceProposal = {
      proposalId,
      economyId,
      title: proposalData.title,
      description: proposalData.description,
      proposer: proposalData.proposer,
      type: proposalData.type || 'general',
      votingStart: new Date(),
      votingEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      executionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      status: 'active',
      votes: {
        for: 0,
        against: 0,
        abstain: 0
      },
      voters: [],
      createdAt: new Date()
    };

    await this.redis.setJson(`governance_proposal:${tenantId}:${proposalId}`, proposal, 86400);
    return proposal;
  }

  async castVote(
    tenantId: string,
    proposalId: string,
    voter: string,
    vote: 'for' | 'against' | 'abstain',
    votingPower: number,
  ): Promise<{ proposalId: string; voter: string; vote: 'for' | 'against' | 'abstain'; votingPower: number; currentResults: GovernanceProposal['votes']; timestamp: Date }> {
    const proposal = (await this.redis.getJson(`governance_proposal:${tenantId}:${proposalId}`)) as GovernanceProposal | null;
    
    if (!proposal || proposal.status !== 'active') {
      throw new Error('Proposal not found or voting closed');
    }

    if (proposal.voters.includes(voter)) {
      throw new Error('Already voted');
    }

    proposal.votes[vote] += votingPower;
    proposal.voters.push(voter);

    await this.redis.setJson(`governance_proposal:${tenantId}:${proposalId}`, proposal, 86400);
    
    return {
      proposalId,
      voter,
      vote,
      votingPower,
      currentResults: proposal.votes,
      timestamp: new Date()
    };
  }

  health() {
    return {
      service: 'CorporateTokenEconomyService',
      status: 'operational',
      features: ['Token Economy Management', 'Staking Programs', 'Governance Systems', 'Reward Distribution'],
      timestamp: new Date().toISOString()
    };
  }
}
