// path: backend/src/modules/automation/services/automation-metrics.service.ts
// purpose: Real-time metrics collection and monitoring for automation systems
// dependencies: @nestjs/common, @nestjs/websockets, prometheus

import { Injectable, Logger } from '@nestjs/common';
import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface MetricData {
  timestamp: Date;
  metric: string;
  value: number;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface SystemMetrics {
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  capacity: CapacityMetrics;
  business: BusinessMetrics;
}

export interface PerformanceMetrics {
  executionTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  responseTime: number;
  queueDepth: number;
  activeConnections: number;
}

export interface ReliabilityMetrics {
  uptime: number;
  availability: number;
  errorRate: number;
  successRate: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
}

export interface CapacityMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  concurrentExecutions: number;
  queueCapacity: number;
}

export interface BusinessMetrics {
  totalAutomations: number;
  activeAutomations: number;
  costSavings: number;
  timeSaved: number;
  errorsAvoided: number;
  complianceScore: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  recipients: string[];
}

export interface Alert {
  id: string;
  rule: AlertRule;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'firing' | 'resolved';
  value: number;
  message: string;
}

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
@Injectable()
export class AutomationMetricsService implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AutomationMetricsService.name);
  private connectedClients = new Map<string, Socket>();
  private metricsBuffer: MetricData[] = [];
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private metricsInterval: NodeJS.Timer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.initializeDefaultRules();
    this.startMetricsCollection();
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized for real-time metrics');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const clientId = client.id;
    this.connectedClients.set(clientId, client);
    this.logger.log(`Client connected: ${clientId}`);

    // Send current metrics to new client
    this.sendCurrentMetrics(client);
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.connectedClients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId}`);
  }

  @SubscribeMessage('subscribe-metrics')
  handleSubscribeMetrics(client: Socket, data: { tenantId: string; userId: string }) {
    this.logger.log(`Client ${client.id} subscribed to metrics for tenant: ${data.tenantId}`);
    client.join(`metrics:${data.tenantId}`);
    
    // Send initial metrics
    this.sendCurrentMetrics(client);
  }

  @SubscribeMessage('unsubscribe-metrics')
  handleUnsubscribeMetrics(client: Socket, data: { tenantId: string }) {
    this.logger.log(`Client ${client.id} unsubscribed from metrics for tenant: ${data.tenantId}`);
    client.leave(`metrics:${data.tenantId}`);
  }

  // Public methods for recording metrics
  recordMetric(metric: string, value: number, labels: Record<string, string> = {}, type: MetricData['type'] = 'gauge') {
    const metricData: MetricData = {
      timestamp: new Date(),
      metric,
      value,
      labels,
      type,
    };

    this.metricsBuffer.push(metricData);
    
    // Check if this metric triggers any alerts
    this.evaluateAlerts(metricData);

    // Emit to subscribed clients
    this.server.emit('metric-update', metricData);

    // Keep buffer manageable
    if (this.metricsBuffer.length > 1000) {
      this.metricsBuffer = this.metricsBuffer.slice(-500);
    }
  }

  recordTaskExecution(taskId: string, duration: number, success: boolean, tenantId: string) {
    this.recordMetric('task.execution.duration', duration, { taskId, tenantId }, 'histogram');
    this.recordMetric('task.execution.count', 1, { taskId, tenantId, status: success ? 'success' : 'failure' }, 'counter');
    this.recordMetric('task.success.rate', success ? 1 : 0, { taskId, tenantId }, 'gauge');
  }

  recordWorkflowExecution(workflowId: string, duration: number, success: boolean, stepsExecuted: number, tenantId: string) {
    this.recordMetric('workflow.execution.duration', duration, { workflowId, tenantId }, 'histogram');
    this.recordMetric('workflow.execution.count', 1, { workflowId, tenantId, status: success ? 'success' : 'failure' }, 'counter');
    this.recordMetric('workflow.steps.executed', stepsExecuted, { workflowId, tenantId }, 'gauge');
  }

  recordRuleExecution(ruleId: string, duration: number, conditionsMet: boolean, actionsExecuted: number, tenantId: string) {
    this.recordMetric('rule.execution.duration', duration, { ruleId, tenantId }, 'histogram');
    this.recordMetric('rule.conditions.met', conditionsMet ? 1 : 0, { ruleId, tenantId }, 'gauge');
    this.recordMetric('rule.actions.executed', actionsExecuted, { ruleId, tenantId }, 'gauge');
  }

  recordIntegrationCall(integrationId: string, endpoint: string, responseTime: number, statusCode: number, tenantId: string) {
    this.recordMetric('integration.response.time', responseTime, { integrationId, endpoint, tenantId }, 'histogram');
    this.recordMetric('integration.requests.count', 1, { 
      integrationId, 
      endpoint, 
      tenantId, 
      status: statusCode >= 200 && statusCode < 300 ? 'success' : 'error' 
    }, 'counter');
  }

  recordSystemResource(cpu: number, memory: number, storage: number, network: number) {
    this.recordMetric('system.cpu.usage', cpu, {}, 'gauge');
    this.recordMetric('system.memory.usage', memory, {}, 'gauge');
    this.recordMetric('system.storage.usage', storage, {}, 'gauge');
    this.recordMetric('system.network.usage', network, {}, 'gauge');
  }

  async getMetrics(tenantId: string, timeRange: '1h' | '6h' | '24h' | '7d' = '1h'): Promise<SystemMetrics> {
    const cacheKey = `metrics:${tenantId}:${timeRange}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate metrics from buffer (in production, would use proper time-series DB)
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoff = new Date(now.getTime() - timeRangeMs);

    const relevantMetrics = this.metricsBuffer.filter(m => 
      m.timestamp >= cutoff && 
      (m.labels.tenantId === tenantId || !m.labels.tenantId)
    );

    const metrics: SystemMetrics = {
      performance: this.calculatePerformanceMetrics(relevantMetrics),
      reliability: this.calculateReliabilityMetrics(relevantMetrics),
      capacity: this.calculateCapacityMetrics(relevantMetrics),
      business: await this.calculateBusinessMetrics(tenantId, relevantMetrics),
    };

    // Cache for 1 minute
    await this.redis.setex(cacheKey, 60, JSON.stringify(metrics));

    return metrics;
  }

  async getAlerts(tenantId: string): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => 
      alert.rule.recipients.some(recipient => recipient.includes(tenantId))
    );
  }

  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...rule,
    };

    this.alertRules.set(alertRule.id, alertRule);
    
    // Persist to database
    await this.prisma.alert_rules.create({
      data: {
        id: alertRule.id,
        tenantId: 'default', // TODO: Get from context
        name: alertRule.name,
        description: `Alert rule for ${alertRule.metric}`,
        metric: alertRule.metric,
        condition: alertRule.condition,
        threshold: alertRule.threshold,
        duration: alertRule.duration,
        severity: alertRule.severity,
        enabled: alertRule.enabled,
        definition: alertRule as any,
      },
    });

    this.logger.log(`Alert rule created: ${alertRule.id} (${alertRule.name})`);
    return alertRule;
  }

  private initializeDefaultRules() {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        metric: 'task.success.rate',
        condition: 'lt',
        threshold: 0.9,
        duration: 300, // 5 minutes
        severity: 'warning',
        enabled: true,
        recipients: ['admin'],
      },
      {
        name: 'High CPU Usage',
        metric: 'system.cpu.usage',
        condition: 'gt',
        threshold: 80,
        duration: 600, // 10 minutes
        severity: 'warning',
        enabled: true,
        recipients: ['admin'],
      },
      {
        name: 'High Memory Usage',
        metric: 'system.memory.usage',
        condition: 'gt',
        threshold: 85,
        duration: 300,
        severity: 'critical',
        enabled: true,
        recipients: ['admin'],
      },
      {
        name: 'Queue Depth Alert',
        metric: 'queue.depth',
        condition: 'gt',
        threshold: 100,
        duration: 180,
        severity: 'warning',
        enabled: true,
        recipients: ['admin'],
      },
    ];

    defaultRules.forEach(rule => {
      this.createAlertRule(rule).catch(error => {
        this.logger.warn(`Failed to create default alert rule: ${rule.name}`, error);
      });
    });
  }

  private startMetricsCollection() {
    // Collect system metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Also collect immediately
    this.collectSystemMetrics();
  }

  private async collectSystemMetrics() {
    try {
      // Mock system resource collection (in production, would use actual system monitoring)
      const cpu = Math.random() * 30 + 20; // 20-50%
      const memory = Math.random() * 20 + 40; // 40-60%
      const storage = Math.random() * 10 + 25; // 25-35%
      const network = Math.random() * 15 + 10; // 10-25%

      this.recordSystemResource(cpu, memory, storage, network);

      // Record queue depths
      this.recordMetric('queue.depth', Math.floor(Math.random() * 50) + 10, { queue: 'scheduled-tasks' });
      this.recordMetric('queue.depth', Math.floor(Math.random() * 30) + 5, { queue: 'workflow-execution' });
      this.recordMetric('queue.depth', Math.floor(Math.random() * 20) + 3, { queue: 'business-processes' });

      // Record active connections
      this.recordMetric('websocket.connections', this.connectedClients.size, {});
    } catch (error) {
      this.logger.error('Error collecting system metrics', error);
    }
  }

  private evaluateAlerts(metricData: MetricData) {
    this.alertRules.forEach(rule => {
      if (!rule.enabled || rule.metric !== metricData.metric) {
        return;
      }

      const shouldAlert = this.checkAlertCondition(metricData.value, rule.condition, rule.threshold);
      
      if (shouldAlert) {
        this.triggerAlert(rule, metricData.value);
      } else {
        this.resolveAlert(rule.id);
      }
    });
  }

  private checkAlertCondition(value: number, condition: AlertRule['condition'], threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private triggerAlert(rule: AlertRule, value: number) {
    const alertId = `alert_${rule.id}_${Date.now()}`;
    
    if (this.activeAlerts.has(alertId)) {
      return; // Alert already active
    }

    const alert: Alert = {
      id: alertId,
      rule,
      triggeredAt: new Date(),
      status: 'firing',
      value,
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.threshold})`,
    };

    this.activeAlerts.set(alertId, alert);
    
    // Emit alert to subscribed clients
    this.server.emit('alert-triggered', alert);
    
    this.logger.warn(`Alert triggered: ${alert.message}`);
  }

  private resolveAlert(ruleId: string) {
    const alertToResolve = Array.from(this.activeAlerts.values()).find(
      alert => alert.rule.id === ruleId && alert.status === 'firing'
    );

    if (alertToResolve) {
      alertToResolve.status = 'resolved';
      alertToResolve.resolvedAt = new Date();
      
      // Emit resolution to subscribed clients
      this.server.emit('alert-resolved', alertToResolve);
      
      this.logger.log(`Alert resolved: ${alertToResolve.message}`);
      
      // Remove from active alerts after a delay
      setTimeout(() => {
        this.activeAlerts.delete(alertToResolve.id);
      }, 60000); // Keep for 1 minute for history
    }
  }

  private sendCurrentMetrics(client: Socket) {
    const recentMetrics = this.metricsBuffer.slice(-50); // Last 50 metrics
    client.emit('metrics-snapshot', {
      metrics: recentMetrics,
      alerts: Array.from(this.activeAlerts.values()),
      timestamp: new Date(),
    });
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private calculatePerformanceMetrics(metrics: MetricData[]): PerformanceMetrics {
    const executionTimes = metrics
      .filter(m => m.metric.includes('execution.duration'))
      .map(m => m.value);

    const throughputMetrics = metrics
      .filter(m => m.metric.includes('execution.count'))
      .reduce((sum, m) => sum + m.value, 0);

    const queueDepthMetrics = metrics
      .filter(m => m.metric === 'queue.depth')
      .map(m => m.value);

    const connectionMetrics = metrics
      .filter(m => m.metric === 'websocket.connections')
      .map(m => m.value);

    return {
      executionTime: {
        avg: executionTimes.length ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0,
        p50: this.percentile(executionTimes, 0.5),
        p95: this.percentile(executionTimes, 0.95),
        p99: this.percentile(executionTimes, 0.99),
      },
      throughput: throughputMetrics,
      responseTime: executionTimes.length ? Math.max(...executionTimes) : 0,
      queueDepth: queueDepthMetrics.length ? Math.max(...queueDepthMetrics) : 0,
      activeConnections: connectionMetrics.length ? connectionMetrics[connectionMetrics.length - 1] : 0,
    };
  }

  private calculateReliabilityMetrics(metrics: MetricData[]): ReliabilityMetrics {
    const successMetrics = metrics.filter(m => 
      m.metric.includes('success.rate') || 
      (m.metric.includes('execution.count') && m.labels.status === 'success')
    );

    const errorMetrics = metrics.filter(m => 
      m.metric.includes('execution.count') && m.labels.status === 'failure'
    );

    const totalExecutions = successMetrics.length + errorMetrics.length;
    const successRate = totalExecutions > 0 ? successMetrics.length / totalExecutions : 1;

    return {
      uptime: 99.9, // Mock value
      availability: 99.8, // Mock value
      errorRate: 1 - successRate,
      successRate,
      mtbf: 168, // Mock: 168 hours
      mttr: 15, // Mock: 15 minutes
    };
  }

  private calculateCapacityMetrics(metrics: MetricData[]): CapacityMetrics {
    const cpuMetrics = metrics.filter(m => m.metric === 'system.cpu.usage').map(m => m.value);
    const memoryMetrics = metrics.filter(m => m.metric === 'system.memory.usage').map(m => m.value);
    const storageMetrics = metrics.filter(m => m.metric === 'system.storage.usage').map(m => m.value);
    const networkMetrics = metrics.filter(m => m.metric === 'system.network.usage').map(m => m.value);

    return {
      cpu: cpuMetrics.length ? cpuMetrics[cpuMetrics.length - 1] : 0,
      memory: memoryMetrics.length ? memoryMetrics[memoryMetrics.length - 1] : 0,
      storage: storageMetrics.length ? storageMetrics[storageMetrics.length - 1] : 0,
      network: networkMetrics.length ? networkMetrics[networkMetrics.length - 1] : 0,
      concurrentExecutions: Math.floor(Math.random() * 20) + 5, // Mock value
      queueCapacity: 1000, // Mock value
    };
  }

  private async calculateBusinessMetrics(tenantId: string, metrics: MetricData[]): Promise<BusinessMetrics> {
    try {
      // Use project_tasks as a proxy for automation workflows until workflow table is created
      const [totalAutomations, activeAutomations] = await Promise.all([
        this.prisma.project_tasks.count({ where: { tenantId } }),
        this.prisma.project_tasks.count({ where: { tenantId, status: 'in_progress' } }),
      ]);

      return {
        totalAutomations,
        activeAutomations,
        costSavings: Math.floor(Math.random() * 50000) + 10000, // Mock value
        timeSaved: Math.floor(Math.random() * 1000) + 200, // Mock value in hours
        errorsAvoided: Math.floor(Math.random() * 100) + 20, // Mock value
        complianceScore: Math.random() * 20 + 80, // Mock value 80-100%
      };
    } catch (error) {
      this.logger.error('Error calculating business metrics', error);
      return {
        totalAutomations: 0,
        activeAutomations: 0,
        costSavings: 0,
        timeSaved: 0,
        errorsAvoided: 0,
        complianceScore: 0,
      };
    }
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}
