// path: src/banking/services/fraud-detection.service.ts
// purpose: Advanced Fraud Detection Service - Real-time monitoring and ML-based risk scoring
// dependencies: ConfigService, Redis, BullMQ, ML models, geolocation APIs

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface FraudAlert {
  id: string;
  transactionId: string;
  customerId: string;
  accountId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  timestamp: Date;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'BLOCKED';
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface TransactionRiskFactors {
  amount: number;
  currency: string;
  merchantCategory: string;
  location: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
  deviceFingerprint?: string;
  ipAddress: string;
  timestamp: Date;
  paymentMethod: string;
}

export interface CustomerBehaviorProfile {
  customerId: string;
  averageTransactionAmount: number;
  typicalMerchantCategories: string[];
  usualLocations: string[];
  transactionFrequency: number;
  timePatterns: number[]; // Hours of day (0-23)
  lastUpdated: Date;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  
  // TODO: Remove when Redis is properly configured
  private readonly tempStorage = new Map<string, any>();
  
  // Helper methods to simulate Redis operations
  private async tempGet(key: string): Promise<string | null> {
    return this.tempStorage.get(key) || null;
  }
  
  private async tempSetex(key: string, seconds: number, value: string): Promise<void> {
    this.tempStorage.set(key, value);
  }
  
  private async tempIncr(key: string): Promise<number> {
    const current = parseInt(this.tempStorage.get(key) || '0');
    const newValue = current + 1;
    this.tempStorage.set(key, newValue.toString());
    return newValue;
  }
  
  private async tempExpire(_key: string, _seconds: number): Promise<void> {
    // Note: TTL not implemented in temp storage
  }
  
  private async tempSadd(key: string, value: string): Promise<void> {
    const set = this.tempStorage.get(key) || new Set();
    set.add(value);
    this.tempStorage.set(key, set);
  }
  
  private async tempSmembers(key: string): Promise<string[]> {
    const set = this.tempStorage.get(key) || new Set();
    return Array.from(set);
  }
  
  private async tempLpush(key: string, value: string): Promise<void> {
    const list = this.tempStorage.get(key) || [];
    list.unshift(value);
    this.tempStorage.set(key, list);
  }
  
  private async tempLrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.tempStorage.get(key) || [];
    return list.slice(start, stop + 1);
  }

  constructor(
    private readonly cfg: ConfigService,
    // TODO: Add Redis injection when Redis module is properly configured
    // @InjectRedis() private readonly redis: Redis,
    @InjectQueue('fraud-analysis') private readonly fraudQueue: Queue,
  ) {}

  // ============================================================================
  // REAL-TIME FRAUD DETECTION
  // ============================================================================

  async analyzeTransaction(
    transactionId: string,
    customerId: string,
    accountId: string,
    riskFactors: TransactionRiskFactors
  ): Promise<FraudAlert | null> {
    try {
      this.logger.log(`Analyzing transaction ${transactionId} for fraud`);

      // Get customer behavior profile
      const profile = await this.getCustomerProfile(customerId);
      
      // Calculate risk score
      const riskScore = await this.calculateRiskScore(riskFactors, profile, customerId);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);

      // If risk is significant, create alert
      if (riskLevel !== 'LOW') {
        const reasons = await this.identifyRiskReasons(riskFactors, profile, customerId);
        
        const alert: FraudAlert = {
          id: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId,
          customerId,
          accountId,
          riskScore,
          riskLevel,
          reasons,
          timestamp: new Date(),
          status: 'PENDING'
        };

        // Store alert
        await this.storeAlert(alert);

        // Queue for detailed analysis if critical
        if (riskLevel === 'CRITICAL') {
          await this.fraudQueue.add('critical-analysis', {
            alertId: alert.id,
            transactionId,
            customerId
          }, { priority: 1 });
        }

        return alert;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error analyzing transaction ${transactionId}: ${error.message}`);
      throw error;
    }
  }

  private async calculateRiskScore(
    factors: TransactionRiskFactors,
    profile: CustomerBehaviorProfile,
    customerId: string
  ): Promise<number> {
    let score = 0;

    // Amount-based risk
    if (profile && factors.amount > profile.averageTransactionAmount * 5) {
      score += 30; // Large transaction
    } else if (profile && factors.amount > profile.averageTransactionAmount * 2) {
      score += 15; // Moderately large transaction
    }

    // Location-based risk
    if (profile && !profile.usualLocations.includes(factors.location.country)) {
      score += 25; // New country
    }

    // Time-based risk
    const hour = factors.timestamp.getHours();
    if (profile && !profile.timePatterns.includes(hour)) {
      score += 10; // Unusual time
    }

    // Merchant category risk
    if (profile && !profile.typicalMerchantCategories.includes(factors.merchantCategory)) {
      score += 15; // New merchant category
    }

    // Frequency-based risk
    const recentTransactions = await this.getRecentTransactionCount(
      customerId,
      60 // Last 60 minutes
    );
    if (recentTransactions > 10) {
      score += 40; // Too many transactions
    } else if (recentTransactions > 5) {
      score += 20; // Many transactions
    }

    // IP/Device risk
    if (factors.deviceFingerprint) {
      const isKnownDevice = await this.isKnownDevice(
        customerId,
        factors.deviceFingerprint
      );
      if (!isKnownDevice) {
        score += 20; // New device
      }
    }

    // Geolocation velocity check
    const velocityRisk = await this.checkVelocityRisk(
      customerId,
      factors.location.coordinates
    );
    score += velocityRisk;

    return Math.min(score, 100); // Cap at 100
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private async identifyRiskReasons(
    factors: TransactionRiskFactors,
    profile: CustomerBehaviorProfile,
    customerId: string
  ): Promise<string[]> {
    const reasons: string[] = [];

    if (profile && factors.amount > profile.averageTransactionAmount * 5) {
      reasons.push('Transaction amount significantly higher than usual');
    }

    if (profile && !profile.usualLocations.includes(factors.location.country)) {
      reasons.push('Transaction from new geographic location');
    }

    const hour = factors.timestamp.getHours();
    if (profile && !profile.timePatterns.includes(hour)) {
      reasons.push('Transaction at unusual time');
    }

    if (profile && !profile.typicalMerchantCategories.includes(factors.merchantCategory)) {
      reasons.push('New merchant category');
    }

    const recentTransactions = await this.getRecentTransactionCount(
      customerId,
      60
    );
    if (recentTransactions > 10) {
      reasons.push('High transaction frequency detected');
    }

    return reasons;
  }

  // ============================================================================
  // CUSTOMER BEHAVIOR PROFILING
  // ============================================================================

  async getCustomerProfile(customerId: string): Promise<CustomerBehaviorProfile | null> {
    try {
      // TODO: Add Redis caching when Redis module is properly configured
      // const cached = await this.redis.get(`fraud:profile:${customerId}`);
      // if (cached) {
      //   return JSON.parse(cached);
      // }

      // Build profile from transaction history
      const profile = await this.buildCustomerProfile(customerId);
      
      // TODO: Add Redis caching when Redis module is properly configured
      // if (profile) {
      //   // Cache for 1 hour
      //   await this.redis.setex(
      //     `fraud:profile:${customerId}`,
      //     3600,
      //     JSON.stringify(profile)
      //   );
      // }

      return profile;
    } catch (error) {
      this.logger.error(`Error getting customer profile ${customerId}: ${error.message}`);
      return null;
    }
  }

  private async buildCustomerProfile(customerId: string): Promise<CustomerBehaviorProfile | null> {
    // This would typically query your transaction database
    // For now, return a mock profile
    return {
      customerId,
      averageTransactionAmount: 150.00,
      typicalMerchantCategories: ['grocery', 'gas', 'restaurant'],
      usualLocations: ['US', 'CA'],
      transactionFrequency: 5, // per day
      timePatterns: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      lastUpdated: new Date()
    };
  }

  async updateCustomerProfile(customerId: string, transaction: any): Promise<void> {
    try {
      const profile = await this.getCustomerProfile(customerId);
      if (!profile) return;

      // Update profile with new transaction data
      // This is a simplified update - in production, you'd use more sophisticated algorithms
      
      // Update average amount (moving average)
      profile.averageTransactionAmount = 
        (profile.averageTransactionAmount * 0.9) + (transaction.amount * 0.1);

      // Add new merchant category if not present
      if (!profile.typicalMerchantCategories.includes(transaction.merchantCategory)) {
        profile.typicalMerchantCategories.push(transaction.merchantCategory);
        // Keep only top 10 categories
        if (profile.typicalMerchantCategories.length > 10) {
          profile.typicalMerchantCategories = profile.typicalMerchantCategories.slice(-10);
        }
      }

      // Add new location if not present
      if (!profile.usualLocations.includes(transaction.location.country)) {
        profile.usualLocations.push(transaction.location.country);
        // Keep only top 5 locations
        if (profile.usualLocations.length > 5) {
          profile.usualLocations = profile.usualLocations.slice(-5);
        }
      }

      // Update time patterns
      const hour = new Date(transaction.timestamp).getHours();
      if (!profile.timePatterns.includes(hour)) {
        profile.timePatterns.push(hour);
      }

      profile.lastUpdated = new Date();

      // Cache updated profile
      await this.tempSetex(
        `fraud:profile:${customerId}`,
        3600,
        JSON.stringify(profile)
      );
    } catch (error) {
      this.logger.error(`Error updating customer profile ${customerId}: ${error.message}`);
    }
  }

  // ============================================================================
  // VELOCITY AND DEVICE CHECKS
  // ============================================================================

  private async getRecentTransactionCount(customerId: string, _minutes: number): Promise<number> {
    try {
      const key = `fraud:txn_count:${customerId}`;
      const count = await this.tempGet(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      this.logger.error(`Error getting transaction count: ${error.message}`);
      return 0;
    }
  }

  async recordTransaction(customerId: string): Promise<void> {
    try {
      const key = `fraud:txn_count:${customerId}`;
      await this.tempIncr(key);
      await this.tempExpire(key, 3600); // Expire in 1 hour
    } catch (error) {
      this.logger.error(`Error recording transaction: ${error.message}`);
    }
  }

  private async isKnownDevice(customerId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      const key = `fraud:devices:${customerId}`;
      const devices = await this.tempSmembers(key);
      return devices.includes(deviceFingerprint);
    } catch (error) {
      this.logger.error(`Error checking device: ${error.message}`);
      return false;
    }
  }

  async registerDevice(customerId: string, deviceFingerprint: string): Promise<void> {
    try {
      const key = `fraud:devices:${customerId}`;
      await this.tempSadd(key, deviceFingerprint);
      await this.tempExpire(key, 86400 * 30); // 30 days
    } catch (error) {
      this.logger.error(`Error registering device: ${error.message}`);
    }
  }

  private async checkVelocityRisk(
    customerId: string,
    coordinates?: [number, number]
  ): Promise<number> {
    if (!coordinates) return 0;

    try {
      const key = `fraud:location:${customerId}`;
      const lastLocationData = await this.tempGet(key);
      
      if (!lastLocationData) {
        // Store current location
        await this.tempSetex(key, 3600, JSON.stringify({
          coordinates,
          timestamp: Date.now()
        }));
        return 0;
      }

      const lastLocation = JSON.parse(lastLocationData);
      const timeDiff = (Date.now() - lastLocation.timestamp) / 1000 / 60; // minutes
      
      if (timeDiff < 60) { // Less than 1 hour
        const distance = this.calculateDistance(
          coordinates,
          lastLocation.coordinates
        );
        
        // If traveled more than 500km in less than 1 hour
        if (distance > 500) {
          return 50; // High velocity risk
        } else if (distance > 100) {
          return 25; // Medium velocity risk
        }
      }

      // Update location
      await this.tempSetex(key, 3600, JSON.stringify({
        coordinates,
        timestamp: Date.now()
      }));

      return 0;
    } catch (error) {
      this.logger.error(`Error checking velocity risk: ${error.message}`);
      return 0;
    }
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2[0] - coord1[0]);
    const dLon = this.toRad(coord2[1] - coord1[1]);
    const lat1 = this.toRad(coord1[0]);
    const lat2 = this.toRad(coord2[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  private async storeAlert(alert: FraudAlert): Promise<void> {
    try {
      const key = `fraud:alert:${alert.id}`;
      await this.tempSetex(key, 86400 * 7, JSON.stringify(alert)); // 7 days

      // Add to customer's alert list
      const customerKey = `fraud:alerts:${alert.customerId}`;
      await this.tempLpush(customerKey, alert.id);
      await this.tempExpire(customerKey, 86400 * 30); // 30 days
    } catch (error) {
      this.logger.error(`Error storing alert: ${error.message}`);
    }
  }

  async getAlert(alertId: string): Promise<FraudAlert | null> {
    try {
      const key = `fraud:alert:${alertId}`;
      const data = await this.tempGet(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting alert: ${error.message}`);
      return null;
    }
  }

  async getCustomerAlerts(customerId: string, limit: number = 10): Promise<FraudAlert[]> {
    try {
      const customerKey = `fraud:alerts:${customerId}`;
      const alertIds = await this.tempLrange(customerKey, 0, limit - 1);
      
      const alerts: FraudAlert[] = [];
      for (const alertId of alertIds) {
        const alert = await this.getAlert(alertId);
        if (alert) alerts.push(alert);
      }
      
      return alerts;
    } catch (error) {
      this.logger.error(`Error getting customer alerts: ${error.message}`);
      return [];
    }
  }

  async updateAlertStatus(
    alertId: string,
    status: 'REVIEWED' | 'APPROVED' | 'BLOCKED',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    try {
      const alert = await this.getAlert(alertId);
      if (!alert) throw new Error('Alert not found');

      alert.status = status;
      alert.reviewedBy = reviewedBy;
      alert.reviewNotes = reviewNotes;

      const key = `fraud:alert:${alertId}`;
      await this.tempSetex(key, 86400 * 7, JSON.stringify(alert));
    } catch (error) {
      this.logger.error(`Error updating alert status: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // MACHINE LEARNING INTEGRATION
  // ============================================================================

  async trainFraudModel(trainingData: any[]): Promise<void> {
    try {
      this.logger.log('Training fraud detection model');
      
      // Queue ML training job
      await this.fraudQueue.add('train-model', {
        data: trainingData,
        timestamp: new Date()
      }, { 
        priority: 5,
        delay: 1000 // 1 second delay
      });
    } catch (error) {
      this.logger.error(`Error training fraud model: ${error.message}`);
    }
  }

  async getPrediction(_features: any): Promise<{ riskScore: number; confidence: number }> {
    try {
      // This would integrate with your ML model
      // For now, return a mock prediction
      return {
        riskScore: Math.random() * 100,
        confidence: 0.85
      };
    } catch (error) {
      this.logger.error(`Error getting ML prediction: ${error.message}`);
      return { riskScore: 50, confidence: 0.5 };
    }
  }

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  async getFraudStatistics(_startDate: Date, _endDate: Date): Promise<any> {
    try {
      // This would query your database for fraud statistics
      return {
        totalAlerts: 150,
        criticalAlerts: 25,
        highRiskAlerts: 45,
        mediumRiskAlerts: 80,
        blockedTransactions: 15,
        falsePositives: 5,
        averageRiskScore: 35.2,
        topRiskFactors: [
          'Unusual location',
          'High transaction amount',
          'New device',
          'High frequency'
        ]
      };
    } catch (error) {
      this.logger.error(`Error getting fraud statistics: ${error.message}`);
      throw error;
    }
  }

  async generateFraudReport(customerId?: string): Promise<any> {
    try {
      const report = {
        generatedAt: new Date(),
        customerId,
        summary: await this.getFraudStatistics(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          new Date()
        ),
        recommendations: [
          'Implement additional device verification',
          'Enhance geolocation checks',
          'Review transaction limits',
          'Update ML model with recent data'
        ]
      };

      return report;
    } catch (error) {
      this.logger.error(`Error generating fraud report: ${error.message}`);
      throw error;
    }
  }
}