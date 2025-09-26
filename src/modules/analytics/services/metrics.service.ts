// path: backend/src/modules/analytics/services/metrics.service.ts
// purpose: Comprehensive metrics collection and analysis service for Fortune500 analytics
// dependencies: @nestjs/common, prisma, metrics processing libraries

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface Metric {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  type: MetricType;
  unit: string;
  value: number;
  target?: number;
  threshold: MetricThreshold;
  dimensions: MetricDimension[];
  tags: string[];
  source: string;
  calculation: MetricCalculation;
  history: MetricHistoryPoint[];
  metadata: MetricMetadata;
  timestamp: Date;
}

export type MetricCategory = 
  | 'business' | 'financial' | 'operational' | 'customer' | 'employee' 
  | 'product' | 'marketing' | 'sales' | 'technology' | 'quality' | 'safety' | 'compliance';

export type MetricType = 
  | 'counter' | 'gauge' | 'histogram' | 'summary' | 'ratio' | 'percentage' 
  | 'currency' | 'duration' | 'rate' | 'score' | 'index';

export interface MetricThreshold {
  critical: { min?: number; max?: number };
  warning: { min?: number; max?: number };
  target: { min?: number; max?: number };
  excellent: { min?: number; max?: number };
}

export interface MetricDimension {
  name: string;
  value: string;
  type: 'categorical' | 'numerical' | 'temporal';
}

export interface MetricCalculation {
  formula: string;
  dependencies: string[];
  aggregation: AggregationType;
  timeWindow: string;
  filters: MetricFilter[];
}

export type AggregationType = 
  | 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'percentile' 
  | 'stddev' | 'variance' | 'rate' | 'delta' | 'cumulative';

export interface MetricFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'between' | 'in' | 'like';
  value: any;
}

export interface MetricHistoryPoint {
  value: number;
  timestamp: Date;
  dimensions?: MetricDimension[];
}

export interface MetricMetadata {
  owner: string;
  department: string;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataQuality: number; // 0-1 score
  lastUpdated: Date;
  version: string;
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  category: string;
  metrics: string[]; // Metric IDs
  calculation: KPICalculation;
  target: KPITarget;
  status: KPIStatus;
  trend: TrendAnalysis;
  benchmark: BenchmarkData;
  actionItems: ActionItem[];
  stakeholders: string[];
  reportingFrequency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPICalculation {
  formula: string;
  weightings: { [metricId: string]: number };
  normalization: NormalizationMethod;
  rollup: RollupMethod;
}

export type NormalizationMethod = 'none' | 'z-score' | 'min-max' | 'percentile' | 'custom';
export type RollupMethod = 'sum' | 'average' | 'weighted-average' | 'max' | 'min' | 'custom';

export interface KPITarget {
  value: number;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  deadline?: Date;
  stretch?: number; // Stretch target value
}

export interface KPIStatus {
  current: number;
  previous: number;
  target: number;
  performance: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: number; // 0-1
  volatility: number; // 0-1
  seasonality: SeasonalPattern[];
  changePoints: ChangePoint[];
  forecast: ForecastPoint[];
}

export interface SeasonalPattern {
  pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  strength: number;
  period: number;
}

export interface ChangePoint {
  timestamp: Date;
  significance: number;
  direction: 'increase' | 'decrease';
  magnitude: number;
}

export interface ForecastPoint {
  timestamp: Date;
  value: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
}

export interface BenchmarkData {
  industry: IndustryBenchmark;
  internal: InternalBenchmark;
  competitors: CompetitorBenchmark[];
  historical: HistoricalBenchmark;
}

export interface IndustryBenchmark {
  average: number;
  median: number;
  percentile25: number;
  percentile75: number;
  percentile90: number;
  source: string;
  date: Date;
}

export interface InternalBenchmark {
  departments: { [department: string]: number };
  regions: { [region: string]: number };
  products: { [product: string]: number };
  teams: { [team: string]: number };
}

export interface CompetitorBenchmark {
  name: string;
  value: number;
  market_share: number;
  confidence: number;
  source: string;
}

export interface HistoricalBenchmark {
  sameMonth: number;
  sameQuarter: number;
  yearOverYear: number;
  rolling12Months: number;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  impact: string;
  effort: string;
}

export interface MetricDashboard {
  id: string;
  name: string;
  description: string;
  widgets: MetricWidget[];
  layout: DashboardLayout;
  filters: DashboardFilter[];
  autoRefresh: boolean;
  refreshInterval: number;
  permissions: string[];
}

export interface MetricWidget {
  id: string;
  type: WidgetType;
  title: string;
  metrics: string[];
  visualization: VisualizationConfig;
  position: WidgetPosition;
  size: WidgetSize;
  drillDown: DrillDownConfig;
}

export type WidgetType = 
  | 'single_metric' | 'metric_grid' | 'trend_chart' | 'gauge' | 'sparkline' 
  | 'heatmap' | 'leaderboard' | 'progress_bar' | 'alert_list' | 'target_tracker';

export interface VisualizationConfig {
  chartType: string;
  colorScheme: string[];
  thresholds: ThresholdConfig[];
  formatting: FormattingConfig;
  annotations: AnnotationConfig[];
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label: string;
  operator: 'greater' | 'less' | 'equal';
}

export interface FormattingConfig {
  decimals: number;
  prefix: string;
  suffix: string;
  thousands: string;
  currency: string;
}

export interface AnnotationConfig {
  type: 'line' | 'band' | 'point' | 'text';
  value: any;
  label: string;
  color: string;
}

export interface DrillDownConfig {
  enabled: boolean;
  dimensions: string[];
  filters: string[];
  targetView?: string;
}

export interface WidgetPosition {
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
}

export interface WidgetSize {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
  padding: number;
}

export interface DashboardFilter {
  id: string;
  type: 'dropdown' | 'multiselect' | 'daterange' | 'slider';
  field: string;
  label: string;
  options: FilterOption[];
  defaultValue: any;
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface MetricAlert {
  id: string;
  name: string;
  description: string;
  metricId: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  frequency: AlertFrequency;
  status: 'active' | 'paused' | 'triggered' | 'resolved';
  lastTriggered?: Date;
  escalation: EscalationPolicy;
}

export interface AlertCondition {
  type: 'threshold' | 'change' | 'anomaly' | 'missing_data';
  operator: 'greater' | 'less' | 'equal' | 'change_percent' | 'deviation';
  value: number;
  timeWindow: string;
  consecutivePeriods?: number;
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'pagerduty';
  recipients: string[];
  template: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AlertFrequency {
  type: 'immediate' | 'digest' | 'scheduled';
  interval?: string;
  maxPerHour?: number;
  suppressDuration?: string;
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  timeout: string;
}

export interface EscalationLevel {
  level: number;
  recipients: string[];
  actions: AlertAction[];
  timeout: string;
}

export interface MetricsCollectionConfig {
  sources: DataSource[];
  collectors: CollectorConfig[];
  processors: ProcessorConfig[];
  storage: StorageConfig;
  retention: RetentionPolicy;
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'stream' | 'webhook';
  connection: ConnectionConfig;
  schedule: ScheduleConfig;
  mapping: FieldMapping[];
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  headers?: { [key: string]: string };
  timeout?: number;
}

export interface ScheduleConfig {
  frequency: 'realtime' | 'seconds' | 'minutes' | 'hours' | 'days';
  interval: number;
  timezone: string;
  enabled: boolean;
}

export interface FieldMapping {
  source: string;
  target: string;
  type: string;
  transformation?: string;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'type' | 'range' | 'regex' | 'custom';
  value: any;
  message: string;
}

export interface CollectorConfig {
  id: string;
  name: string;
  sources: string[];
  metrics: string[];
  enabled: boolean;
  batchSize: number;
  parallelism: number;
}

export interface ProcessorConfig {
  id: string;
  name: string;
  type: 'aggregation' | 'transformation' | 'enrichment' | 'validation';
  config: any;
  order: number;
  enabled: boolean;
}

export interface StorageConfig {
  primary: StorageBackend;
  backup?: StorageBackend;
  partitioning: PartitioningConfig;
  compression: CompressionConfig;
}

export interface StorageBackend {
  type: 'postgres' | 'timeseries' | 'nosql' | 's3' | 'bigquery';
  config: any;
}

export interface PartitioningConfig {
  strategy: 'time' | 'hash' | 'range';
  field: string;
  interval: string;
}

export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'lz4' | 'zstd';
  level: number;
}

export interface RetentionPolicy {
  raw: string; // e.g., '90d'
  hourly: string; // e.g., '1y'
  daily: string; // e.g., '5y'
  monthly: string; // e.g., '10y'
  rules: RetentionRule[];
}

export interface RetentionRule {
  condition: string;
  retention: string;
  priority: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

  async createMetric(
    companyId: string,
    userId: string,
    metricConfig: Partial<Metric>,
  ): Promise<Metric> {
    try {
      const metric: Metric = {
        id: `metric_${Date.now()}`,
        name: metricConfig.name || 'New Metric',
        description: metricConfig.description || '',
        category: metricConfig.category || 'business',
        type: metricConfig.type || 'gauge',
        unit: metricConfig.unit || 'count',
        value: metricConfig.value || 0,
        target: metricConfig.target,
        threshold: metricConfig.threshold || {
          critical: {},
          warning: {},
          target: {},
          excellent: {},
        },
        dimensions: metricConfig.dimensions || [],
        tags: metricConfig.tags || [],
        source: metricConfig.source || 'manual',
        calculation: metricConfig.calculation || {
          formula: 'value',
          dependencies: [],
          aggregation: 'sum',
          timeWindow: '1d',
          filters: [],
        },
        history: metricConfig.history || [],
        metadata: metricConfig.metadata || {
          owner: userId,
          department: 'Analytics',
          businessImpact: 'medium',
          frequency: 'daily',
          dataQuality: 1.0,
          lastUpdated: new Date(),
          version: '1.0',
        },
        timestamp: new Date(),
      };

      this.logger.log(`Created metric ${metric.id} for company ${companyId}`);
      return metric;
    } catch (error) {
      this.logger.error(`Error creating metric: ${error.message}`);
      throw error;
    }
  }

  async updateMetricValue(
    metricId: string,
    value: number,
    dimensions?: MetricDimension[],
  ): Promise<void> {
    try {
      const timestamp = new Date();

      // Update current value
      await this.updateCurrentMetricValue(metricId, value, timestamp);

      // Add to history
      await this.addMetricHistoryPoint(metricId, {
        value,
        timestamp,
        dimensions,
      });

      // Trigger any alerts
      await this.checkMetricAlerts(metricId, value);

      this.logger.log(`Updated metric ${metricId} with value ${value}`);
    } catch (error) {
      this.logger.error(`Error updating metric value: ${error.message}`);
      throw error;
    }
  }

  async calculateKPI(
    kpiId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<KPIStatus> {
    try {
      const kpi = await this.getKPIById(kpiId);
      if (!kpi) {
        throw new Error(`KPI ${kpiId} not found`);
      }

      // Get metric values
      const metricValues = await this.getMetricValues(kpi.metrics, timeRange);

      // Calculate KPI value using formula
      const currentValue = this.evaluateKPIFormula(kpi.calculation, metricValues);

      // Get previous value for comparison
      const previousTimeRange = this.getPreviousPeriod(timeRange);
      const previousMetricValues = await this.getMetricValues(kpi.metrics, previousTimeRange);
      const previousValue = this.evaluateKPIFormula(kpi.calculation, previousMetricValues);

      // Determine performance status
      const performance = this.determinePerformanceStatus(currentValue, kpi.target.value);

      // Analyze trend
      const trend = this.analyzeTrend(currentValue, previousValue);

      // Calculate confidence
      const confidence = this.calculateConfidence(metricValues, kpi.calculation);

      const status: KPIStatus = {
        current: currentValue,
        previous: previousValue,
        target: kpi.target.value,
        performance,
        trend,
        confidence,
      };

      this.logger.log(`Calculated KPI ${kpiId}: ${currentValue} (${performance})`);
      return status;
    } catch (error) {
      this.logger.error(`Error calculating KPI: ${error.message}`);
      throw error;
    }
  }

  async analyzeTrends(
    metricIds: string[],
    timeRange: { start: Date; end: Date },
    analysisType: 'simple' | 'advanced' = 'simple',
  ): Promise<{ [metricId: string]: TrendAnalysis }> {
    try {
      const trends: { [metricId: string]: TrendAnalysis } = {};

      for (const metricId of metricIds) {
        const history = await this.getMetricHistory(metricId, timeRange);
        
        if (analysisType === 'advanced') {
          trends[metricId] = await this.performAdvancedTrendAnalysis(history);
        } else {
          trends[metricId] = await this.performSimpleTrendAnalysis(history);
        }
      }

      this.logger.log(`Analyzed trends for ${metricIds.length} metrics`);
      return trends;
    } catch (error) {
      this.logger.error(`Error analyzing trends: ${error.message}`);
      throw error;
    }
  }

  async createAlert(
    companyId: string,
    userId: string,
    alertConfig: Partial<MetricAlert>,
  ): Promise<MetricAlert> {
    try {
      const alert: MetricAlert = {
        id: `alert_${Date.now()}`,
        name: alertConfig.name || 'New Alert',
        description: alertConfig.description || '',
        metricId: alertConfig.metricId!,
        conditions: alertConfig.conditions || [],
        actions: alertConfig.actions || [],
        frequency: alertConfig.frequency || {
          type: 'immediate',
          maxPerHour: 10,
        },
        status: 'active',
        escalation: alertConfig.escalation || {
          enabled: false,
          levels: [],
          timeout: '30m',
        },
      };

      // Validate alert configuration
      await this.validateAlertConfig(alert);

      this.logger.log(`Created alert ${alert.id} for metric ${alert.metricId}`);
      return alert;
    } catch (error) {
      this.logger.error(`Error creating alert: ${error.message}`);
      throw error;
    }
  }

  async getBenchmarkData(
    metricId: string,
    benchmarkType: 'industry' | 'internal' | 'competitors' | 'historical',
  ): Promise<BenchmarkData> {
    try {
      const metric = await this.getMetricById(metricId);
      if (!metric) {
        throw new Error(`Metric ${metricId} not found`);
      }

      let benchmarkData: BenchmarkData;

      switch (benchmarkType) {
        case 'industry':
          benchmarkData = {
            industry: await this.getIndustryBenchmark(metric),
            internal: {} as InternalBenchmark,
            competitors: [],
            historical: {} as HistoricalBenchmark,
          };
          break;
        case 'internal':
          benchmarkData = {
            industry: {} as IndustryBenchmark,
            internal: await this.getInternalBenchmark(metric),
            competitors: [],
            historical: {} as HistoricalBenchmark,
          };
          break;
        case 'competitors':
          benchmarkData = {
            industry: {} as IndustryBenchmark,
            internal: {} as InternalBenchmark,
            competitors: await this.getCompetitorBenchmarks(metric),
            historical: {} as HistoricalBenchmark,
          };
          break;
        case 'historical':
          benchmarkData = {
            industry: {} as IndustryBenchmark,
            internal: {} as InternalBenchmark,
            competitors: [],
            historical: await this.getHistoricalBenchmark(metric),
          };
          break;
        default:
          // Get all benchmarks
          benchmarkData = {
            industry: await this.getIndustryBenchmark(metric),
            internal: await this.getInternalBenchmark(metric),
            competitors: await this.getCompetitorBenchmarks(metric),
            historical: await this.getHistoricalBenchmark(metric),
          };
      }

      this.logger.log(`Retrieved ${benchmarkType} benchmark data for metric ${metricId}`);
      return benchmarkData;
    } catch (error) {
      this.logger.error(`Error getting benchmark data: ${error.message}`);
      throw error;
    }
  }

  async generateMetricInsights(
    metricIds: string[],
    timeRange: { start: Date; end: Date },
  ): Promise<string[]> {
    try {
      const insights: string[] = [];

      for (const metricId of metricIds) {
        const metric = await this.getMetricById(metricId);
        const history = await this.getMetricHistory(metricId, timeRange);
        const trends = await this.performAdvancedTrendAnalysis(history);
        const benchmarks = await this.getBenchmarkData(metricId, 'industry');

        // Generate insights based on trends
        if (trends.direction === 'up' && trends.strength > 0.7) {
          insights.push(`${metric.name} shows strong upward trend with ${(trends.strength * 100).toFixed(1)}% confidence`);
        }

        // Generate insights based on benchmarks
        const currentValue = history[history.length - 1]?.value || 0;
        if (currentValue > benchmarks.industry.percentile90) {
          insights.push(`${metric.name} is in the top 10% of industry performance`);
        }

        // Generate insights based on volatility
        if (trends.volatility > 0.8) {
          insights.push(`${metric.name} shows high volatility - consider investigating root causes`);
        }

        // Generate seasonal insights
        const strongSeasonality = trends.seasonality.find(s => s.strength > 0.6);
        if (strongSeasonality) {
          insights.push(`${metric.name} has strong ${strongSeasonality.pattern} seasonality pattern`);
        }
      }

      this.logger.log(`Generated ${insights.length} insights for ${metricIds.length} metrics`);
      return insights;
    } catch (error) {
      this.logger.error(`Error generating metric insights: ${error.message}`);
      throw error;
    }
  }

  async optimizeMetricsCollection(
    companyId: string,
  ): Promise<MetricsCollectionConfig> {
    try {
      // Analyze current collection patterns
      const currentConfig = await this.getCurrentCollectionConfig(companyId);
      
      // Optimize based on usage patterns
      const optimizedConfig = await this.optimizeCollectionConfig(currentConfig);

      // Update collection configuration
      await this.updateCollectionConfig(companyId, optimizedConfig);

      this.logger.log(`Optimized metrics collection for company ${companyId}`);
      return optimizedConfig;
    } catch (error) {
      this.logger.error(`Error optimizing metrics collection: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private async updateCurrentMetricValue(metricId: string, value: number, timestamp: Date): Promise<void> {
    // Mock update - would update database
    this.logger.debug(`Updated metric ${metricId} current value to ${value}`);
  }

  private async addMetricHistoryPoint(metricId: string, point: MetricHistoryPoint): Promise<void> {
    // Mock history update - would append to time series database
    this.logger.debug(`Added history point for metric ${metricId}: ${point.value}`);
  }

  private async checkMetricAlerts(metricId: string, value: number): Promise<void> {
    // Get active alerts for this metric
    const alerts = await this.getActiveAlertsForMetric(metricId);
    
    for (const alert of alerts) {
      const triggered = this.evaluateAlertConditions(alert.conditions, value);
      if (triggered) {
        await this.triggerAlert(alert, value);
      }
    }
  }

  private async getActiveAlertsForMetric(metricId: string): Promise<MetricAlert[]> {
    // Mock alert retrieval
    return [];
  }

  private evaluateAlertConditions(conditions: AlertCondition[], value: number): boolean {
    // Evaluate all conditions
    return conditions.every(condition => {
      switch (condition.operator) {
        case 'greater':
          return value > condition.value;
        case 'less':
          return value < condition.value;
        case 'equal':
          return value === condition.value;
        default:
          return false;
      }
    });
  }

  private async triggerAlert(alert: MetricAlert, value: number): Promise<void> {
    // Execute alert actions
    for (const action of alert.actions) {
      await this.executeAlertAction(action, alert, value);
    }
    
    this.logger.log(`Triggered alert ${alert.id} for value ${value}`);
  }

  private async executeAlertAction(action: AlertAction, alert: MetricAlert, value: number): Promise<void> {
    // Mock action execution
    this.logger.debug(`Executed ${action.type} action for alert ${alert.id}`);
  }

  private async getKPIById(kpiId: string): Promise<KPI | null> {
    // Mock KPI retrieval
    return null;
  }

  private async getMetricById(metricId: string): Promise<Metric | null> {
    // Mock metric retrieval
    return null;
  }

  private async getMetricValues(metricIds: string[], timeRange?: any): Promise<{ [metricId: string]: number }> {
    // Mock metric values retrieval
    const values: { [metricId: string]: number } = {};
    metricIds.forEach(id => {
      values[id] = Math.random() * 100;
    });
    return values;
  }

  private evaluateKPIFormula(calculation: KPICalculation, metricValues: any): number {
    // Mock formula evaluation - would use a proper formula parser
    const values = Object.values(metricValues) as number[];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private getPreviousPeriod(timeRange?: any): any {
    // Calculate previous period for comparison
    if (!timeRange) {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      return { start: twoWeeksAgo, end: oneWeekAgo };
    }
    
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - duration),
      end: new Date(timeRange.end.getTime() - duration),
    };
  }

  private determinePerformanceStatus(current: number, target: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const ratio = current / target;
    if (ratio >= 1.1) return 'excellent';
    if (ratio >= 0.9) return 'good';
    if (ratio >= 0.7) return 'warning';
    return 'critical';
  }

  private analyzeTrend(current: number, previous: number): 'improving' | 'stable' | 'declining' {
    const change = (current - previous) / previous;
    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }

  private calculateConfidence(metricValues: any, calculation: KPICalculation): number {
    // Mock confidence calculation
    return 0.85;
  }

  private async getMetricHistory(metricId: string, timeRange: any): Promise<MetricHistoryPoint[]> {
    // Mock history retrieval
    const points: MetricHistoryPoint[] = [];
    const start = timeRange.start.getTime();
    const end = timeRange.end.getTime();
    const interval = (end - start) / 100; // 100 data points
    
    for (let i = 0; i < 100; i++) {
      points.push({
        value: Math.random() * 100,
        timestamp: new Date(start + i * interval),
      });
    }
    
    return points;
  }

  private async performSimpleTrendAnalysis(history: MetricHistoryPoint[]): Promise<TrendAnalysis> {
    if (history.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        volatility: 0,
        seasonality: [],
        changePoints: [],
        forecast: [],
      };
    }

    const firstValue = history[0].value;
    const lastValue = history[history.length - 1].value;
    const direction = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
    
    // Calculate simple moving average to determine strength
    const values = history.map(h => h.value);
    const avgChange = values.reduce((sum, val, idx) => {
      if (idx === 0) return sum;
      return sum + Math.abs(val - values[idx - 1]);
    }, 0) / (values.length - 1);
    
    const strength = Math.min(avgChange / Math.max(firstValue, lastValue), 1);
    
    return {
      direction,
      strength,
      volatility: 0.5, // Simplified
      seasonality: [],
      changePoints: [],
      forecast: [],
    };
  }

  private async performAdvancedTrendAnalysis(history: MetricHistoryPoint[]): Promise<TrendAnalysis> {
    // Advanced trend analysis would use statistical methods
    // This is a simplified version
    const simpleTrend = await this.performSimpleTrendAnalysis(history);
    
    // Add advanced features
    const seasonality = this.detectSeasonality(history);
    const changePoints = this.detectChangePoints(history);
    const forecast = this.generateForecast(history);
    const volatility = this.calculateVolatility(history);
    
    return {
      ...simpleTrend,
      volatility,
      seasonality,
      changePoints,
      forecast,
    };
  }

  private detectSeasonality(history: MetricHistoryPoint[]): SeasonalPattern[] {
    // Mock seasonality detection
    return [
      { pattern: 'weekly', strength: 0.6, period: 7 },
    ];
  }

  private detectChangePoints(history: MetricHistoryPoint[]): ChangePoint[] {
    // Mock change point detection
    if (history.length < 10) return [];
    
    const midpoint = Math.floor(history.length / 2);
    return [
      {
        timestamp: history[midpoint].timestamp,
        significance: 0.8,
        direction: 'increase',
        magnitude: 0.15,
      },
    ];
  }

  private generateForecast(history: MetricHistoryPoint[]): ForecastPoint[] {
    // Mock forecast generation
    if (history.length < 5) return [];
    
    const lastValue = history[history.length - 1].value;
    const lastTime = history[history.length - 1].timestamp.getTime();
    const interval = 24 * 60 * 60 * 1000; // 1 day
    
    const forecast: ForecastPoint[] = [];
    for (let i = 1; i <= 30; i++) {
      const value = lastValue * (1 + (Math.random() - 0.5) * 0.1);
      forecast.push({
        timestamp: new Date(lastTime + i * interval),
        value,
        confidence: Math.max(0.9 - i * 0.02, 0.5),
        upperBound: value * 1.1,
        lowerBound: value * 0.9,
      });
    }
    
    return forecast;
  }

  private calculateVolatility(history: MetricHistoryPoint[]): number {
    if (history.length < 2) return 0;
    
    const values = history.map(h => h.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.min(stdDev / mean, 1); // Normalized volatility
  }

  private async validateAlertConfig(alert: MetricAlert): Promise<void> {
    if (!alert.metricId) {
      throw new Error('Alert must have a metric ID');
    }
    
    if (alert.conditions.length === 0) {
      throw new Error('Alert must have at least one condition');
    }
    
    if (alert.actions.length === 0) {
      throw new Error('Alert must have at least one action');
    }
  }

  private async getIndustryBenchmark(metric: Metric): Promise<IndustryBenchmark> {
    // Mock industry benchmark
    return {
      average: 75,
      median: 72,
      percentile25: 60,
      percentile75: 85,
      percentile90: 95,
      source: 'Industry Research Inc.',
      date: new Date(),
    };
  }

  private async getInternalBenchmark(metric: Metric): Promise<InternalBenchmark> {
    // Mock internal benchmark
    return {
      departments: { sales: 80, marketing: 75, operations: 85 },
      regions: { 'north-america': 78, europe: 82, 'asia-pacific': 76 },
      products: { 'product-a': 85, 'product-b': 72, 'product-c': 88 },
      teams: { 'team-alpha': 90, 'team-beta': 75, 'team-gamma': 82 },
    };
  }

  private async getCompetitorBenchmarks(metric: Metric): Promise<CompetitorBenchmark[]> {
    // Mock competitor benchmarks
    return [
      { name: 'Competitor A', value: 82, market_share: 25, confidence: 0.8, source: 'Public Reports' },
      { name: 'Competitor B', value: 78, market_share: 18, confidence: 0.7, source: 'Market Research' },
    ];
  }

  private async getHistoricalBenchmark(metric: Metric): Promise<HistoricalBenchmark> {
    // Mock historical benchmark
    return {
      sameMonth: 72,
      sameQuarter: 74,
      yearOverYear: 68,
      rolling12Months: 76,
    };
  }

  private async getCurrentCollectionConfig(companyId: string): Promise<MetricsCollectionConfig> {
    // Mock current configuration
    return {
      sources: [],
      collectors: [],
      processors: [],
      storage: {
        primary: { type: 'postgres', config: {} },
        partitioning: { strategy: 'time', field: 'timestamp', interval: '1d' },
        compression: { enabled: true, algorithm: 'gzip', level: 6 },
      },
      retention: {
        raw: '90d',
        hourly: '1y',
        daily: '5y',
        monthly: '10y',
        rules: [],
      },
    };
  }

  private async optimizeCollectionConfig(config: MetricsCollectionConfig): Promise<MetricsCollectionConfig> {
    // Optimize configuration based on usage patterns
    const optimizedConfig = { ...config };
    
    // Enable compression if not already enabled
    optimizedConfig.storage.compression.enabled = true;
    
    // Optimize retention policies
    optimizedConfig.retention = {
      ...config.retention,
      raw: '30d', // Reduced raw retention for better performance
    };
    
    return optimizedConfig;
  }

  private async updateCollectionConfig(companyId: string, config: MetricsCollectionConfig): Promise<void> {
    // Mock configuration update
    this.logger.log(`Updated collection configuration for company ${companyId}`);
  }
}