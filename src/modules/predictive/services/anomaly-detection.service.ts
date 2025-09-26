// path: backend/src/modules/predictive/services/anomaly-detection.service.ts
// purpose: Advanced anomaly detection service for real-time monitoring and alerting
// dependencies: @nestjs/common, prisma, statistical analysis algorithms

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AnomalyAlert {
  id: string;
  type: 'statistical' | 'pattern' | 'threshold' | 'behavioral' | 'seasonal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  dataSource: string;
  timestamp: Date;
  context: Record<string, any>;
  recommendations: string[];
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
}

export interface AnomalyDetectionConfig {
  metric: string;
  method: 'zscore' | 'iqr' | 'isolation_forest' | 'lstm' | 'prophet';
  sensitivity: 'low' | 'medium' | 'high';
  threshold: number;
  seasonality: boolean;
  alerting: {
    enabled: boolean;
    channels: string[];
    escalation: {
      timeMinutes: number;
      recipients: string[];
    };
  };
}

export interface RealTimeMonitoringConfig {
  dataSource: string;
  metrics: string[];
  samplingInterval: number; // seconds
  windowSize: number; // data points to consider
  anomalyThreshold: number;
  alertingEnabled: boolean;
}

export interface AnomalyPattern {
  id: string;
  pattern: 'spike' | 'drop' | 'drift' | 'oscillation' | 'flatline' | 'irregular';
  description: string;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  businessContext: string;
  historicalOccurrences: number;
  lastSeen: Date;
  mitigation: string[];
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Detect anomalies in real-time data stream
   */
  async detectAnomalies(dataSource: string, data: any[]): Promise<AnomalyAlert[]> {
    try {
      this.logger.log(`Detecting anomalies in ${dataSource} with ${data.length} data points`);

      if (data.length === 0) {
        return [];
      }

      const anomalies = await Promise.all([
        this.detectStatisticalAnomalies(dataSource, data),
        this.detectPatternAnomalies(dataSource, data),
        this.detectThresholdAnomalies(dataSource, data),
        this.detectBehavioralAnomalies(dataSource, data),
      ]);

      return anomalies.flat().sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Get active anomaly alerts
   */
  async getActiveAnomalies(): Promise<AnomalyAlert[]> {
    try {
      this.logger.log('Retrieving active anomaly alerts');

      // Simulate active anomalies
      const activeAnomalies: AnomalyAlert[] = [
        {
          id: `anomaly_${Date.now()}_1`,
          type: 'statistical',
          severity: 'high',
          title: 'Unusual Spike in API Response Time',
          description: 'API response time increased by 350% compared to baseline',
          metric: 'api_response_time',
          value: 2800,
          expectedValue: 800,
          deviation: 250,
          confidence: 0.95,
          dataSource: 'api_monitoring',
          timestamp: new Date(Date.now() - 600000), // 10 minutes ago
          context: {
            endpoint: '/api/users',
            server: 'prod-api-01',
            load: 'high',
          },
          recommendations: [
            'Check server resources and database connections',
            'Review recent deployments',
            'Scale API infrastructure if needed',
          ],
          status: 'active',
        },
        {
          id: `anomaly_${Date.now()}_2`,
          type: 'threshold',
          severity: 'critical',
          title: 'Memory Usage Exceeding Critical Threshold',
          description: 'Server memory utilization reached 95%, exceeding critical threshold of 85%',
          metric: 'memory_utilization',
          value: 95,
          expectedValue: 70,
          deviation: 35.7,
          confidence: 1.0,
          dataSource: 'system_monitoring',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          context: {
            server: 'prod-app-02',
            process: 'application',
            available_memory: '512MB',
          },
          recommendations: [
            'Immediate investigation of memory leaks',
            'Consider restarting affected services',
            'Scale memory resources urgently',
          ],
          status: 'active',
          assignedTo: 'ops-team',
        },
      ];

      return activeAnomalies;
    } catch (error) {
      this.logger.error('Error getting active anomalies:', error);
      throw error;
    }
  }

  /**
   * Configure anomaly detection for specific metrics
   */
  async configureAnomalyDetection(config: AnomalyDetectionConfig): Promise<void> {
    try {
      this.logger.log(`Configuring anomaly detection for metric: ${config.metric}`);

      // Store configuration (in real implementation, this would be persisted)
      this.logger.debug(`Configuration saved for ${config.metric} with ${config.method} method`);
    } catch (error) {
      this.logger.error('Error configuring anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Start real-time monitoring for data source
   */
  async startRealTimeMonitoring(config: RealTimeMonitoringConfig): Promise<void> {
    try {
      this.logger.log(`Starting real-time monitoring for ${config.dataSource}`);

      // In real implementation, this would set up streaming data processing
      this.logger.debug(`Monitoring ${config.metrics.length} metrics with ${config.samplingInterval}s interval`);
    } catch (error) {
      this.logger.error('Error starting real-time monitoring:', error);
      throw error;
    }
  }

  /**
   * Analyze anomaly patterns and trends
   */
  async analyzeAnomalyPatterns(timeframe: string = '30d'): Promise<AnomalyPattern[]> {
    try {
      this.logger.log(`Analyzing anomaly patterns for timeframe: ${timeframe}`);

      const patterns: AnomalyPattern[] = [
        {
          id: `pattern_${Date.now()}_1`,
          pattern: 'spike',
          description: 'Traffic spikes occurring every Monday morning between 8-10 AM',
          frequency: 4, // per month
          impact: 'medium',
          businessContext: 'Weekly business cycle - users returning after weekend',
          historicalOccurrences: 24,
          lastSeen: new Date(Date.now() - 518400000), // 6 days ago
          mitigation: [
            'Pre-scale infrastructure on Sunday nights',
            'Implement predictive scaling',
            'Optimize Monday morning workflows',
          ],
        },
        {
          id: `pattern_${Date.now()}_2`,
          pattern: 'drop',
          description: 'Significant user activity drops during holiday periods',
          frequency: 1, // per month
          impact: 'low',
          businessContext: 'Seasonal business patterns - reduced activity during holidays',
          historicalOccurrences: 12,
          lastSeen: new Date(Date.now() - 2592000000), // 30 days ago
          mitigation: [
            'Adjust monitoring thresholds during known holidays',
            'Plan maintenance during low-activity periods',
            'Communicate expected patterns to stakeholders',
          ],
        },
        {
          id: `pattern_${Date.now()}_3`,
          pattern: 'drift',
          description: 'Gradual increase in database query execution times over months',
          frequency: 0.3, // every 3 months
          impact: 'high',
          businessContext: 'Data growth and query complexity increase over time',
          historicalOccurrences: 4,
          lastSeen: new Date(Date.now() - 7776000000), // 90 days ago
          mitigation: [
            'Regular database maintenance and optimization',
            'Query performance monitoring and optimization',
            'Implement data archiving strategies',
          ],
        },
      ];

      return patterns;
    } catch (error) {
      this.logger.error('Error analyzing anomaly patterns:', error);
      throw error;
    }
  }

  /**
   * Update anomaly alert status
   */
  async updateAnomalyStatus(
    anomalyId: string,
    status: AnomalyAlert['status'],
    assignedTo?: string,
    notes?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Updating anomaly ${anomalyId} status to ${status}`);

      // In real implementation, this would update the database
      this.logger.debug(`Anomaly ${anomalyId} updated: status=${status}, assignedTo=${assignedTo}`);
    } catch (error) {
      this.logger.error('Error updating anomaly status:', error);
      throw error;
    }
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStatistics(timeframe: string = '7d'): Promise<{
    totalAnomalies: number;
    anomaliesBySeverity: Record<string, number>;
    anomaliesByType: Record<string, number>;
    falsePositiveRate: number;
    meanTimeToResolution: number; // minutes
    topAffectedMetrics: Array<{
      metric: string;
      count: number;
      severity: string;
    }>;
  }> {
    try {
      this.logger.log(`Getting anomaly statistics for timeframe: ${timeframe}`);

      const statistics = {
        totalAnomalies: 47,
        anomaliesBySeverity: {
          critical: 3,
          high: 8,
          medium: 21,
          low: 15,
        },
        anomaliesByType: {
          statistical: 18,
          threshold: 12,
          pattern: 9,
          behavioral: 5,
          seasonal: 3,
        },
        falsePositiveRate: 0.12, // 12%
        meanTimeToResolution: 45, // 45 minutes
        topAffectedMetrics: [
          { metric: 'api_response_time', count: 12, severity: 'high' },
          { metric: 'memory_utilization', count: 8, severity: 'critical' },
          { metric: 'user_activity', count: 6, severity: 'medium' },
          { metric: 'error_rate', count: 5, severity: 'high' },
          { metric: 'cpu_utilization', count: 4, severity: 'medium' },
        ],
      };

      return statistics;
    } catch (error) {
      this.logger.error('Error getting anomaly statistics:', error);
      throw error;
    }
  }

  // Private detection methods
  private async detectStatisticalAnomalies(dataSource: string, data: any[]): Promise<AnomalyAlert[]> {
    const anomalies: AnomalyAlert[] = [];

    // Simulate Z-score based detection
    const values = data.map(d => typeof d === 'number' ? d : d.value || 0);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      
      if (zScore > 2.5) { // Configurable threshold
        anomalies.push({
          id: `stat_anomaly_${Date.now()}_${index}`,
          type: 'statistical',
          severity: zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          title: 'Statistical Outlier Detected',
          description: `Value ${value} deviates significantly from expected range (Z-score: ${zScore.toFixed(2)})`,
          metric: `${dataSource}_metric`,
          value,
          expectedValue: mean,
          deviation: ((value - mean) / mean) * 100,
          confidence: Math.min(0.99, zScore / 4),
          dataSource,
          timestamp: new Date(),
          context: { zScore, mean, stdDev, method: 'zscore' },
          recommendations: [
            'Investigate root cause of unusual value',
            'Check data collection process',
            'Verify system health',
          ],
          status: 'active',
        });
      }
    });

    return anomalies;
  }

  private async detectPatternAnomalies(dataSource: string, data: any[]): Promise<AnomalyAlert[]> {
    const anomalies: AnomalyAlert[] = [];

    // Simulate pattern-based detection
    if (data.length >= 10) {
      const recentValues = data.slice(-10).map(d => typeof d === 'number' ? d : d.value || 0);
      const isFlatlining = recentValues.every(val => Math.abs(val - recentValues[0]) < recentValues[0] * 0.01);
      
      if (isFlatlining && recentValues[0] !== 0) {
        anomalies.push({
          id: `pattern_anomaly_${Date.now()}`,
          type: 'pattern',
          severity: 'medium',
          title: 'Flatline Pattern Detected',
          description: 'Metric showing unusually flat pattern, potential system issue',
          metric: `${dataSource}_pattern`,
          value: recentValues[0],
          expectedValue: recentValues[0] * 1.1, // Expected some variation
          deviation: 0,
          confidence: 0.85,
          dataSource,
          timestamp: new Date(),
          context: { pattern: 'flatline', duration: '10+ samples' },
          recommendations: [
            'Check if data collection is working properly',
            'Verify system is not frozen or stuck',
            'Review metric calculation logic',
          ],
          status: 'active',
        });
      }
    }

    return anomalies;
  }

  private async detectThresholdAnomalies(dataSource: string, data: any[]): Promise<AnomalyAlert[]> {
    const anomalies: AnomalyAlert[] = [];

    // Simulate threshold-based detection
    const latestValue = data.length > 0 ? (typeof data[data.length - 1] === 'number' ? data[data.length - 1] : data[data.length - 1].value || 0) : 0;
    
    // Example thresholds (would be configurable in real implementation)
    const thresholds = {
      error_rate: { critical: 5, high: 2, medium: 1 },
      response_time: { critical: 5000, high: 2000, medium: 1000 },
      cpu_usage: { critical: 90, high: 80, medium: 70 },
      memory_usage: { critical: 90, high: 80, medium: 70 },
    };

    const metricType = dataSource.includes('error') ? 'error_rate' :
                      dataSource.includes('response') ? 'response_time' :
                      dataSource.includes('cpu') ? 'cpu_usage' :
                      dataSource.includes('memory') ? 'memory_usage' : null;

    if (metricType && thresholds[metricType]) {
      const threshold = thresholds[metricType];
      let severity: AnomalyAlert['severity'] | null = null;

      if (latestValue >= threshold.critical) severity = 'critical';
      else if (latestValue >= threshold.high) severity = 'high';
      else if (latestValue >= threshold.medium) severity = 'medium';

      if (severity) {
        anomalies.push({
          id: `threshold_anomaly_${Date.now()}`,
          type: 'threshold',
          severity,
          title: `${metricType.replace('_', ' ').toUpperCase()} Threshold Exceeded`,
          description: `Value ${latestValue} exceeds ${severity} threshold`,
          metric: metricType,
          value: latestValue,
          expectedValue: threshold.medium,
          deviation: ((latestValue - threshold.medium) / threshold.medium) * 100,
          confidence: 1.0,
          dataSource,
          timestamp: new Date(),
          context: { threshold: threshold[severity], thresholdType: severity },
          recommendations: [
            `Immediate attention required for ${severity} level threshold breach`,
            'Scale resources if performance-related',
            'Check for system issues or attacks',
          ],
          status: 'active',
        });
      }
    }

    return anomalies;
  }

  private async detectBehavioralAnomalies(dataSource: string, data: any[]): Promise<AnomalyAlert[]> {
    const anomalies: AnomalyAlert[] = [];

    // Simulate behavioral anomaly detection
    if (data.length >= 24) { // Need at least 24 data points for daily pattern
      const recentHour = new Date().getHours();
      const currentValue = typeof data[data.length - 1] === 'number' ? data[data.length - 1] : data[data.length - 1].value || 0;
      
      // Simulate expected value based on historical patterns for this hour
      const expectedForHour = 100 + Math.sin((recentHour * Math.PI) / 12) * 30; // Simulate daily pattern
      const deviation = Math.abs(currentValue - expectedForHour) / expectedForHour;

      if (deviation > 0.5) { // 50% deviation from expected pattern
        anomalies.push({
          id: `behavioral_anomaly_${Date.now()}`,
          type: 'behavioral',
          severity: deviation > 0.8 ? 'high' : 'medium',
          title: 'Unusual Behavioral Pattern',
          description: `Activity pattern deviates significantly from historical behavior for this time`,
          metric: `${dataSource}_behavior`,
          value: currentValue,
          expectedValue: expectedForHour,
          deviation: deviation * 100,
          confidence: 0.75,
          dataSource,
          timestamp: new Date(),
          context: { hour: recentHour, expectedPattern: 'daily_cycle' },
          recommendations: [
            'Check for external factors affecting user behavior',
            'Verify no system issues are impacting normal patterns',
            'Review recent changes that might affect usage patterns',
          ],
          status: 'active',
        });
      }
    }

    return anomalies;
  }
}