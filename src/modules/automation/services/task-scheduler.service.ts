// path: backend/src/modules/automation/services/task-scheduler.service.ts
// purpose: Enterprise task scheduling and job management system
// dependencies: @nestjs/common, @nestjs/schedule, @nestjs/bull, cron-parser

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CronJob } from 'cron';
import * as cronParser from 'cron-parser';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: 'cron' | 'interval' | 'timeout' | 'workflow' | 'process' | 'notification' | 'cleanup' | 'report';
  category: 'system' | 'business' | 'maintenance' | 'analytics' | 'security' | 'compliance';
  status: 'active' | 'paused' | 'disabled' | 'error' | 'completed';
  priority: 'low' | 'normal' | 'high' | 'critical';
  schedule: TaskSchedule;
  action: TaskAction;
  conditions: TaskCondition[];
  dependencies: TaskDependency[];
  notifications: TaskNotification[];
  retryPolicy: RetryPolicy;
  timeout: number; // milliseconds
  concurrency: ConcurrencyConfig;
  monitoring: TaskMonitoring;
  analytics: TaskAnalytics;
  security: TaskSecurity;
  metadata: TaskMetadata;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

export interface TaskSchedule {
  type: 'cron' | 'interval' | 'timeout' | 'event_driven';
  expression?: string; // Cron expression
  interval?: number; // milliseconds for interval type
  delay?: number; // milliseconds for timeout type
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  maxRuns?: number;
  runCount?: number;
  blackoutPeriods?: BlackoutPeriod[];
}

export interface BlackoutPeriod {
  name: string;
  start: string; // ISO date or cron expression
  end: string; // ISO date or cron expression
  recurring: boolean;
  reason?: string;
}

export interface TaskAction {
  type: 'workflow' | 'api_call' | 'database_query' | 'file_operation' | 'email' | 'script' | 'webhook' | 'process';
  configuration: ActionConfiguration;
  parameters: Record<string, any>;
  environment?: Record<string, string>;
}

export interface ActionConfiguration {
  // Workflow action
  workflowId?: string;
  workflowVersion?: number;
  workflowData?: any;
  
  // API call action
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  authentication?: APIAuthentication;
  
  // Database action
  query?: string;
  database?: string;
  connection?: string;
  
  // File operation action
  operation?: 'read' | 'write' | 'copy' | 'move' | 'delete' | 'compress' | 'backup';
  source?: string;
  destination?: string;
  pattern?: string;
  
  // Email action
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  template?: string;
  attachments?: string[];
  
  // Script action
  script?: string;
  language?: 'javascript' | 'python' | 'bash' | 'powershell';
  interpreter?: string;
  
  // Webhook action
  webhookUrl?: string;
  webhookSecret?: string;
  payload?: any;
  
  // Process action
  processId?: string;
  processData?: any;
}

export interface APIAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  credentials: any;
}

export interface TaskCondition {
  type: 'pre_condition' | 'execution_condition' | 'post_condition';
  name: string;
  expression: string;
  dataSource?: string;
  required: boolean;
  onFailure: 'skip' | 'retry' | 'abort' | 'notify';
}

export interface TaskDependency {
  taskId: string;
  type: 'success' | 'completion' | 'failure' | 'always';
  timeout?: number; // milliseconds to wait for dependency
  onTimeout: 'proceed' | 'skip' | 'abort';
}

export interface TaskNotification {
  event: 'start' | 'success' | 'failure' | 'retry' | 'timeout' | 'dependency_failed';
  recipients: NotificationRecipient[];
  template?: string;
  customMessage?: string;
  throttle?: NotificationThrottle;
}

export interface NotificationRecipient {
  type: 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'in_app';
  address: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  frequency: 'immediate' | 'digest' | 'never';
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export interface NotificationThrottle {
  enabled: boolean;
  maxNotifications: number;
  window: number; // minutes
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential' | 'custom';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier?: number;
  jitter?: boolean;
  retryOn: ('error' | 'timeout' | 'dependency_failure' | 'condition_failure')[];
}

export interface ConcurrencyConfig {
  maxConcurrent: number;
  queueing: 'fifo' | 'lifo' | 'priority';
  resourceLimits: ResourceLimits;
  isolation: 'none' | 'process' | 'container' | 'vm';
}

export interface ResourceLimits {
  cpu: number; // percentage
  memory: number; // MB
  disk: number; // MB
  network: number; // Mbps
  timeout: number; // milliseconds
}

export interface TaskMonitoring {
  enabled: boolean;
  metrics: MonitoringMetric[];
  healthChecks: HealthCheck[];
  alerts: AlertRule[];
  logging: LoggingConfig;
}

export interface MonitoringMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: string[];
  threshold?: MetricThreshold;
}

export interface MetricThreshold {
  value: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  action: 'alert' | 'pause' | 'disable' | 'scale';
}

export interface HealthCheck {
  name: string;
  type: 'ping' | 'http' | 'database' | 'custom';
  configuration: any;
  frequency: number; // seconds
  timeout: number; // milliseconds
  retries: number;
}

export interface AlertRule {
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recipients: string[];
  throttle: number; // minutes
  escalation?: EscalationRule[];
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  recipients: string[];
  action: 'notify' | 'escalate' | 'auto_resolve';
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  retention: number; // days
  destinations: LogDestination[];
  structured: boolean;
}

export interface LogDestination {
  type: 'file' | 'database' | 'elasticsearch' | 'cloudwatch' | 'datadog';
  configuration: any;
}

export interface TaskAnalytics {
  performance: PerformanceStats;
  reliability: ReliabilityStats;
  trends: TrendData[];
  predictions: PredictionData[];
  optimization: OptimizationRecommendation[];
}

export interface PerformanceStats {
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  throughput: number;
  resourceUtilization: ResourceUtilizationStats;
}

export interface ResourceUtilizationStats {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface ReliabilityStats {
  uptime: number; // percentage
  meanTimeBetweenFailures: number; // hours
  meanTimeToRecovery: number; // minutes
  errorRate: number; // percentage
  retryRate: number; // percentage
  timeoutRate: number; // percentage
}

export interface TrendData {
  metric: string;
  period: string;
  value: number;
  change: number; // percentage
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface PredictionData {
  metric: string;
  timeframe: string;
  predicted: number;
  confidence: number;
  factors: string[];
}

export interface OptimizationRecommendation {
  type: 'schedule' | 'resource' | 'retry' | 'concurrency' | 'dependency';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  savings: number; // percentage
}

export interface TaskSecurity {
  encryption: EncryptionConfig;
  access: AccessControl;
  audit: AuditConfig;
  compliance: ComplianceRule[];
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: boolean;
  keyRotationInterval: number; // days
}

export interface AccessControl {
  permissions: Permission[];
  roles: string[];
  restrictions: AccessRestriction[];
}

export interface Permission {
  action: 'view' | 'edit' | 'execute' | 'delete' | 'approve';
  subject: 'task' | 'schedule' | 'logs' | 'metrics';
  conditions?: string[];
}

export interface AccessRestriction {
  type: 'ip_whitelist' | 'time_window' | 'geolocation' | 'device' | 'mfa';
  configuration: any;
}

export interface AuditConfig {
  enabled: boolean;
  events: AuditEvent[];
  retention: number; // days
  immutable: boolean;
}

export interface AuditEvent {
  type: 'creation' | 'modification' | 'execution' | 'deletion' | 'access';
  fields: string[];
  required: boolean;
}

export interface ComplianceRule {
  regulation: string;
  requirements: string[];
  controls: ComplianceControl[];
  evidence: string[];
}

export interface ComplianceControl {
  name: string;
  description: string;
  automated: boolean;
  frequency: string;
  owner: string;
}

export interface TaskMetadata {
  tags: string[];
  documentation: string;
  version: number;
  changeLog: ChangeLogEntry[];
  customFields: CustomField[];
  relationships: TaskRelationship[];
}

export interface ChangeLogEntry {
  version: number;
  changes: string[];
  author: string;
  timestamp: Date;
  approved: boolean;
}

export interface CustomField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  value: any;
  description?: string;
}

export interface TaskRelationship {
  type: 'parent' | 'child' | 'sibling' | 'trigger' | 'dependency';
  taskId: string;
  description?: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: 'schedule' | 'manual' | 'dependency' | 'event' | 'api';
  triggeredByUser?: string;
  result?: TaskResult;
  error?: TaskError;
  logs: TaskLog[];
  metrics: ExecutionMetrics;
  context: ExecutionContext;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  output?: string;
  artifacts?: string[];
  metrics?: Record<string, number>;
}

export interface TaskError {
  code: string;
  message: string;
  details?: any;
  stackTrace?: string;
  retryable: boolean;
  category: 'system' | 'business' | 'network' | 'timeout' | 'dependency';
}

export interface TaskLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface ExecutionMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  customMetrics: Record<string, number>;
}

export interface ExecutionContext {
  environment: string;
  version: string;
  correlation: string;
  session?: string;
  tenant: string;
  user: string;
}

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly activeTasks = new Map<string, CronJob>();
  private static readonly ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @InjectQueue('scheduled-tasks') private readonly taskQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private stringify(payload: unknown): string {
    return JSON.stringify(payload, (_key, value) => (value instanceof Date ? value.toISOString() : value));
  }

  private toJsonObject(payload: unknown, context: string): Prisma.JsonObject {
    const plain = JSON.parse(this.stringify(payload));
    if (!plain || typeof plain !== 'object' || Array.isArray(plain)) {
      this.logger.warn(`Unable to serialize ${context}; persisting empty object.`);
      return {} as Prisma.JsonObject;
    }

    return plain as Prisma.JsonObject;
  }

  private reviveJsonValue<T>(value: Prisma.JsonValue | null): T | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return this.reviveDates(value) as T;
  }

  private reviveDates<T = unknown>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((item) => this.reviveDates(item)) as unknown as T;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        this.reviveDates(val),
      ]);

      return Object.fromEntries(entries) as unknown as T;
    }

    if (typeof value === 'string' && TaskSchedulerService.ISO_DATE_REGEX.test(value)) {
      return new Date(value) as unknown as T;
    }

    return value;
  }

  async createTask(
    userId: string,
    tenantId: string,
    taskData: {
      name: string;
      description: string;
      type: ScheduledTask['type'];
      category: ScheduledTask['category'];
      schedule: Partial<TaskSchedule>;
      action: TaskAction;
      priority?: ScheduledTask['priority'];
      conditions?: TaskCondition[];
      dependencies?: TaskDependency[];
      notifications?: TaskNotification[];
      retryPolicy?: Partial<RetryPolicy>;
      timeout?: number;
      monitoring?: Partial<TaskMonitoring>;
    }
  ): Promise<ScheduledTask> {
    return this.createScheduledTask(taskData, userId, tenantId);
  }

  async createScheduledTask(
    taskData: {
      name: string;
      description: string;
      type: ScheduledTask['type'];
      category: ScheduledTask['category'];
      schedule: Partial<TaskSchedule>;
      action: TaskAction;
      priority?: ScheduledTask['priority'];
      conditions?: TaskCondition[];
      dependencies?: TaskDependency[];
      notifications?: TaskNotification[];
      retryPolicy?: Partial<RetryPolicy>;
      timeout?: number;
      monitoring?: Partial<TaskMonitoring>;
    },
    userId: string,
    tenantId: string,
  ): Promise<ScheduledTask> {
    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      if (taskData.schedule.type === 'cron' && taskData.schedule.expression) {
        try {
          cronParser.parseExpression(taskData.schedule.expression);
        } catch (error) {
          throw new BadRequestException(`Invalid cron expression: ${taskData.schedule.expression}`);
        }
      }

      const createdAt = new Date();
      const schedule: TaskSchedule = {
        type: taskData.schedule.type || 'cron',
        expression: taskData.schedule.expression,
        interval: taskData.schedule.interval,
        delay: taskData.schedule.delay,
        timezone: taskData.schedule.timezone || 'UTC',
        startDate: taskData.schedule.startDate,
        endDate: taskData.schedule.endDate,
        maxRuns: taskData.schedule.maxRuns,
        runCount: 0,
        blackoutPeriods: taskData.schedule.blackoutPeriods || [],
      };

      const task: ScheduledTask = {
        id: taskId,
        name: taskData.name,
        description: taskData.description,
        type: taskData.type,
        category: taskData.category,
        status: 'active',
        priority: taskData.priority || 'normal',
        schedule,
        action: taskData.action,
        conditions: taskData.conditions || [],
        dependencies: taskData.dependencies || [],
        notifications: taskData.notifications || [],
        retryPolicy: {
          enabled: true,
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 60000,
          multiplier: 2,
          jitter: true,
          retryOn: ['error', 'timeout'],
          ...taskData.retryPolicy,
        },
        timeout: taskData.timeout || 300000,
        concurrency: {
          maxConcurrent: 1,
          queueing: 'fifo',
          resourceLimits: {
            cpu: 80,
            memory: 512,
            disk: 1024,
            network: 10,
            timeout: taskData.timeout || 300000,
          },
          isolation: 'process',
        },
        monitoring: {
          enabled: true,
          metrics: [
            { name: 'execution_duration', type: 'histogram', description: 'Task execution duration', labels: ['task_id', 'status'] },
            { name: 'execution_count', type: 'counter', description: 'Task execution count', labels: ['task_id', 'status'] },
          ],
          healthChecks: [],
          alerts: [],
          logging: {
            level: 'info',
            format: 'json',
            retention: 30,
            destinations: [{ type: 'database', configuration: { table: 'task_logs' } }],
            structured: true,
          },
          ...taskData.monitoring,
        },
        analytics: {
          performance: {
            averageDuration: 0,
            medianDuration: 0,
            p95Duration: 0,
            p99Duration: 0,
            successRate: 0,
            throughput: 0,
            resourceUtilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
          },
          reliability: {
            uptime: 0,
            meanTimeBetweenFailures: 0,
            meanTimeToRecovery: 0,
            errorRate: 0,
            retryRate: 0,
            timeoutRate: 0,
          },
          trends: [],
          predictions: [],
          optimization: [],
        },
        security: {
          encryption: {
            enabled: true,
            algorithm: 'AES-256-GCM',
            keyRotation: true,
            keyRotationInterval: 90,
          },
          access: {
            permissions: [
              { action: 'view', subject: 'task' },
              { action: 'edit', subject: 'task', conditions: [`creator == '${userId}'`] },
            ],
            roles: ['task_manager', 'admin'],
            restrictions: [],
          },
          audit: {
            enabled: true,
            events: [
              { type: 'creation', fields: ['name', 'schedule', 'action'], required: true },
              { type: 'execution', fields: ['status', 'duration', 'result'], required: true },
            ],
            retention: 2555,
            immutable: true,
          },
          compliance: [],
        },
        metadata: {
          tags: [],
          documentation: '',
          version: 1,
          changeLog: [
            {
              version: 1,
              changes: ['Initial creation'],
              author: userId,
              timestamp: createdAt,
              approved: true,
            },
          ],
          customFields: [],
          relationships: [],
        },
        tenantId,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
        nextRun: this.calculateNextRun(schedule),
      };

      await this.prisma.executions.create({
        data: {
          id: task.id,
          tenantId,
          provider: 'task_scheduler',
          brokerOrderId: task.name,
          localOrderId: task.type,
          symbol: task.category,
          side: task.priority,
          quantity: new Prisma.Decimal(task.timeout),
          price: new Prisma.Decimal(0),
          gross: new Prisma.Decimal(0),
          commission: new Prisma.Decimal(0),
          markup: new Prisma.Decimal(0),
          net: new Prisma.Decimal(0),
          status: task.status,
          executedQuantity: new Prisma.Decimal(0),
          executedPrice: new Prisma.Decimal(0),
          metadata: this.toJsonObject({ definition: task }, 'scheduled task metadata'),
          raw: this.toJsonObject(task, 'scheduled task raw payload'),
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        },
      });

      await this.redis.setex(`task:${task.id}`, 3600, this.stringify(task));
      await this.scheduleTask(task);
      this.logger.log(`Scheduled task created: ${task.id} (${task.name})`);

      return task;
    } catch (error) {
      this.logger.error('Error creating scheduled task', error);
      throw error;
    }
  }

  async executeTask(
    taskId: string,
    triggeredBy: TaskExecution['triggeredBy'] = 'manual',
    triggeredByUser?: string,
    context?: Partial<ExecutionContext>,
  ): Promise<TaskExecution> {
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new NotFoundException(`Task not found: ${taskId}`);
      }

      if (task.status !== 'active') {
        throw new BadRequestException(`Task is not active: ${taskId}`);
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const startTime = new Date();

      const execution: TaskExecution = {
        id: executionId,
        taskId,
        status: 'queued',
        startTime,
        triggeredBy,
        triggeredByUser: triggeredByUser || task.createdBy,
        logs: [],
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkUsage: 0,
          customMetrics: {},
        },
        context: {
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          correlation: `corr_${Date.now()}`,
          tenant: task.tenantId,
          user: triggeredByUser || task.createdBy,
          ...context,
        },
      };

      await this.prisma.executions.create({
        data: {
          id: executionId,
          tenantId: task.tenantId,
          provider: 'task_execution',
          brokerOrderId: taskId,
          localOrderId: execution.triggeredBy,
          symbol: execution.status,
          side: task.category,
          quantity: new Prisma.Decimal(1),
          price: new Prisma.Decimal(0),
          gross: new Prisma.Decimal(0),
          commission: new Prisma.Decimal(0),
          markup: new Prisma.Decimal(0),
          net: new Prisma.Decimal(0),
          status: execution.status,
          executedQuantity: new Prisma.Decimal(0),
          executedPrice: new Prisma.Decimal(0),
          metadata: this.toJsonObject({ execution }, 'task execution metadata'),
          raw: this.toJsonObject(execution, 'task execution raw payload'),
          createdAt: execution.startTime,
          updatedAt: execution.startTime,
        },
      });

      await this.taskQueue.add(
        'execute-task',
        { executionId },
        {
          priority: this.getPriority(task.priority),
          delay: 0,
          attempts: task.retryPolicy.enabled ? task.retryPolicy.maxAttempts : 1,
          backoff: {
            type: task.retryPolicy.backoffStrategy === 'exponential' ? 'exponential' : 'fixed',
            delay: task.retryPolicy.baseDelay,
          },
          timeout: task.timeout,
        },
      );

      await this.redis.setex(`execution:${executionId}`, 7200, this.stringify(execution));
      this.logger.log(`Task queued for execution: ${executionId} (task: ${taskId})`);

      return execution;
    } catch (error) {
      this.logger.error('Error executing task', error);
      throw error;
    }
  }

  async getTasks(
    userId: string,
    tenantId: string,
    options: {
      type?: string;
      category?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tasks: any[]; total: number }> {
    try {
      const [tasks, total] = await Promise.all([
        this.prisma.executions.findMany({
          where: {
            tenantId,
            provider: 'task_scheduler',
            ...(options.type && { localOrderId: options.type }),
            ...(options.category && { symbol: options.category }),
            ...(options.status && { status: options.status }),
            ...(options.search && {
              OR: [
                { brokerOrderId: { contains: options.search, mode: 'insensitive' as any } },
              ],
            }),
          },
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.executions.count({ 
          where: {
            tenantId,
            provider: 'task_scheduler',
            ...(options.type && { localOrderId: options.type }),
            ...(options.category && { symbol: options.category }),
            ...(options.status && { status: options.status }),
            ...(options.search && {
              OR: [
                { brokerOrderId: { contains: options.search, mode: 'insensitive' as any } },
              ],
            }),
          }
        }),
      ]);

      return {
        tasks: tasks.map(t => this.formatTask(t)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting tasks', error);
      return { tasks: [], total: 0 };
    }
  }

  async getExecutions(
    taskId: string,
    userId: string,
    tenantId: string,
    options: {
      status?: string;
      triggeredBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ executions: any[]; total: number }> {
    try {
      const [executions, total] = await Promise.all([
        this.prisma.executions.findMany({
          where: {
            tenantId,
            provider: 'task_execution',
            brokerOrderId: taskId,
            ...(options.status && { status: options.status }),
            ...(options.triggeredBy && { localOrderId: options.triggeredBy }),
          },
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.executions.count({
          where: {
            tenantId,
            provider: 'task_execution',
            brokerOrderId: taskId,
            ...(options.status && { status: options.status }),
            ...(options.triggeredBy && { localOrderId: options.triggeredBy }),
          },
        }),
      ]);

      return {
        executions: executions.map(e => this.formatExecution(e)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting executions', error);
      return { executions: [], total: 0 };
    }
  }

  async getTaskAnalytics(
    taskId: string,
    userId: string,
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      // Get task analytics from cache or calculate
      const cacheKey = `task_analytics:${taskId}:${period}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate analytics (simplified for demo)
      const analytics = {
        overview: {
          totalExecutions: 245,
          successfulExecutions: 231,
          failedExecutions: 14,
          averageDuration: 5.2, // seconds
          successRate: 94.3,
          lastExecution: new Date(),
        },
        performance: {
          duration: [
            { period: '2024-01-01', avg: 4.8, p95: 12.3, p99: 28.1 },
            { period: '2024-01-02', avg: 5.1, p95: 13.2, p99: 29.5 },
            { period: '2024-01-03', avg: 5.2, p95: 12.8, p99: 27.9 },
          ],
          throughput: [
            { period: '2024-01-01', value: 24 },
            { period: '2024-01-02', value: 28 },
            { period: '2024-01-03', value: 26 },
          ],
          reliability: [
            { period: '2024-01-01', value: 95.8 },
            { period: '2024-01-02', value: 93.2 },
            { period: '2024-01-03', value: 94.3 },
          ],
        },
        errors: [
          {
            type: 'timeout',
            count: 8,
            percentage: 57.1,
            trend: 'decreasing',
          },
          {
            type: 'dependency_failure',
            count: 4,
            percentage: 28.6,
            trend: 'stable',
          },
          {
            type: 'system_error',
            count: 2,
            percentage: 14.3,
            trend: 'increasing',
          },
        ],
        resources: {
          cpu: { avg: 23.5, peak: 67.2, trend: 'stable' },
          memory: { avg: 156.8, peak: 342.1, trend: 'increasing' },
          disk: { avg: 45.2, peak: 89.7, trend: 'stable' },
          network: { avg: 2.1, peak: 8.4, trend: 'stable' },
        },
        optimization: [
          {
            type: 'schedule',
            description: 'Consider running during off-peak hours',
            impact: 'medium',
            savings: 15,
          },
          {
            type: 'resource',
            description: 'Adjust memory limits for efficiency',
            impact: 'low',
            savings: 5,
          },
        ],
      };

      await this.redis.setex(cacheKey, 900, this.stringify(analytics));
      return analytics;
    } catch (error) {
      this.logger.error('Error getting task analytics', error);
      return null;
    }
  }

  private async scheduleTask(task: ScheduledTask): Promise<void> {
    try {
      if (task.schedule.type === 'cron' && task.schedule.expression) {
        const job = new CronJob(
          task.schedule.expression,
          async () => {
            try {
              await this.executeTask(task.id, 'schedule');
            } catch (error) {
              this.logger.error(`Error executing scheduled task ${task.id}`, error);
            }
          },
          null,
          false,
          task.schedule.timezone || 'UTC'
        );

        this.activeTasks.set(task.id, job);
        this.schedulerRegistry.addCronJob(task.id, job);
        job.start();

        this.logger.log(`Scheduled cron task: ${task.id} with expression: ${task.schedule.expression}`);
      } else if (task.schedule.type === 'interval' && task.schedule.interval) {
        const interval = setInterval(async () => {
          try {
            await this.executeTask(task.id, 'schedule');
          } catch (error) {
            this.logger.error(`Error executing interval task ${task.id}`, error);
          }
        }, task.schedule.interval);

        this.schedulerRegistry.addInterval(task.id, interval);
        this.logger.log(`Scheduled interval task: ${task.id} with interval: ${task.schedule.interval}ms`);
      } else if (task.schedule.type === 'timeout' && task.schedule.delay) {
        const timeout = setTimeout(async () => {
          try {
            await this.executeTask(task.id, 'schedule');
          } catch (error) {
            this.logger.error(`Error executing timeout task ${task.id}`, error);
          }
        }, task.schedule.delay);

        this.schedulerRegistry.addTimeout(task.id, timeout);
        this.logger.log(`Scheduled timeout task: ${task.id} with delay: ${task.schedule.delay}ms`);
      }
    } catch (error) {
      this.logger.error(`Error scheduling task ${task.id}`, error);
      throw error;
    }
  }

  private calculateNextRun(schedule: TaskSchedule): Date | undefined {
    try {
      if (schedule.type === 'cron' && schedule.expression) {
        const interval = cronParser.parseExpression(schedule.expression, {
          tz: schedule.timezone || 'UTC',
        });
        return interval.next().toDate();
      } else if (schedule.type === 'interval' && schedule.interval) {
        return new Date(Date.now() + schedule.interval);
      } else if (schedule.type === 'timeout' && schedule.delay) {
        return new Date(Date.now() + schedule.delay);
      }
      return undefined;
    } catch (error) {
      this.logger.warn('Error calculating next run', error);
      return undefined;
    }
  }

  private async getTask(taskId: string, userId: string, tenantId: string): Promise<ScheduledTask | null>;
  private async getTask(taskId: string): Promise<ScheduledTask | null>;
  private async getTask(taskId: string, userId?: string, tenantId?: string): Promise<ScheduledTask | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`task:${taskId}`);
      if (cached) {
        return JSON.parse(cached) as ScheduledTask;
      }

      // Fall back to database using executions table
      const task = await this.prisma.executions.findUnique({
        where: { id: taskId },
      });

      if (task && task.provider === 'task_scheduler') {
        const storedDefinition = (task.raw as unknown as ScheduledTask) ?? (task.metadata as unknown as ScheduledTask) ?? ({} as ScheduledTask);
        const timeoutMs =
          storedDefinition.timeout ??
          (task.quantity && typeof task.quantity === 'object' && 'toNumber' in task.quantity
            ? (task.quantity as Prisma.Decimal).toNumber()
            : Number(task.quantity ?? 300000));

        const formatted: ScheduledTask = {
          id: task.id,
          name: task.brokerOrderId || storedDefinition.name || 'Unknown Task',
          description: storedDefinition.description || '',
          type: (task.localOrderId as any) || storedDefinition.type || 'cron',
          category: (task.symbol as any) || storedDefinition.category || 'system',
          status: (task.status as any) || storedDefinition.status || 'active',
          priority: (task.side as any) || storedDefinition.priority || 'normal',
          schedule: storedDefinition.schedule || { type: 'cron', expression: '0 0 * * *' },
          action: storedDefinition.action || { type: 'api_call', configuration: {}, parameters: {} },
          conditions: storedDefinition.conditions || [],
          dependencies: storedDefinition.dependencies || [],
          notifications: storedDefinition.notifications || [],
          retryPolicy:
            storedDefinition.retryPolicy ||
            { enabled: false, maxAttempts: 1, backoffStrategy: 'fixed', baseDelay: 1000, maxDelay: 60000, retryOn: [] },
          timeout: timeoutMs,
          concurrency:
            storedDefinition.concurrency ||
            {
              maxConcurrent: 1,
              queueing: 'fifo',
              resourceLimits: { cpu: 100, memory: 512, disk: 1024, network: 100, timeout: 300000 },
              isolation: 'none',
            },
          monitoring:
            storedDefinition.monitoring ||
            {
              enabled: false,
              metrics: [],
              healthChecks: [],
              alerts: [],
              logging: { level: 'info', format: 'json', retention: 30, destinations: [], structured: true },
            },
          analytics:
            storedDefinition.analytics ||
            {
              performance: {
                averageDuration: 0,
                medianDuration: 0,
                p95Duration: 0,
                p99Duration: 0,
                successRate: 100,
                throughput: 0,
                resourceUtilization: { cpu: 0, memory: 0, disk: 0, network: 0 },
              },
              reliability: {
                uptime: 100,
                meanTimeBetweenFailures: 0,
                meanTimeToRecovery: 0,
                errorRate: 0,
                retryRate: 0,
                timeoutRate: 0,
              },
              trends: [],
              predictions: [],
              optimization: [],
            },
          security:
            storedDefinition.security ||
            {
              encryption: { enabled: false, algorithm: 'AES-256', keyRotation: false, keyRotationInterval: 30 },
              access: { permissions: [], roles: [], restrictions: [] },
              audit: { enabled: false, events: [], retention: 90, immutable: false },
              compliance: [],
            },
          metadata:
            storedDefinition.metadata || {
              tags: [],
              documentation: '',
              version: 1,
              changeLog: [],
              customFields: [],
              relationships: [],
            },
          tenantId: task.tenantId,
          createdBy: storedDefinition.createdBy || 'system',
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          lastRun: storedDefinition.lastRun,
          nextRun: storedDefinition.nextRun,
        };
        await this.redis.setex(`task:${taskId}`, 3600, this.stringify(formatted));
        return formatted;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting task', error);
      return null;
    }
  }

  private getPriority(priority: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 3;
      case 'normal': return 5;
      case 'low': return 7;
      default: return 5;
    }
  }

  private formatTask(record: any): any {
    const definition =
      this.reviveJsonValue<{ definition: ScheduledTask }>(record.metadata)?.definition ||
      this.reviveJsonValue<ScheduledTask>(record.raw) ||
      ({} as ScheduledTask);

    return {
      taskId: record.id,
      name: record.brokerOrderId || definition.name || 'Unnamed Task',
      type: record.localOrderId || definition.type || 'cron',
      category: record.symbol || definition.category || 'system',
      status: record.status || definition.status || 'active',
      priority: record.side || definition.priority || 'normal',
      schedule: definition.schedule?.expression || 'manual',
      nextRun: definition.nextRun ?? record.executedAt ?? this.calculateNextRun(definition.schedule),
      lastRun: definition.lastRun,
      successRate: definition.analytics?.performance?.successRate || 0,
      createdBy: definition.createdBy || 'system',
      createdAt: definition.createdAt || record.createdAt,
      updatedAt: definition.updatedAt || record.updatedAt,
    };
  }

  private formatExecution(record: any): any {
    const executionData =
      this.reviveJsonValue<{ execution: TaskExecution }>(record.metadata)?.execution ||
      this.reviveJsonValue<TaskExecution>(record.raw) ||
      ({} as TaskExecution);

    return {
      executionId: record.id,
      taskId: record.brokerOrderId || executionData.taskId,
      status: record.status || executionData.status,
      triggeredBy: record.localOrderId || executionData.triggeredBy,
      startTime: record.createdAt,
      endTime: executionData.endTime,
      duration: executionData.duration,
      success: executionData.result?.success,
      error: executionData.error?.message,
    };
  }
}
