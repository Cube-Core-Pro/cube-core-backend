// path: backend/src/ai-trading-markets/services/risk-management.service.ts
// purpose: Advanced risk management and portfolio protection service
// dependencies: Real-time monitoring, VaR calculations, Stress testing, Compliance

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TradingSignal, Position, TradingAccount } from './algorithmic-trading.service';

export interface RiskProfile {
  id: string;
  name: string;
  description: string;
  maxPositionSize: number; // Percentage of portfolio
  maxDailyLoss: number; // Percentage
  maxDrawdown: number; // Percentage
  maxLeverage: number;
  maxConcentration: number; // Max % in single asset
  maxCorrelation: number; // Max correlation between positions
  allowedInstruments: string[];
  forbiddenInstruments: string[];
  maxVaR: number; // Value at Risk limit
  stressTestLimits: Record<string, number>;
  isActive: boolean;
}

export interface RiskMetrics {
  portfolioValue: number;
  totalExposure: number;
  leverage: number;
  var95: number; // 95% Value at Risk
  var99: number; // 99% Value at Risk
  expectedShortfall: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  alpha: number;
  correlation: Record<string, number>;
  concentration: Record<string, number>;
  sectorExposure: Record<string, number>;
  geographicExposure: Record<string, number>;
  currencyExposure: Record<string, number>;
  volatility: number;
  skewness: number;
  kurtosis: number;
  calmarRatio: number;
  informationRatio: number;
  trackingError: number;
  timestamp: Date;
}

export interface RiskAlert {
  id: string;
  type: 'limit_breach' | 'concentration' | 'correlation' | 'var_breach' | 'drawdown' | 'volatility' | 'liquidity' | 'margin_call';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  accountId: string;
  symbol?: string;
  currentValue: number;
  limitValue: number;
  recommendation: string;
  isActive: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  type: 'historical' | 'monte_carlo' | 'parametric' | 'custom';
  parameters: {
    marketShock?: number; // Market drop percentage
    volatilityShock?: number; // Volatility increase
    correlationShock?: number; // Correlation increase
    liquidityShock?: number; // Liquidity decrease
    interestRateShock?: number; // Interest rate change
    currencyShock?: Record<string, number>; // Currency movements
    sectorShocks?: Record<string, number>; // Sector-specific shocks
    customShocks?: Record<string, number>; // Custom instrument shocks
  };
  duration: number; // Days
  confidence: number; // Confidence level
}

export interface StressTestResult {
  scenarioId: string;
  portfolioValue: number;
  stressedValue: number;
  loss: number;
  lossPercentage: number;
  worstPosition: {
    symbol: string;
    loss: number;
    lossPercentage: number;
  };
  sectorImpact: Record<string, number>;
  timeToRecover: number; // Estimated days
  liquidityImpact: number;
  marginImpact: number;
  recommendations: string[];
  timestamp: Date;
}

export interface LiquidityMetrics {
  symbol: string;
  averageDailyVolume: number;
  bidAskSpread: number;
  marketImpact: number; // Price impact per $1M traded
  liquidityScore: number; // 0-100
  timeToLiquidate: number; // Hours to liquidate position
  liquidityRisk: 'low' | 'medium' | 'high';
}

export interface RiskCheckResult {
  approved: boolean;
  reason?: string;
  warnings: string[];
  adjustedQuantity?: number;
  requiredStopLoss?: number;
  maxHoldingPeriod?: number;
}

@Injectable()
export class RiskManagementService {
  private readonly logger = new Logger(RiskManagementService.name);
  private riskProfiles: Map<string, RiskProfile> = new Map();
  private stressTestScenarios: Map<string, StressTestScenario> = new Map();
  private activeAlerts: Map<string, RiskAlert[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeRiskProfiles();
    this.initializeStressTestScenarios();
    this.startRiskMonitoring();
  }

  private initializeRiskProfiles() {
    const profiles: RiskProfile[] = [
      {
        id: 'conservative',
        name: 'Conservative',
        description: 'Low risk profile for capital preservation',
        maxPositionSize: 0.05, // 5% max per position
        maxDailyLoss: 0.01, // 1% max daily loss
        maxDrawdown: 0.05, // 5% max drawdown
        maxLeverage: 2.0,
        maxConcentration: 0.20, // 20% max in single asset
        maxCorrelation: 0.7,
        allowedInstruments: ['stocks', 'bonds', 'forex_majors'],
        forbiddenInstruments: ['crypto', 'penny_stocks', 'exotic_derivatives'],
        maxVaR: 0.02, // 2% VaR limit
        stressTestLimits: {
          market_crash: 0.10, // 10% max loss in market crash
          volatility_spike: 0.08,
          liquidity_crisis: 0.06,
        },
        isActive: true,
      },
      {
        id: 'moderate',
        name: 'Moderate',
        description: 'Balanced risk profile for steady growth',
        maxPositionSize: 0.10, // 10% max per position
        maxDailyLoss: 0.02, // 2% max daily loss
        maxDrawdown: 0.10, // 10% max drawdown
        maxLeverage: 5.0,
        maxConcentration: 0.30, // 30% max in single asset
        maxCorrelation: 0.8,
        allowedInstruments: ['stocks', 'bonds', 'forex', 'commodities', 'crypto_major'],
        forbiddenInstruments: ['penny_stocks', 'exotic_derivatives'],
        maxVaR: 0.04, // 4% VaR limit
        stressTestLimits: {
          market_crash: 0.20, // 20% max loss in market crash
          volatility_spike: 0.15,
          liquidity_crisis: 0.12,
        },
        isActive: true,
      },
      {
        id: 'aggressive',
        name: 'Aggressive',
        description: 'High risk profile for maximum growth',
        maxPositionSize: 0.20, // 20% max per position
        maxDailyLoss: 0.05, // 5% max daily loss
        maxDrawdown: 0.20, // 20% max drawdown
        maxLeverage: 10.0,
        maxConcentration: 0.50, // 50% max in single asset
        maxCorrelation: 0.9,
        allowedInstruments: ['all'],
        forbiddenInstruments: [],
        maxVaR: 0.08, // 8% VaR limit
        stressTestLimits: {
          market_crash: 0.40, // 40% max loss in market crash
          volatility_spike: 0.30,
          liquidity_crisis: 0.25,
        },
        isActive: true,
      },
      {
        id: 'institutional',
        name: 'Institutional',
        description: 'Institutional-grade risk management',
        maxPositionSize: 0.15, // 15% max per position
        maxDailyLoss: 0.03, // 3% max daily loss
        maxDrawdown: 0.15, // 15% max drawdown
        maxLeverage: 3.0,
        maxConcentration: 0.25, // 25% max in single asset
        maxCorrelation: 0.75,
        allowedInstruments: ['stocks', 'bonds', 'forex', 'commodities', 'derivatives'],
        forbiddenInstruments: ['crypto', 'penny_stocks'],
        maxVaR: 0.05, // 5% VaR limit
        stressTestLimits: {
          market_crash: 0.25, // 25% max loss in market crash
          volatility_spike: 0.20,
          liquidity_crisis: 0.15,
          regulatory_change: 0.10,
        },
        isActive: true,
      },
    ];

    for (const profile of profiles) {
      this.riskProfiles.set(profile.id, profile);
    }

    this.logger.log(`Loaded ${profiles.length} risk profiles`);
  }

  private initializeStressTestScenarios() {
    const scenarios: StressTestScenario[] = [
      {
        id: 'market_crash_2008',
        name: '2008 Financial Crisis',
        description: 'Simulate 2008-style market crash',
        type: 'historical',
        parameters: {
          marketShock: -0.40, // 40% market drop
          volatilityShock: 3.0, // 3x volatility increase
          correlationShock: 0.9, // High correlation
          liquidityShock: -0.70, // 70% liquidity decrease
          sectorShocks: {
            financials: -0.60,
            real_estate: -0.50,
            technology: -0.30,
            utilities: -0.10,
          },
        },
        duration: 180, // 6 months
        confidence: 0.95,
      },
      {
        id: 'covid_crash_2020',
        name: 'COVID-19 Market Crash',
        description: 'Simulate COVID-19 pandemic market impact',
        type: 'historical',
        parameters: {
          marketShock: -0.35, // 35% market drop
          volatilityShock: 4.0, // 4x volatility increase
          correlationShock: 0.95, // Very high correlation
          liquidityShock: -0.50, // 50% liquidity decrease
          sectorShocks: {
            travel: -0.70,
            hospitality: -0.65,
            energy: -0.60,
            technology: 0.20, // Tech benefited
            healthcare: 0.10,
          },
        },
        duration: 60, // 2 months
        confidence: 0.95,
      },
      {
        id: 'interest_rate_shock',
        name: 'Interest Rate Shock',
        description: 'Rapid interest rate increase',
        type: 'parametric',
        parameters: {
          interestRateShock: 0.03, // 3% rate increase
          marketShock: -0.15, // 15% market drop
          sectorShocks: {
            financials: 0.10, // Banks benefit
            real_estate: -0.25,
            utilities: -0.20,
            growth_stocks: -0.30,
          },
        },
        duration: 90, // 3 months
        confidence: 0.90,
      },
      {
        id: 'currency_crisis',
        name: 'Currency Crisis',
        description: 'Major currency devaluation',
        type: 'parametric',
        parameters: {
          currencyShock: {
            USD: 0.20, // USD strengthens
            EUR: -0.15,
            GBP: -0.20,
            JPY: -0.10,
            emerging: -0.30,
          },
          marketShock: -0.20,
        },
        duration: 120, // 4 months
        confidence: 0.85,
      },
      {
        id: 'volatility_spike',
        name: 'Volatility Spike',
        description: 'Sudden volatility increase',
        type: 'parametric',
        parameters: {
          volatilityShock: 2.5, // 2.5x volatility increase
          marketShock: -0.10, // 10% market drop
          correlationShock: 0.85,
        },
        duration: 30, // 1 month
        confidence: 0.95,
      },
      {
        id: 'liquidity_crisis',
        name: 'Liquidity Crisis',
        description: 'Market liquidity dries up',
        type: 'parametric',
        parameters: {
          liquidityShock: -0.80, // 80% liquidity decrease
          marketShock: -0.25, // 25% market drop
          volatilityShock: 2.0,
        },
        duration: 45, // 1.5 months
        confidence: 0.90,
      },
    ];

    for (const scenario of scenarios) {
      this.stressTestScenarios.set(scenario.id, scenario);
    }

    this.logger.log(`Loaded ${scenarios.length} stress test scenarios`);
  }

  private startRiskMonitoring() {
    // Monitor risk metrics every minute
    setInterval(() => this.monitorRiskMetrics(), 60000);
    
    // Update VaR calculations every 5 minutes
    setInterval(() => this.updateVaRCalculations(), 300000);
    
    // Run stress tests every hour
    setInterval(() => this.runScheduledStressTests(), 3600000);
    
    // Check position limits every 30 seconds
    setInterval(() => this.checkPositionLimits(), 30000);

    this.logger.log('Risk monitoring started');
  }

  async checkSignal(signal: TradingSignal): Promise<RiskCheckResult> {
    const warnings: string[] = [];
    let approved = true;
    let reason: string | undefined;
    let adjustedQuantity: number | undefined;

    try {
      // Get account and risk profile
      const account = await this.getTradingAccount(signal.strategyId);
      if (!account) {
        return {
          approved: false,
          reason: 'Trading account not found',
          warnings: [],
        };
      }

      const riskProfile = this.riskProfiles.get(account.riskProfileId || 'moderate');
      if (!riskProfile) {
        return {
          approved: false,
          reason: 'Risk profile not found',
          warnings: [],
        };
      }

      // Check if instrument is allowed
      if (!this.isInstrumentAllowed(signal.symbol, riskProfile)) {
        return {
          approved: false,
          reason: `Instrument ${signal.symbol} is not allowed for this risk profile`,
          warnings: [],
        };
      }

      // Get current portfolio metrics
      const portfolioMetrics = await this.calculatePortfolioMetrics(account.id);
      
      // Check position size limit
      const positionValue = (signal.quantity || 0) * signal.price;
      const positionSizePercent = positionValue / portfolioMetrics.portfolioValue;
      
      if (positionSizePercent > riskProfile.maxPositionSize) {
        const maxQuantity = (riskProfile.maxPositionSize * portfolioMetrics.portfolioValue) / signal.price;
        adjustedQuantity = Math.floor(maxQuantity);
        warnings.push(`Position size reduced from ${signal.quantity} to ${adjustedQuantity} due to position size limit`);
      }

      // Check concentration limit
      const currentConcentration = await this.calculateConcentration(account.id, signal.symbol);
      const newConcentration = currentConcentration + positionSizePercent;
      
      if (newConcentration > riskProfile.maxConcentration) {
        approved = false;
        reason = `Position would exceed concentration limit (${(newConcentration * 100).toFixed(1)}% > ${(riskProfile.maxConcentration * 100).toFixed(1)}%)`;
      }

      // Check correlation limits
      const correlationCheck = await this.checkCorrelationLimits(account.id, signal.symbol, riskProfile);
      if (!correlationCheck.approved) {
        warnings.push(correlationCheck.warning);
      }

      // Check leverage limits
      const newLeverage = await this.calculateNewLeverage(account.id, signal);
      if (newLeverage > riskProfile.maxLeverage) {
        approved = false;
        reason = `Position would exceed leverage limit (${newLeverage.toFixed(1)}x > ${riskProfile.maxLeverage}x)`;
      }

      // Check VaR limits
      const newVaR = await this.calculateNewVaR(account.id, signal);
      if (newVaR > riskProfile.maxVaR) {
        approved = false;
        reason = `Position would exceed VaR limit (${(newVaR * 100).toFixed(1)}% > ${(riskProfile.maxVaR * 100).toFixed(1)}%)`;
      }

      // Check liquidity
      const liquidityMetrics = await this.getLiquidityMetrics(signal.symbol);
      if (liquidityMetrics.liquidityRisk === 'high') {
        warnings.push(`High liquidity risk for ${signal.symbol}`);
      }

      // Check market hours
      if (!await this.isMarketOpen(signal.symbol)) {
        warnings.push(`Market is closed for ${signal.symbol}`);
      }

      // Check volatility
      const volatility = await this.getCurrentVolatility(signal.symbol);
      if (volatility > 0.05) { // 5% daily volatility threshold
        warnings.push(`High volatility detected for ${signal.symbol} (${(volatility * 100).toFixed(1)}%)`);
      }

      return {
        approved,
        reason,
        warnings,
        adjustedQuantity,
        requiredStopLoss: signal.stopLoss,
        maxHoldingPeriod: this.calculateMaxHoldingPeriod(signal, riskProfile),
      };

    } catch (error) {
      this.logger.error('Error checking signal risk', error);
      return {
        approved: false,
        reason: 'Risk check failed due to system error',
        warnings: [],
      };
    }
  }

  async calculatePortfolioMetrics(accountId: string): Promise<RiskMetrics> {
    try {
      // Get current positions
      const positions = await this.getAccountPositions(accountId);
      const account = await this.getTradingAccountById(accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      // Calculate basic metrics
      const portfolioValue = account.equity;
      const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.quantity * pos.currentPrice), 0);
      const leverage = totalExposure / portfolioValue;

      // Calculate returns for VaR and other metrics
      const returns = await this.getPortfolioReturns(accountId, 252); // 1 year of daily returns
      
      // Calculate VaR
      const var95 = this.calculateVaR(returns, 0.95);
      const var99 = this.calculateVaR(returns, 0.99);
      const expectedShortfall = this.calculateExpectedShortfall(returns, 0.95);

      // Calculate drawdown
      const equityCurve = await this.getEquityCurve(accountId);
      const drawdownMetrics = this.calculateDrawdownMetrics(equityCurve);

      // Calculate risk-adjusted returns
      const riskFreeRate = 0.02; // 2% risk-free rate
      const sharpeRatio = this.calculateSharpeRatio(returns, riskFreeRate);
      const sortinoRatio = this.calculateSortinoRatio(returns, riskFreeRate);

      // Calculate concentration metrics
      const concentration = this.calculateConcentrationMetrics(positions, portfolioValue);
      
      // Calculate sector and geographic exposure
      const sectorExposure = await this.calculateSectorExposure(positions);
      const geographicExposure = await this.calculateGeographicExposure(positions);
      const currencyExposure = await this.calculateCurrencyExposure(positions);

      // Calculate correlation matrix
      const correlation = await this.calculateCorrelationMatrix(positions);

      // Calculate additional metrics
      const volatility = this.calculateVolatility(returns);
      const skewness = this.calculateSkewness(returns);
      const kurtosis = this.calculateKurtosis(returns);
      const calmarRatio = this.calculateCalmarRatio(returns, drawdownMetrics.maxDrawdown);

      // Get benchmark data for beta and alpha
      const benchmarkReturns = await this.getBenchmarkReturns(252);
      const beta = this.calculateBeta(returns, benchmarkReturns);
      const alpha = this.calculateAlpha(returns, benchmarkReturns, riskFreeRate, beta);
      const informationRatio = this.calculateInformationRatio(returns, benchmarkReturns);
      const trackingError = this.calculateTrackingError(returns, benchmarkReturns);

      const metrics: RiskMetrics = {
        portfolioValue,
        totalExposure,
        leverage,
        var95,
        var99,
        expectedShortfall,
        maxDrawdown: drawdownMetrics.maxDrawdown,
        currentDrawdown: drawdownMetrics.currentDrawdown,
        sharpeRatio,
        sortinoRatio,
        beta,
        alpha,
        correlation,
        concentration,
        sectorExposure,
        geographicExposure,
        currencyExposure,
        volatility,
        skewness,
        kurtosis,
        calmarRatio,
        informationRatio,
        trackingError,
        timestamp: new Date(),
      };

      // Cache metrics
      await this.redisService.setex(
        `risk_metrics:${accountId}`,
        300, // 5 minutes
        JSON.stringify(metrics)
      );

      return metrics;

    } catch (error) {
      this.logger.error(`Error calculating portfolio metrics for account ${accountId}`, error);
      throw error;
    }
  }

  async runStressTest(accountId: string, scenarioId: string): Promise<StressTestResult> {
    const scenario = this.stressTestScenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('Stress test scenario not found');
    }

    try {
      // Get current portfolio
      const positions = await this.getAccountPositions(accountId);
      const account = await this.getTradingAccountById(accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }

      const portfolioValue = account.equity;
      let stressedValue = portfolioValue;
      let worstPosition = { symbol: '', loss: 0, lossPercentage: 0 };
      const sectorImpact: Record<string, number> = {};

      // Apply stress test shocks to each position
      for (const position of positions) {
        const positionValue = position.quantity * position.currentPrice;
        let shock = 0;

        // Apply market shock
        if (scenario.parameters.marketShock) {
          shock += scenario.parameters.marketShock;
        }

        // Apply sector-specific shocks
        if (scenario.parameters.sectorShocks) {
          const sector = await this.getInstrumentSector(position.symbol);
          if (sector && scenario.parameters.sectorShocks[sector]) {
            shock += scenario.parameters.sectorShocks[sector];
          }
        }

        // Apply currency shocks
        if (scenario.parameters.currencyShock) {
          const currency = await this.getInstrumentCurrency(position.symbol);
          if (currency && scenario.parameters.currencyShock[currency]) {
            shock += scenario.parameters.currencyShock[currency];
          }
        }

        // Apply custom shocks
        if (scenario.parameters.customShocks && scenario.parameters.customShocks[position.symbol]) {
          shock += scenario.parameters.customShocks[position.symbol];
        }

        // Calculate position impact
        const positionLoss = positionValue * shock;
        stressedValue += positionLoss;

        // Track worst position
        if (positionLoss < worstPosition.loss) {
          worstPosition = {
            symbol: position.symbol,
            loss: positionLoss,
            lossPercentage: shock,
          };
        }

        // Track sector impact
        const sector = await this.getInstrumentSector(position.symbol);
        if (sector) {
          sectorImpact[sector] = (sectorImpact[sector] || 0) + positionLoss;
        }
      }

      // Apply volatility shock to overall portfolio
      if (scenario.parameters.volatilityShock) {
        const additionalLoss = portfolioValue * 0.01 * (scenario.parameters.volatilityShock - 1);
        stressedValue -= additionalLoss;
      }

      // Apply liquidity shock
      if (scenario.parameters.liquidityShock) {
        const liquidityImpact = portfolioValue * Math.abs(scenario.parameters.liquidityShock) * 0.02;
        stressedValue -= liquidityImpact;
      }

      const loss = portfolioValue - stressedValue;
      const lossPercentage = loss / portfolioValue;

      // Calculate recovery time (simplified)
      const timeToRecover = Math.max(30, Math.abs(lossPercentage) * 365 * 2); // Rough estimate

      // Generate recommendations
      const recommendations = this.generateStressTestRecommendations(lossPercentage, scenario);

      const result: StressTestResult = {
        scenarioId,
        portfolioValue,
        stressedValue,
        loss,
        lossPercentage,
        worstPosition,
        sectorImpact,
        timeToRecover,
        liquidityImpact: scenario.parameters.liquidityShock || 0,
        marginImpact: Math.max(0, lossPercentage - 0.5), // Margin call if loss > 50%
        recommendations,
        timestamp: new Date(),
      };

      // Store result
      await this.redisService.setex(
        `stress_test:${accountId}:${scenarioId}`,
        3600, // 1 hour
        JSON.stringify(result)
      );

      return result;

    } catch (error) {
      this.logger.error(`Error running stress test ${scenarioId} for account ${accountId}`, error);
      throw error;
    }
  }

  async getLiquidityMetrics(symbol: string): Promise<LiquidityMetrics> {
    try {
      // Check cache first
      const cached = await this.redisService.get(`liquidity:${symbol}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate liquidity metrics
      const averageDailyVolume = await this.getAverageDailyVolume(symbol);
      const bidAskSpread = await this.getBidAskSpread(symbol);
      const marketImpact = await this.calculateMarketImpact(symbol);
      
      // Calculate liquidity score (0-100)
      let liquidityScore = 100;
      
      // Penalize low volume
      if (averageDailyVolume < 1000000) liquidityScore -= 30;
      else if (averageDailyVolume < 10000000) liquidityScore -= 15;
      
      // Penalize wide spreads
      if (bidAskSpread > 0.01) liquidityScore -= 25;
      else if (bidAskSpread > 0.005) liquidityScore -= 10;
      
      // Penalize high market impact
      if (marketImpact > 0.02) liquidityScore -= 20;
      else if (marketImpact > 0.01) liquidityScore -= 10;

      liquidityScore = Math.max(0, liquidityScore);

      // Determine risk level
      let liquidityRisk: 'low' | 'medium' | 'high';
      if (liquidityScore >= 80) liquidityRisk = 'low';
      else if (liquidityScore >= 60) liquidityRisk = 'medium';
      else liquidityRisk = 'high';

      // Estimate time to liquidate (hours)
      const timeToLiquidate = Math.max(1, (100 - liquidityScore) / 10);

      const metrics: LiquidityMetrics = {
        symbol,
        averageDailyVolume,
        bidAskSpread,
        marketImpact,
        liquidityScore,
        timeToLiquidate,
        liquidityRisk,
      };

      // Cache for 15 minutes
      await this.redisService.setex(
        `liquidity:${symbol}`,
        900,
        JSON.stringify(metrics)
      );

      return metrics;

    } catch (error) {
      this.logger.error(`Error calculating liquidity metrics for ${symbol}`, error);
      
      // Return conservative defaults
      return {
        symbol,
        averageDailyVolume: 0,
        bidAskSpread: 0.01,
        marketImpact: 0.05,
        liquidityScore: 50,
        timeToLiquidate: 24,
        liquidityRisk: 'high',
      };
    }
  }

  async createRiskAlert(alert: Omit<RiskAlert, 'id' | 'createdAt'>): Promise<RiskAlert> {
    const newAlert: RiskAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    // Store alert
    if (!this.activeAlerts.has(alert.accountId)) {
      this.activeAlerts.set(alert.accountId, []);
    }
    
    this.activeAlerts.get(alert.accountId)!.push(newAlert);

    // Emit event
    this.eventEmitter.emit('risk.alert', newAlert);

    // Store in Redis
    await this.redisService.lpush(
      `risk_alerts:${alert.accountId}`,
      JSON.stringify(newAlert)
    );

    // Keep only last 100 alerts
    await this.redisService.ltrim(`risk_alerts:${alert.accountId}`, 0, 99);

    this.logger.warn(`Risk alert created: ${newAlert.title} for account ${newAlert.accountId}`);

    return newAlert;
  }

  async resolveRiskAlert(alertId: string): Promise<boolean> {
    try {
      // Find and resolve alert
      for (const [_accountId, alerts] of this.activeAlerts) {
        const alertIndex = alerts.findIndex(a => a.id === alertId);
        if (alertIndex !== -1) {
          alerts[alertIndex].isActive = false;
          alerts[alertIndex].resolvedAt = new Date();
          
          this.eventEmitter.emit('risk.alert.resolved', alerts[alertIndex]);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error resolving risk alert ${alertId}`, error);
      return false;
    }
  }

  private async monitorRiskMetrics() {
    try {
      const accounts = await this.getAllTradingAccounts();
      
      for (const account of accounts) {
        await this.checkAccountRiskLimits(account);
      }
    } catch (error) {
      this.logger.error('Error monitoring risk metrics', error);
    }
  }

  private async checkAccountRiskLimits(account: TradingAccount) {
    try {
      const riskProfile = this.riskProfiles.get(account.riskProfileId || 'moderate');
      if (!riskProfile) return;

      const metrics = await this.calculatePortfolioMetrics(account.id);

      // Check VaR limit
      if (metrics.var95 > riskProfile.maxVaR) {
        await this.createRiskAlert({
          type: 'var_breach',
          severity: 'high',
          title: 'VaR Limit Exceeded',
          description: `Portfolio VaR (${(metrics.var95 * 100).toFixed(1)}%) exceeds limit (${(riskProfile.maxVaR * 100).toFixed(1)}%)`,
          accountId: account.id,
          currentValue: metrics.var95,
          limitValue: riskProfile.maxVaR,
          recommendation: 'Reduce position sizes or hedge portfolio',
          isActive: true,
        });
      }

      // Check drawdown limit
      if (metrics.currentDrawdown > riskProfile.maxDrawdown) {
        await this.createRiskAlert({
          type: 'drawdown',
          severity: 'critical',
          title: 'Maximum Drawdown Exceeded',
          description: `Current drawdown (${(metrics.currentDrawdown * 100).toFixed(1)}%) exceeds limit (${(riskProfile.maxDrawdown * 100).toFixed(1)}%)`,
          accountId: account.id,
          currentValue: metrics.currentDrawdown,
          limitValue: riskProfile.maxDrawdown,
          recommendation: 'Stop trading and review strategy',
          isActive: true,
        });
      }

      // Check leverage limit
      if (metrics.leverage > riskProfile.maxLeverage) {
        await this.createRiskAlert({
          type: 'limit_breach',
          severity: 'medium',
          title: 'Leverage Limit Exceeded',
          description: `Portfolio leverage (${metrics.leverage.toFixed(1)}x) exceeds limit (${riskProfile.maxLeverage}x)`,
          accountId: account.id,
          currentValue: metrics.leverage,
          limitValue: riskProfile.maxLeverage,
          recommendation: 'Reduce position sizes',
          isActive: true,
        });
      }

      // Check concentration limits
      for (const [symbol, concentration] of Object.entries(metrics.concentration)) {
        if (concentration > riskProfile.maxConcentration) {
          await this.createRiskAlert({
            type: 'concentration',
            severity: 'medium',
            title: 'Concentration Limit Exceeded',
            description: `Position in ${symbol} (${(concentration * 100).toFixed(1)}%) exceeds concentration limit (${(riskProfile.maxConcentration * 100).toFixed(1)}%)`,
            accountId: account.id,
            symbol,
            currentValue: concentration,
            limitValue: riskProfile.maxConcentration,
            recommendation: `Reduce position in ${symbol}`,
            isActive: true,
          });
        }
      }

      // Check margin level
      if (account.marginLevel < 1.5) { // 150% margin level threshold
        await this.createRiskAlert({
          type: 'margin_call',
          severity: 'critical',
          title: 'Low Margin Level',
          description: `Margin level (${(account.marginLevel * 100).toFixed(1)}%) is critically low`,
          accountId: account.id,
          currentValue: account.marginLevel,
          limitValue: 1.5,
          recommendation: 'Add funds or close positions immediately',
          isActive: true,
        });
      }

    } catch (error) {
      this.logger.error(`Error checking risk limits for account ${account.id}`, error);
    }
  }

  private async updateVaRCalculations() {
    try {
      const accounts = await this.getAllTradingAccounts();
      
      for (const account of accounts) {
        await this.calculatePortfolioMetrics(account.id);
      }
    } catch (error) {
      this.logger.error('Error updating VaR calculations', error);
    }
  }

  private async runScheduledStressTests() {
    try {
      const accounts = await this.getAllTradingAccounts();
      const scenarios = ['market_crash_2008', 'covid_crash_2020', 'volatility_spike'];
      
      for (const account of accounts) {
        for (const scenarioId of scenarios) {
          await this.runStressTest(account.id, scenarioId);
        }
      }
    } catch (error) {
      this.logger.error('Error running scheduled stress tests', error);
    }
  }

  private async checkPositionLimits() {
    try {
      const accounts = await this.getAllTradingAccounts();
      
      for (const account of accounts) {
        const positions = await this.getAccountPositions(account.id);
        const riskProfile = this.riskProfiles.get(account.riskProfileId || 'moderate');
        
        if (!riskProfile) continue;

        for (const position of positions) {
          const positionValue = Math.abs(position.quantity * position.currentPrice);
          const positionPercent = positionValue / account.equity;
          
          if (positionPercent > riskProfile.maxPositionSize) {
            await this.createRiskAlert({
              type: 'limit_breach',
              severity: 'medium',
              title: 'Position Size Limit Exceeded',
              description: `Position in ${position.symbol} (${(positionPercent * 100).toFixed(1)}%) exceeds size limit (${(riskProfile.maxPositionSize * 100).toFixed(1)}%)`,
              accountId: account.id,
              symbol: position.symbol,
              currentValue: positionPercent,
              limitValue: riskProfile.maxPositionSize,
              recommendation: `Reduce position in ${position.symbol}`,
              isActive: true,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking position limits', error);
    }
  }

  // Helper methods for calculations
  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * returns.length);
    const tailReturns = sortedReturns.slice(0, index);
    return Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length);
  }

  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    const excessReturns = returns.map(r => r - riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const volatility = this.calculateVolatility(excessReturns);
    return volatility > 0 ? avgExcessReturn / volatility : 0;
  }

  private calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    const excessReturns = returns.map(r => r - riskFreeRate / 252);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const downside = excessReturns.filter(r => r < 0);
    const downsideDeviation = Math.sqrt(downside.reduce((sum, r) => sum + r * r, 0) / downside.length);
    return downsideDeviation > 0 ? avgExcessReturn / downsideDeviation : 0;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateSkewness(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
    return skewness;
  }

  private calculateKurtosis(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length;
    return kurtosis - 3; // Excess kurtosis
  }

  private calculateCalmarRatio(returns: number[], maxDrawdown: number): number {
    const annualizedReturn = returns.reduce((sum, r) => sum + r, 0) * 252;
    return maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const portfolioMean = portfolioReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    const benchmarkMean = benchmarkReturns.slice(0, n).reduce((sum, r) => sum + r, 0) / n;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < n; i++) {
      const portfolioDeviation = portfolioReturns[i] - portfolioMean;
      const benchmarkDeviation = benchmarkReturns[i] - benchmarkMean;
      covariance += portfolioDeviation * benchmarkDeviation;
      benchmarkVariance += benchmarkDeviation * benchmarkDeviation;
    }
    
    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
  }

  private calculateAlpha(portfolioReturns: number[], benchmarkReturns: number[], riskFreeRate: number, beta: number): number {
    const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0) * 252;
    const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0) * 252;
    return portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));
  }

  private calculateInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const excessReturns = portfolioReturns.slice(0, n).map((r, i) => r - benchmarkReturns[i]);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / n;
    const trackingError = this.calculateVolatility(excessReturns);
    return trackingError > 0 ? avgExcessReturn / trackingError : 0;
  }

  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const excessReturns = portfolioReturns.slice(0, n).map((r, i) => r - benchmarkReturns[i]);
    return this.calculateVolatility(excessReturns);
  }

  private calculateDrawdownMetrics(equityCurve: number[]): { maxDrawdown: number; currentDrawdown: number } {
    let maxDrawdown = 0;
    let peak = equityCurve[0] || 0;
    const currentEquity = equityCurve[equityCurve.length - 1] || 0;
    let currentPeak = peak;
    
    for (const equity of equityCurve) {
      if (equity > peak) {
        peak = equity;
      }
      
      const drawdown = (peak - equity) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      
      if (equity > currentPeak) {
        currentPeak = equity;
      }
    }
    
    const currentDrawdown = currentPeak > 0 ? (currentPeak - currentEquity) / currentPeak : 0;
    
    return { maxDrawdown, currentDrawdown };
  }

  private calculateConcentrationMetrics(positions: Position[], portfolioValue: number): Record<string, number> {
    const concentration: Record<string, number> = {};
    
    for (const position of positions) {
      const positionValue = Math.abs(position.quantity * position.currentPrice);
      concentration[position.symbol] = positionValue / portfolioValue;
    }
    
    return concentration;
  }

  private generateStressTestRecommendations(lossPercentage: number, scenario: StressTestScenario): string[] {
    const recommendations: string[] = [];
    
    if (lossPercentage > 0.30) {
      recommendations.push('Consider reducing overall portfolio risk');
      recommendations.push('Implement stronger hedging strategies');
      recommendations.push('Diversify across uncorrelated assets');
    } else if (lossPercentage > 0.20) {
      recommendations.push('Review position sizing');
      recommendations.push('Consider adding defensive positions');
    } else if (lossPercentage > 0.10) {
      recommendations.push('Monitor portfolio closely during market stress');
      recommendations.push('Prepare contingency plans');
    } else {
      recommendations.push('Portfolio shows good resilience to stress');
    }
    
    if (scenario.parameters.liquidityShock && scenario.parameters.liquidityShock < -0.5) {
      recommendations.push('Maintain higher cash reserves');
      recommendations.push('Focus on liquid instruments');
    }
    
    if (scenario.parameters.correlationShock && scenario.parameters.correlationShock > 0.8) {
      recommendations.push('Reduce correlation between positions');
      recommendations.push('Add alternative investments');
    }
    
    return recommendations;
  }

  // Mock data methods (replace with actual implementations)
  private async getTradingAccount(_strategyId: string): Promise<TradingAccount> {
    return { id: 'account1', riskProfileId: 'moderate', equity: 100000 } as TradingAccount;
  }

  private async getTradingAccountById(accountId: string): Promise<TradingAccount | null> {
    return {
      id: accountId,
      name: 'Test Account',
      broker: 'IBKR',
      accountNumber: '123456',
      balance: 100000,
      equity: 100000,
      margin: 0,
      freeMargin: 100000,
      marginLevel: 2.0,
      currency: 'USD',
      leverage: 1.0,
      isLive: false,
      isActive: true,
    };
  }

  private async getAllTradingAccounts(): Promise<TradingAccount[]> {
    return [];
  }

  private async getAccountPositions(_accountId: string): Promise<Position[]> {
    return [];
  }

  private async getPortfolioReturns(_accountId: string, days: number): Promise<number[]> {
    // Generate mock returns
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
      returns.push((Math.random() - 0.5) * 0.02); // Random returns between -1% and 1%
    }
    return returns;
  }

  private async getEquityCurve(_accountId: string): Promise<number[]> {
    // Generate mock equity curve
    const curve: number[] = [];
    let equity = 100000;
    for (let i = 0; i < 252; i++) {
      equity *= (1 + (Math.random() - 0.5) * 0.02);
      curve.push(equity);
    }
    return curve;
  }

  private async getBenchmarkReturns(days: number): Promise<number[]> {
    // Generate mock benchmark returns (S&P 500)
    const returns: number[] = [];
    for (let i = 0; i < days; i++) {
      returns.push((Math.random() - 0.5) * 0.015); // Slightly lower volatility than portfolio
    }
    return returns;
  }

  private async calculateSectorExposure(_positions: Position[]): Promise<Record<string, number>> {
    return { technology: 0.3, financials: 0.2, healthcare: 0.15, energy: 0.1, other: 0.25 };
  }

  private async calculateGeographicExposure(_positions: Position[]): Promise<Record<string, number>> {
    return { 'North America': 0.6, Europe: 0.25, Asia: 0.1, 'Emerging Markets': 0.05 };
  }

  private async calculateCurrencyExposure(_positions: Position[]): Promise<Record<string, number>> {
    return { USD: 0.7, EUR: 0.15, GBP: 0.08, JPY: 0.05, Other: 0.02 };
  }

  private async calculateCorrelationMatrix(positions: Position[]): Promise<Record<string, number>> {
    // Simplified correlation calculation
    const correlations: Record<string, number> = {};
    for (const position of positions) {
      correlations[position.symbol] = Math.random() * 0.8; // Random correlation
    }
    return correlations;
  }

  private isInstrumentAllowed(symbol: string, riskProfile: RiskProfile): boolean {
    if (riskProfile.forbiddenInstruments.includes(symbol)) return false;
    if (riskProfile.allowedInstruments.includes('all')) return true;
    
    // Check instrument type against allowed types
    // This would need actual instrument classification
    return true;
  }

  private async calculateConcentration(_accountId: string, _symbol: string): Promise<number> {
    // Calculate current concentration in this symbol
    return 0.05; // 5% current concentration
  }

  private async checkCorrelationLimits(_accountId: string, _symbol: string, _riskProfile: RiskProfile): Promise<{ approved: boolean; warning: string }> {
    // Check correlation with existing positions
    return { approved: true, warning: '' };
  }

  private async calculateNewLeverage(_accountId: string, _signal: TradingSignal): Promise<number> {
    // Calculate new leverage after adding position
    return 2.0; // 2x leverage
  }

  private async calculateNewVaR(_accountId: string, _signal: TradingSignal): Promise<number> {
    // Calculate new VaR after adding position
    return 0.03; // 3% VaR
  }

  private async isMarketOpen(_symbol: string): Promise<boolean> {
    // Check if market is open for this symbol
    return true;
  }

  private async getCurrentVolatility(_symbol: string): Promise<number> {
    // Get current volatility for symbol
    return 0.02; // 2% daily volatility
  }

  private calculateMaxHoldingPeriod(_signal: TradingSignal, _riskProfile: RiskProfile): number {
    // Calculate maximum holding period based on risk profile
    return 24; // 24 hours
  }

  private async getAverageDailyVolume(_symbol: string): Promise<number> {
    return 10000000; // $10M average daily volume
  }

  private async getBidAskSpread(_symbol: string): Promise<number> {
    return 0.001; // 0.1% spread
  }

  private async calculateMarketImpact(_symbol: string): Promise<number> {
    return 0.005; // 0.5% market impact per $1M
  }

  private async getInstrumentSector(_symbol: string): Promise<string> {
    return 'technology'; // Mock sector
  }

  private async getInstrumentCurrency(_symbol: string): Promise<string> {
    return 'USD'; // Mock currency
  }

  // Public API methods
  async getRiskProfiles(): Promise<RiskProfile[]> {
    return Array.from(this.riskProfiles.values());
  }

  async getRiskProfile(id: string): Promise<RiskProfile | null> {
    return this.riskProfiles.get(id) || null;
  }

  async getStressTestScenarios(): Promise<StressTestScenario[]> {
    return Array.from(this.stressTestScenarios.values());
  }

  async getRiskAlerts(accountId: string): Promise<RiskAlert[]> {
    return this.activeAlerts.get(accountId) || [];
  }

  async getActiveRiskAlerts(accountId: string): Promise<RiskAlert[]> {
    const alerts = this.activeAlerts.get(accountId) || [];
    return alerts.filter(alert => alert.isActive);
  }

  getHealth() {
    const totalAlerts = Array.from(this.activeAlerts.values())
      .reduce((sum, alerts) => sum + alerts.length, 0);
    const activeAlerts = Array.from(this.activeAlerts.values())
      .reduce((sum, alerts) => sum + alerts.filter(a => a.isActive).length, 0);

    return {
      status: 'healthy',
      riskProfiles: this.riskProfiles.size,
      stressTestScenarios: this.stressTestScenarios.size,
      totalAlerts,
      activeAlerts,
      monitoredAccounts: this.activeAlerts.size,
    };
  }
}
