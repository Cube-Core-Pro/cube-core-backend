export interface WalletSummary {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  type: 'HOT' | 'COLD' | 'MULTISIG' | 'ADDRESS_ONLY';
  createdAt: Date;
}

export interface PortfolioBreakdown {
  total: number;
  tokens: number;
  nfts: number;
  staking: number;
  defi: number;
}

export interface PortfolioPerformance {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface YieldApySummary {
  staking?: number;
  defi?: number;
  blended?: number;
}

export interface TokenizationDashboard {
  portfolioValue: PortfolioBreakdown;
  recentTransactions: TransactionSummary[];
  activeStaking: StakingPositionSummary[];
  nftCollection: NftPortfolioSummary[];
  defiPositions: DefiPositionSummary[];
  marketData: MarketAssetSummary[];
  alerts: AlertSummary[];
  performance: PortfolioPerformance;
  yieldApy?: YieldApySummary;
}

export interface TransactionSummary {
  id: string;
  type: string;
  status: string;
  blockchain: string;
  amount?: string;
  tokenSymbol?: string;
  createdAt: Date;
}

export interface StakingPositionSummary {
  id: string;
  protocol: string;
  tokenSymbol: string;
  stakedAmount: string;
  rewardsAccrued: string;
  apy?: number;
}

export interface NftPortfolioSummary {
  id: string;
  name: string;
  blockchain: string;
  items: number;
  floorPrice?: number;
}

export interface DefiPositionSummary {
  id: string;
  protocol: string;
  positionType: string;
  value: string;
  apy?: number;
}

export interface MarketAssetSummary {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
}

export interface AlertSummary {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  isRead: boolean;
}

export interface StakingRequest {
  tokenId: string;
  amount: string;
  duration: number;
  stakingPoolId?: string;
}

export interface BridgeRequest {
  tokenId: string;
  amount: string;
  fromChain: string;
  toChain: string;
  recipientAddress?: string;
}

export interface TransactionHistoryOptions {
  page?: number;
  limit?: number;
  type?: string;
  blockchain?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ExecutionStatistics {
  totalOrders: number;
  filledOrders: number;
  fillRate: number;
  averageSlippage: number;
  averageCommission: number;
  averageExecutionTime: number;
  totalVolume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  venue: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
}
