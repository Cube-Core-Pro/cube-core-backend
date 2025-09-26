// path: src/banking/fraud/fraud.service.ts
// purpose: Fraud Detection Service - Advanced fraud monitoring and prevention
// dependencies: Prisma, NestJS, banking transactions, ML scoring

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFraudAlertDto, UpdateFraudAlertDto, CreateFraudRuleDto, UpdateFraudRuleDto, FraudRiskLevel, FraudAlertStatus } from './dto';
import { Prisma, FraudAlert, FraudRule, TrustedDevice, FraudStatistics } from '@prisma/client';

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  shouldBlock: boolean;
  confidence: number;
}

export interface TransactionContext {
  transactionId: string;
  customerId: string;
  accountId: string;
  amount: number;
  currency: string;
  type: string;
  location?: {
    country: string;
    city: string;
    ip: string;
  };
  device?: {
    fingerprint: string;
    userAgent: string;
    isMobile: boolean;
  };
  timestamp: Date;
}

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // FRAUD ANALYSIS ENGINE
  // ============================================================================

  async analyzeTransaction(context: TransactionContext, tenantId: string): Promise<FraudAnalysisResult> {
    this.logger.log(`Analyzing transaction ${context.transactionId} for fraud`);

    try {
      // Get active fraud rules
      const rules = await this.getActiveFraudRules(tenantId);
      
      // Initialize analysis result
      let riskScore = 0;
      const reasons: string[] = [];
      let shouldBlock = false;

      // Run rule-based analysis
      for (const rule of rules) {
        const ruleResult = await this.evaluateRule(rule, context, tenantId);
        if (ruleResult.triggered) {
          riskScore += ruleResult.score;
          reasons.push(...ruleResult.reasons);
          if (ruleResult.shouldBlock) {
            shouldBlock = true;
          }
        }
      }

      // Run behavioral analysis
      const behavioralResult = await this.analyzeBehavioralPatterns(context, tenantId);
      riskScore += behavioralResult.score;
      reasons.push(...behavioralResult.reasons);

      // Run device analysis
      if (context.device) {
        const deviceResult = await this.analyzeDevice(context, tenantId);
        riskScore += deviceResult.score;
        reasons.push(...deviceResult.reasons);
      }

      // Run location analysis
      if (context.location) {
        const locationResult = await this.analyzeLocation(context, tenantId);
        riskScore += locationResult.score;
        reasons.push(...locationResult.reasons);
      }

      // Determine risk level
      const riskLevel = this.calculateRiskLevel(riskScore);
      
      // Auto-block for critical risk
      if (riskLevel === 'CRITICAL') {
        shouldBlock = true;
      }

      const result: FraudAnalysisResult = {
        riskScore: Math.min(riskScore, 100), // Cap at 100
        riskLevel,
        reasons: [...new Set(reasons)], // Remove duplicates
        shouldBlock,
        confidence: this.calculateConfidence(riskScore, reasons.length)
      };

      // Create fraud alert if risk is medium or higher
      if (riskLevel !== 'LOW') {
        await this.createFraudAlert({
          transactionId: context.transactionId,
          customerId: context.customerId,
          accountId: context.accountId,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel as FraudRiskLevel,
          reasons: result.reasons,
          status: shouldBlock ? FraudAlertStatus.BLOCKED : FraudAlertStatus.PENDING
        }, tenantId);
      }

      this.logger.log(`Fraud analysis completed: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error(`Error analyzing transaction: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to analyze transaction for fraud');
    }
  }

  private async evaluateRule(rule: FraudRule, context: TransactionContext, tenantId: string): Promise<{
    triggered: boolean;
    score: number;
    reasons: string[];
    shouldBlock: boolean;
  }> {
    const conditions = rule.conditions as any;
    const actions = rule.actions as any;
    
    let triggered = false;
    const reasons: string[] = [];

    // Amount-based rules
    if (conditions.maxAmount && context.amount > conditions.maxAmount) {
      triggered = true;
      reasons.push(`Transaction amount ${context.amount} exceeds limit ${conditions.maxAmount}`);
    }

    // Frequency-based rules
    if (conditions.maxTransactionsPerHour) {
      const recentTransactions = await this.getRecentTransactionCount(
        context.customerId, 
        context.accountId, 
        1, // 1 hour
        tenantId
      );
      
      if (recentTransactions >= conditions.maxTransactionsPerHour) {
        triggered = true;
        reasons.push(`Too many transactions in the last hour: ${recentTransactions}`);
      }
    }

    // Velocity-based rules
    if (conditions.maxVelocityPerDay) {
      const dailyVelocity = await this.getDailyTransactionVelocity(
        context.customerId,
        context.accountId,
        tenantId
      );
      
      if (dailyVelocity > conditions.maxVelocityPerDay) {
        triggered = true;
        reasons.push(`Daily transaction velocity ${dailyVelocity} exceeds limit`);
      }
    }

    return {
      triggered,
      score: triggered ? (actions.riskScore || 10) : 0,
      reasons,
      shouldBlock: triggered && actions.autoBlock === true
    };
  }

  private async analyzeBehavioralPatterns(context: TransactionContext, tenantId: string): Promise<{
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Get customer's transaction history
    const historicalTransactions = await this.getCustomerTransactionHistory(
      context.customerId,
      tenantId,
      30 // Last 30 days
    );

    if (historicalTransactions.length === 0) {
      reasons.push('New customer with no transaction history');
      score += 15;
      return { score, reasons };
    }

    // Analyze amount patterns
    const avgAmount = historicalTransactions.reduce((sum, t) => sum + t.amount, 0) / historicalTransactions.length;
    const amountDeviation = Math.abs(context.amount - avgAmount) / avgAmount;

    if (amountDeviation > 3) { // More than 3x deviation
      reasons.push(`Transaction amount significantly deviates from normal pattern`);
      score += 20;
    } else if (amountDeviation > 2) {
      reasons.push(`Transaction amount moderately deviates from normal pattern`);
      score += 10;
    }

    // Analyze time patterns
    const currentHour = context.timestamp.getHours();
    const historicalHours = historicalTransactions.map(t => new Date(t.timestamp).getHours());
    const isUnusualTime = !historicalHours.includes(currentHour);

    if (isUnusualTime) {
      reasons.push(`Transaction at unusual time (${currentHour}:00)`);
      score += 10;
    }

    // Analyze frequency patterns
    const recentCount = await this.getRecentTransactionCount(
      context.customerId,
      context.accountId,
      24, // Last 24 hours
      tenantId
    );

    const avgDailyTransactions = historicalTransactions.length / 30;
    if (recentCount > avgDailyTransactions * 3) {
      reasons.push(`Unusually high transaction frequency`);
      score += 15;
    }

    return { score, reasons };
  }

  private async analyzeDevice(context: TransactionContext, tenantId: string): Promise<{
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;

    if (!context.device) return { score, reasons };

    // Check if device is trusted
    const trustedDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        customerId: context.customerId,
        deviceFingerprint: context.device.fingerprint,
        isActive: true,
        tenantId
      }
    });

    if (!trustedDevice) {
      reasons.push('Transaction from unrecognized device');
      score += 25;
    } else {
      // Update last used timestamp
      await this.prisma.trustedDevice.update({
        where: { id: trustedDevice.id },
        data: { lastUsedAt: new Date() }
      });
    }

    return { score, reasons };
  }

  private async analyzeLocation(context: TransactionContext, tenantId: string): Promise<{
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 0;

    if (!context.location) return { score, reasons };

    // Get customer's recent locations
    const recentLocations = await this.getCustomerRecentLocations(
      context.customerId,
      tenantId,
      7 // Last 7 days
    );

    const isNewLocation = !recentLocations.some(loc => 
      loc.country === context.location!.country && 
      loc.city === context.location!.city
    );

    if (isNewLocation) {
      reasons.push(`Transaction from new location: ${context.location.city}, ${context.location.country}`);
      score += 20;
    }

    // Check for high-risk countries (this would be configurable)
    const highRiskCountries = ['XX', 'YY']; // Placeholder
    if (highRiskCountries.includes(context.location.country)) {
      reasons.push(`Transaction from high-risk country: ${context.location.country}`);
      score += 30;
    }

    return { score, reasons };
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private calculateConfidence(score: number, reasonCount: number): number {
    // Confidence increases with score and number of reasons
    const baseConfidence = Math.min(score / 100, 1);
    const reasonBonus = Math.min(reasonCount * 0.1, 0.3);
    return Math.min(baseConfidence + reasonBonus, 1) * 100;
  }

  // ============================================================================
  // FRAUD ALERTS MANAGEMENT
  // ============================================================================

  async createFraudAlert(createFraudAlertDto: CreateFraudAlertDto, tenantId: string): Promise<FraudAlert> {
    const {
      transactionId,
      customerId,
      accountId,
      riskScore,
      riskLevel,
      reasons,
      status = FraudAlertStatus.PENDING,
      reviewedBy,
      reviewNotes,
      reviewedAt
    } = createFraudAlertDto;

    const normalizedRiskLevel = riskLevel ?? FraudRiskLevel.MEDIUM;

    const data: Prisma.FraudAlertUncheckedCreateInput = {
      tenantId,
      transactionId,
      customerId,
      accountId,
      description: `Fraud alert for transaction ${transactionId}`,
      type: 'transaction',
      severity: this.mapRiskLevelToSeverity(normalizedRiskLevel),
      status,
      details: { reasons } as Prisma.JsonObject,
      score: riskScore,
      riskLevel: normalizedRiskLevel,
      riskScore,
      reasons,
      reviewedBy,
      reviewNotes,
      reviewedAt
    };

    return this.prisma.fraudAlert.create({ data });
  }

  async getFraudAlerts(tenantId: string, filters?: {
    status?: string;
    riskLevel?: string;
    customerId?: string;
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FraudAlert[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.riskLevel) where.riskLevel = filters.riskLevel;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.accountId) where.accountId = filters.accountId;
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.fraudAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getFraudAlert(id: string, tenantId: string): Promise<FraudAlert> {
    const alert = await this.prisma.fraudAlert.findFirst({
      where: { id, tenantId }
    });

    if (!alert) {
      throw new NotFoundException('Fraud alert not found');
    }

    return alert;
  }

  async updateFraudAlert(id: string, updateFraudAlertDto: UpdateFraudAlertDto, tenantId: string): Promise<FraudAlert> {
    const alert = await this.getFraudAlert(id, tenantId);

    return this.prisma.fraudAlert.update({
      where: { id: alert.id },
      data: updateFraudAlertDto
    });
  }

  async reviewFraudAlert(id: string, reviewData: {
    status: 'APPROVED' | 'REJECTED' | 'FALSE_POSITIVE';
    reviewNotes?: string;
    reviewedBy: string;
  }, tenantId: string): Promise<FraudAlert> {
    return this.updateFraudAlert(id, {
      status: reviewData.status as FraudAlertStatus,
      reviewNotes: reviewData.reviewNotes,
      reviewedBy: reviewData.reviewedBy,
      reviewedAt: new Date()
    }, tenantId);
  }

  // ============================================================================
  // FRAUD RULES MANAGEMENT
  // ============================================================================

  async createFraudRule(createFraudRuleDto: CreateFraudRuleDto, tenantId: string): Promise<FraudRule> {
    const data: Prisma.FraudRuleUncheckedCreateInput = {
      tenantId,
      name: createFraudRuleDto.name,
      description: createFraudRuleDto.description,
      type: createFraudRuleDto.ruleType,
      conditions: createFraudRuleDto.conditions as Prisma.InputJsonValue,
      actions: createFraudRuleDto.actions as Prisma.InputJsonValue,
      isActive: createFraudRuleDto.isActive ?? true,
      priority: createFraudRuleDto.priority ?? 1
    };

    return this.prisma.fraudRule.create({ data });
  }

  async getFraudRules(tenantId: string, activeOnly = false): Promise<FraudRule[]> {
    const where: any = { tenantId };
    if (activeOnly) where.isActive = true;

    return this.prisma.fraudRule.findMany({
      where,
      orderBy: { priority: 'desc' }
    });
  }

  async getActiveFraudRules(tenantId: string): Promise<FraudRule[]> {
    return this.getFraudRules(tenantId, true);
  }

  async getFraudRule(id: string, tenantId: string): Promise<FraudRule> {
    const rule = await this.prisma.fraudRule.findFirst({
      where: { id, tenantId }
    });

    if (!rule) {
      throw new NotFoundException('Fraud rule not found');
    }

    return rule;
  }

  async updateFraudRule(id: string, updateFraudRuleDto: UpdateFraudRuleDto, tenantId: string): Promise<FraudRule> {
    const rule = await this.getFraudRule(id, tenantId);

    const { ruleType, ...rest } = updateFraudRuleDto;

    return this.prisma.fraudRule.update({
      where: { id: rule.id },
      data: {
        ...rest,
        type: ruleType ?? rule.type,
        conditions: rest.conditions ? rest.conditions as Prisma.InputJsonValue : undefined,
        actions: rest.actions ? rest.actions as Prisma.InputJsonValue : undefined
      }
    });
  }

  async deleteFraudRule(id: string, tenantId: string): Promise<void> {
    const rule = await this.getFraudRule(id, tenantId);

    await this.prisma.fraudRule.delete({
      where: { id: rule.id }
    });
  }

  // ============================================================================
  // TRUSTED DEVICES MANAGEMENT
  // ============================================================================

  async registerTrustedDevice(customerId: string, deviceData: {
    deviceFingerprint: string;
    deviceInfo?: any;
  }, tenantId: string): Promise<TrustedDevice> {
    // Check if device already exists
    const existingDevice = await this.prisma.trustedDevice.findFirst({
      where: {
        customerId,
        deviceFingerprint: deviceData.deviceFingerprint,
        tenantId
      }
    });

    if (existingDevice) {
      // Reactivate if inactive
      if (!existingDevice.isActive) {
        return this.prisma.trustedDevice.update({
          where: { id: existingDevice.id },
          data: {
            isActive: true,
            lastUsedAt: new Date(),
            deviceInfo: deviceData.deviceInfo as Prisma.InputJsonValue || existingDevice.deviceInfo
          }
        });
      }
      return existingDevice;
    }

    return this.prisma.trustedDevice.create({
      data: {
        tenantId,
        customerId,
        deviceFingerprint: deviceData.deviceFingerprint,
        deviceInfo: deviceData.deviceInfo as Prisma.InputJsonValue,
        registeredAt: new Date(),
        lastUsedAt: new Date()
      }
    });
  }

  async getTrustedDevices(customerId: string, tenantId: string): Promise<TrustedDevice[]> {
    return this.prisma.trustedDevice.findMany({
      where: {
        customerId,
        tenantId,
        isActive: true
      },
      orderBy: { lastUsedAt: 'desc' }
    });
  }

  async revokeTrustedDevice(id: string, _tenantId: string): Promise<void> {
    await this.prisma.trustedDevice.update({
      where: { id },
      data: { isActive: false }
    });
  }

  // ============================================================================
  // FRAUD STATISTICS
  // ============================================================================

  async getFraudStatistics(tenantId: string, startDate?: Date, endDate?: Date): Promise<FraudStatistics[]> {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.fraudStatistics.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }

  async generateDailyFraudStatistics(date: Date, tenantId: string): Promise<FraudStatistics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get alerts for the day
    const alerts = await this.prisma.fraudAlert.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.riskLevel === 'CRITICAL').length;
    const highRiskAlerts = alerts.filter(a => a.riskLevel === 'HIGH').length;
    const mediumRiskAlerts = alerts.filter(a => a.riskLevel === 'MEDIUM').length;
    const lowRiskAlerts = alerts.filter(a => a.riskLevel === 'LOW').length;
    const blockedTransactions = alerts.filter(a => a.status === 'BLOCKED').length;
    const falsePositives = alerts.filter(a => a.status === 'FALSE_POSITIVE').length;
    
    const averageRiskScore = totalAlerts > 0 
      ? alerts.reduce((sum, a) => sum + a.riskScore, 0) / totalAlerts 
      : 0;

    // TODO: Implement when fraud_statistics model is added to schema
    // Upsert statistics - temporarily return calculated data
    return {
      id: `temp-${Date.now()}`,
      date: startOfDay,
      totalAlerts,
      criticalAlerts,
      highRiskAlerts,
      mediumRiskAlerts,
      lowRiskAlerts,
      blockedTransactions,
      falsePositives,
      averageRiskScore,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getRecentTransactionCount(
    customerId: string, 
    accountId: string, 
    hours: number, 
    tenantId: string
  ): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const count = await this.prisma.bankTransaction.count({
      where: {
        accountId,
        createdAt: { gte: since },
        tenantId
      }
    });

    return count;
  }

  private async getDailyTransactionVelocity(
    customerId: string,
    accountId: string,
    tenantId: string
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        accountId,
        createdAt: { gte: today },
        tenantId
      }
    });

    return transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  private async getCustomerTransactionHistory(
    customerId: string,
    tenantId: string,
    days: number
  ): Promise<any[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would need to be adjusted based on your actual transaction model
    return this.prisma.bankTransaction.findMany({
      where: {
        // customerId, // Assuming you have this field
        createdAt: { gte: since },
        tenantId
      },
      select: {
        amount: true,
        createdAt: true,
        type: true
      }
    });
  }

  private async getCustomerRecentLocations(
    _customerId: string,
    _tenantId: string,
    _days: number
  ): Promise<Array<{ country: string; city: string }>> {
    // This would typically come from transaction metadata or audit logs
    // For now, return empty array as placeholder
    return [];
  }

  private mapRiskLevelToSeverity(riskLevel: FraudRiskLevel): string {
    switch (riskLevel) {
      case FraudRiskLevel.CRITICAL:
        return 'critical';
      case FraudRiskLevel.HIGH:
        return 'high';
      case FraudRiskLevel.MEDIUM:
        return 'medium';
      case FraudRiskLevel.LOW:
      default:
        return 'low';
    }
  }
}
