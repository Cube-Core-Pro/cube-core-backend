// path: backend/src/modules/automation/services/rule-engine.service.ts
// purpose: Enterprise rule engine for business logic automation
// dependencies: @nestjs/common, prisma, redis, json-rules-engine

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'validation' | 'transformation' | 'routing' | 'approval' | 'escalation' | 'pricing' | 'compliance' | 'security';
  priority: number;
  status: 'active' | 'inactive' | 'draft' | 'testing';
  version: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata: RuleMetadata;
  execution: ExecutionConfig;
  monitoring: RuleMonitoring;
  analytics: RuleAnalytics;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  effectiveFrom?: Date;
  effectiveTo?: Date;
}

export interface RuleCondition {
  id: string;
  type: 'simple' | 'complex' | 'nested' | 'function';
  operator: ConditionOperator;
  field: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'regex';
  source: 'input' | 'context' | 'database' | 'api' | 'calculation';
  sourceConfig?: SourceConfiguration;
  negated: boolean;
  weight?: number;
  children?: RuleCondition[];
  logicalOperator?: 'AND' | 'OR' | 'NOT' | 'XOR';
}

export type ConditionOperator = 
  | 'equals' | 'not_equals'
  | 'greater_than' | 'greater_than_or_equal'
  | 'less_than' | 'less_than_or_equal'
  | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with'
  | 'in' | 'not_in'
  | 'is_null' | 'is_not_null'
  | 'is_empty' | 'is_not_empty'
  | 'matches_regex' | 'not_matches_regex'
  | 'between' | 'not_between'
  | 'exists' | 'not_exists'
  | 'has_changed' | 'has_not_changed'
  | 'is_true' | 'is_false'
  | 'custom_function';

export interface SourceConfiguration {
  // Database source
  table?: string;
  query?: string;
  connection?: string;
  
  // API source
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  authentication?: APIAuthentication;
  
  // Calculation source
  formula?: string;
  variables?: string[];
  
  // Context source
  contextPath?: string;
  defaultValue?: any;
}

export interface APIAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  credentials: any;
}

export interface RuleAction {
  id: string;
  type: 'assignment' | 'calculation' | 'validation' | 'transformation' | 'notification' | 'api_call' | 'workflow' | 'approval' | 'custom';
  order: number;
  configuration: ActionConfiguration;
  conditions?: RuleCondition[];
  errorHandling: ActionErrorHandling;
  async: boolean;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

export interface ActionConfiguration {
  // Assignment action
  target?: string;
  value?: any;
  operation?: 'set' | 'add' | 'subtract' | 'multiply' | 'divide' | 'append' | 'prepend';
  
  // Calculation action
  formula?: string;
  variables?: Record<string, string>;
  precision?: number;
  
  // Validation action
  validationRules?: ValidationRule[];
  failureAction?: 'stop' | 'continue' | 'notify' | 'escalate';
  
  // Transformation action
  transformationType?: 'map' | 'filter' | 'reduce' | 'sort' | 'format' | 'convert';
  transformationConfig?: TransformationConfig;
  
  // Notification action
  notificationType?: 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'in_app';
  recipients?: string[];
  template?: string;
  subject?: string;
  message?: string;
  
  // API call action
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  authentication?: APIAuthentication;
  responseMapping?: Record<string, string>;
  
  // Workflow action
  workflowId?: string;
  workflowData?: any;
  waitForCompletion?: boolean;
  
  // Approval action
  approvers?: string[];
  approvalType?: 'single' | 'majority' | 'unanimous' | 'hierarchical';
  deadline?: number; // minutes
  escalationRules?: EscalationRule[];
  
  // Custom action
  functionName?: string;
  parameters?: Record<string, any>;
  module?: string;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'url' | 'pattern' | 'range' | 'length' | 'custom';
  value?: any;
  message: string;
}

export interface TransformationConfig {
  // Map transformation
  mapping?: Record<string, string>;
  defaultValue?: any;
  
  // Filter transformation
  filterExpression?: string;
  
  // Sort transformation
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Format transformation
  format?: string;
  locale?: string;
  
  // Convert transformation
  fromType?: string;
  toType?: string;
  conversionOptions?: any;
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  recipients: string[];
  action: 'notify' | 'escalate' | 'auto_approve' | 'auto_reject';
}

export interface ActionErrorHandling {
  onError: 'stop' | 'continue' | 'retry' | 'fallback' | 'escalate';
  fallbackAction?: RuleAction;
  maxRetries?: number;
  retryDelay?: number;
  notifyOnError?: boolean;
  errorRecipients?: string[];
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

export interface RuleMetadata {
  tags: string[];
  documentation: string;
  examples: RuleExample[];
  changeLog: ChangeLogEntry[];
  dependencies: RuleDependency[];
  testing: TestConfiguration;
  compliance: ComplianceInfo;
}

export interface RuleExample {
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  context?: any;
}

export interface ChangeLogEntry {
  version: number;
  changes: string[];
  author: string;
  timestamp: Date;
  approved: boolean;
  approver?: string;
}

export interface RuleDependency {
  type: 'rule' | 'service' | 'data' | 'api';
  identifier: string;
  version?: string;
  required: boolean;
}

export interface TestConfiguration {
  enabled: boolean;
  testCases: TestCase[];
  coverage: TestCoverage;
  performance: PerformanceTest[];
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: any;
  context?: any;
  expectedResult: TestResult;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  lastRun?: Date;
}

export interface TestResult {
  success: boolean;
  conditionsMet: boolean;
  actionsExecuted: string[];
  output: any;
  duration: number;
  errors?: TestError[];
}

export interface TestError {
  step: string;
  message: string;
  expected: any;
  actual: any;
}

export interface TestCoverage {
  conditions: number; // percentage
  actions: number; // percentage
  branches: number; // percentage
  overall: number; // percentage
}

export interface PerformanceTest {
  name: string;
  concurrent: number;
  iterations: number;
  targetDuration: number; // milliseconds
  actualDuration?: number;
  passed?: boolean;
}

export interface ComplianceInfo {
  regulations: string[];
  controls: ComplianceControl[];
  auditTrail: boolean;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface ComplianceControl {
  name: string;
  description: string;
  requirement: string;
  implementation: string;
  evidence: string[];
}

export interface ExecutionConfig {
  mode: 'sync' | 'async' | 'batch';
  timeout: number; // milliseconds
  concurrency: number;
  rateLimiting: RateLimiting;
  caching: CachingConfig;
  logging: LoggingConfig;
  monitoring: ExecutionMonitoring;
}

export interface RateLimiting {
  enabled: boolean;
  maxRequests: number;
  window: number; // seconds
  strategy: 'fixed_window' | 'sliding_window' | 'token_bucket';
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // seconds
  strategy: 'memory' | 'redis' | 'database';
  keyPattern: string;
  invalidationRules: string[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeInput: boolean;
  includeOutput: boolean;
  includeContext: boolean;
  retention: number; // days
}

export interface ExecutionMonitoring {
  enabled: boolean;
  metrics: string[];
  alerts: AlertRule[];
  sampling: number; // percentage
}

export interface AlertRule {
  metric: string;
  condition: string;
  threshold: number;
  recipients: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RuleMonitoring {
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  usage: UsageMetrics;
  health: HealthMetrics;
}

export interface PerformanceMetrics {
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  throughput: number; // executions per second
  concurrency: number;
}

export interface ReliabilityMetrics {
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  uptime: number;
  meanTimeBetweenFailures: number;
  meanTimeToRecovery: number;
}

export interface UsageMetrics {
  totalExecutions: number;
  uniqueUsers: number;
  peakHourUsage: number;
  usageByCategory: Record<string, number>;
  topUsers: UserUsage[];
}

export interface UserUsage {
  userId: string;
  executions: number;
  successRate: number;
  averageDuration: number;
}

export interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number; // 0-100
  issues: HealthIssue[];
  recommendations: string[];
  lastCheck: Date;
}

export interface HealthIssue {
  type: 'performance' | 'reliability' | 'capacity' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  detected: Date;
}

export interface RuleAnalytics {
  usage: RuleUsageAnalytics;
  effectiveness: EffectivenessMetrics;
  optimization: OptimizationSuggestion[];
  trends: TrendAnalysis[];
  benchmarking: BenchmarkData;
}

export interface RuleUsageAnalytics {
  totalExecutions: number;
  uniqueContexts: number;
  conditionMatchRate: number;
  actionExecutionRate: number;
  usagePattern: UsagePattern[];
}

export interface UsagePattern {
  period: string;
  executions: number;
  successRate: number;
  averageDuration: number;
}

export interface EffectivenessMetrics {
  accuracy: number; // percentage of correct outcomes
  precision: number; // percentage of positive predictions that were correct
  recall: number; // percentage of actual positives correctly identified
  f1Score: number; // harmonic mean of precision and recall
  businessImpact: BusinessImpactMetrics;
}

export interface BusinessImpactMetrics {
  costSavings: number;
  timeReduction: number; // percentage
  errorReduction: number; // percentage
  complianceImprovement: number; // percentage
  customerSatisfaction: number; // score
}

export interface OptimizationSuggestion {
  type: 'condition' | 'action' | 'structure' | 'performance' | 'reliability';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  implementation: string[];
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
  changeRate: number; // percentage
  significance: 'low' | 'medium' | 'high';
  factors: string[];
}

export interface BenchmarkData {
  category: string;
  industryAverage: number;
  bestInClass: number;
  currentPerformance: number;
  ranking: number; // percentile
  improvementPotential: number; // percentage
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  status: 'success' | 'failure' | 'timeout' | 'error';
  startTime: Date;
  endTime: Date;
  duration: number;
  input: any;
  output: any;
  context: ExecutionContext;
  steps: ExecutionStep[];
  metrics: ExecutionMetrics;
  errors?: ExecutionError[];
}

export interface ExecutionContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  correlationId: string;
  environment: string;
  source: string;
  metadata: Record<string, any>;
}

export interface ExecutionStep {
  type: 'condition' | 'action';
  id: string;
  name: string;
  status: 'success' | 'failure' | 'skipped';
  startTime: Date;
  endTime: Date;
  duration: number;
  input?: any;
  output?: any;
  error?: StepError;
}

export interface StepError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface ExecutionMetrics {
  conditionsEvaluated: number;
  conditionsMet: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  resourceUsage: ResourceUsage;
  performance: PerformanceData;
}

export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // MB
  network: number; // bytes
  database: number; // queries
  api: number; // calls
}

export interface PerformanceData {
  evaluationTime: number;
  actionTime: number;
  totalTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface ExecutionError {
  step: string;
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  version: number;
  rules: string[]; // Rule IDs
  executionOrder: 'priority' | 'sequential' | 'parallel' | 'conditional';
  status: 'active' | 'inactive' | 'draft';
  metadata: RuleSetMetadata;
  analytics: RuleSetAnalytics;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleSetMetadata {
  tags: string[];
  category: string;
  purpose: string;
  documentation: string;
  dependencies: string[];
}

export interface RuleSetAnalytics {
  totalExecutions: number;
  averageDuration: number;
  successRate: number;
  rulePerformance: RulePerformance[];
}

export interface RulePerformance {
  ruleId: string;
  executionCount: number;
  successRate: number;
  averageDuration: number;
  contribution: number; // percentage of total execution time
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createRule(
    userId: string,
    tenantId: string,
    ruleData: {
      name: string;
      description: string;
      category: BusinessRule['category'];
      priority?: number;
      conditions: Partial<RuleCondition>[];
      actions: Partial<RuleAction>[];
      metadata?: Partial<RuleMetadata>;
      execution?: Partial<ExecutionConfig>;
      effectiveFrom?: Date;
      effectiveTo?: Date;
    }
  ): Promise<BusinessRule> {
    try {
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const rule: BusinessRule = {
        id: ruleId,
        name: ruleData.name,
        description: ruleData.description,
        category: ruleData.category,
        priority: ruleData.priority || 100,
        status: 'draft',
        version: 1,
        conditions: ruleData.conditions.map((condition, index) => ({
          id: condition.id || `cond_${index + 1}`,
          type: condition.type || 'simple',
          operator: condition.operator || 'equals',
          field: condition.field || '',
          value: condition.value,
          dataType: condition.dataType || 'string',
          source: condition.source || 'input',
          sourceConfig: condition.sourceConfig,
          negated: condition.negated || false,
          weight: condition.weight,
          children: condition.children,
          logicalOperator: condition.logicalOperator,
        })),
        actions: ruleData.actions.map((action, index) => ({
          id: action.id || `action_${index + 1}`,
          type: action.type || 'assignment',
          order: action.order || index + 1,
          configuration: action.configuration || {},
          conditions: action.conditions,
          errorHandling: action.errorHandling || {
            onError: 'stop',
            maxRetries: 3,
            retryDelay: 1000,
            notifyOnError: true,
            errorRecipients: [userId],
          },
          async: action.async || false,
          timeout: action.timeout || 30000,
          retryPolicy: action.retryPolicy || {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000,
            maxDelay: 30000,
          },
        })),
        metadata: {
          tags: [],
          documentation: '',
          examples: [],
          changeLog: [{
            version: 1,
            changes: ['Initial creation'],
            author: userId,
            timestamp: new Date(),
            approved: false,
          }],
          dependencies: [],
          testing: {
            enabled: true,
            testCases: [],
            coverage: {
              conditions: 0,
              actions: 0,
              branches: 0,
              overall: 0,
            },
            performance: [],
          },
          compliance: {
            regulations: [],
            controls: [],
            auditTrail: true,
            dataClassification: 'internal',
          },
          ...ruleData.metadata,
        },
        execution: {
          mode: 'sync',
          timeout: 30000,
          concurrency: 1,
          rateLimiting: {
            enabled: false,
            maxRequests: 100,
            window: 60,
            strategy: 'fixed_window',
          },
          caching: {
            enabled: true,
            ttl: 300,
            strategy: 'redis',
            keyPattern: 'rule:{ruleId}:{hash}',
            invalidationRules: [],
          },
          logging: {
            level: 'info',
            includeInput: true,
            includeOutput: true,
            includeContext: false,
            retention: 30,
          },
          monitoring: {
            enabled: true,
            metrics: ['execution_time', 'success_rate', 'condition_match_rate'],
            alerts: [],
            sampling: 100,
          },
          ...ruleData.execution,
        },
        monitoring: {
          performance: {
            averageExecutionTime: 0,
            medianExecutionTime: 0,
            p95ExecutionTime: 0,
            p99ExecutionTime: 0,
            throughput: 0,
            concurrency: 0,
          },
          reliability: {
            successRate: 0,
            errorRate: 0,
            timeoutRate: 0,
            uptime: 0,
            meanTimeBetweenFailures: 0,
            meanTimeToRecovery: 0,
          },
          usage: {
            totalExecutions: 0,
            uniqueUsers: 0,
            peakHourUsage: 0,
            usageByCategory: {},
            topUsers: [],
          },
          health: {
            status: 'healthy',
            score: 100,
            issues: [],
            recommendations: [],
            lastCheck: new Date(),
          },
        },
        analytics: {
          usage: {
            totalExecutions: 0,
            uniqueContexts: 0,
            conditionMatchRate: 0,
            actionExecutionRate: 0,
            usagePattern: [],
          },
          effectiveness: {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            businessImpact: {
              costSavings: 0,
              timeReduction: 0,
              errorReduction: 0,
              complianceImprovement: 0,
              customerSatisfaction: 0,
            },
          },
          optimization: [],
          trends: [],
          benchmarking: {
            category: ruleData.category,
            industryAverage: 0,
            bestInClass: 0,
            currentPerformance: 0,
            ranking: 0,
            improvementPotential: 0,
          },
        },
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        effectiveFrom: ruleData.effectiveFrom,
        effectiveTo: ruleData.effectiveTo,
      };

      // Store in database
      await this.prisma.businessRule.create({
        data: {
          id: ruleId,
          name: rule.name,
          category: rule.category,
          priority: rule.priority,
          status: rule.status,
          version: rule.version,
          definition: rule as any,
          tenantId,
          createdBy: userId,
          createdAt: rule.createdAt,
        },
      });

      // Cache rule
      await this.redis.setex(`rule:${ruleId}`, 3600, JSON.stringify(rule));

      this.logger.log(`Business rule created: ${ruleId} (${rule.name})`);
      return rule;
    } catch (error) {
      this.logger.error('Error creating business rule', error);
      throw error;
    }
  }

  async executeRule(
    ruleId: string,
    input: any,
    context: Partial<ExecutionContext> = {}
  ): Promise<RuleExecution> {
    try {
      // Get rule definition
      const rule = await this.getRule(ruleId);
      if (!rule) {
        throw new NotFoundException(`Rule not found: ${ruleId}`);
      }

      if (rule.status !== 'active') {
        throw new BadRequestException(`Rule is not active: ${ruleId}`);
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = new Date();

      const execution: RuleExecution = {
        id: executionId,
        ruleId,
        status: 'success',
        startTime,
        endTime: new Date(),
        duration: 0,
        input,
        output: null,
        context: {
          tenantId: rule.tenantId,
          userId: context.userId || 'system',
          correlationId: context.correlationId || `corr_${Date.now()}`,
          environment: process.env.NODE_ENV || 'development',
          source: context.source || 'api',
          metadata: context.metadata || {},
          ...context,
        },
        steps: [],
        metrics: {
          conditionsEvaluated: 0,
          conditionsMet: 0,
          actionsExecuted: 0,
          actionsSucceeded: 0,
          resourceUsage: {
            cpu: 0,
            memory: 0,
            network: 0,
            database: 0,
            api: 0,
          },
          performance: {
            evaluationTime: 0,
            actionTime: 0,
            totalTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
          },
        },
      };

      // Evaluate conditions
      const conditionsResult = await this.evaluateConditions(rule.conditions, input, execution.context);
      execution.metrics.conditionsEvaluated = conditionsResult.steps.length;
      execution.metrics.conditionsMet = conditionsResult.steps.filter(s => s.status === 'success').length;
      execution.steps.push(...conditionsResult.steps);

      if (conditionsResult.result) {
        // Execute actions
        const actionsResult = await this.executeActions(rule.actions, input, execution.context);
        execution.metrics.actionsExecuted = actionsResult.steps.length;
        execution.metrics.actionsSucceeded = actionsResult.steps.filter(s => s.status === 'success').length;
        execution.steps.push(...actionsResult.steps);
        execution.output = actionsResult.output;

        if (actionsResult.errors.length > 0) {
          execution.status = 'error';
          execution.errors = actionsResult.errors;
        }
      } else {
        execution.output = { conditionsMet: false, message: 'Rule conditions not satisfied' };
      }

      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.metrics.performance.totalTime = execution.duration;

      // Store execution
      await this.prisma.ruleExecution.create({
        data: {
          id: executionId,
          ruleId,
          status: execution.status,
          duration: execution.duration,
          execution: execution as any,
          createdAt: execution.startTime,
        },
      });

      // Update rule analytics
      await this.updateRuleAnalytics(ruleId, execution);

      this.logger.log(`Rule executed: ${executionId} (rule: ${ruleId}, status: ${execution.status})`);
      return execution;
    } catch (error) {
      this.logger.error('Error executing rule', error);
      throw error;
    }
  }

  async getRules(
    userId: string,
    tenantId: string,
    options: {
      category?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ rules: any[]; total: number }> {
    try {
      const where = {
        tenantId,
        isDeleted: false,
        ...(options.category && { category: options.category }),
        ...(options.status && { status: options.status }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
          ],
        }),
      };

      const [rules, total] = await Promise.all([
        this.prisma.businessRule.findMany({
          where,
          orderBy: { priority: 'asc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.businessRule.count({ where }),
      ]);

      return {
        rules: rules.map(r => this.formatRule(r)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting rules', error);
      return { rules: [], total: 0 };
    }
  }

  async getRuleAnalytics(
    ruleId: string,
    userId: string,
    tenantId: string,
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      // Get rule analytics from cache or calculate
      const cacheKey = `rule_analytics:${ruleId}:${period}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate analytics (simplified for demo)
      const analytics = {
        overview: {
          totalExecutions: 1234,
          successfulExecutions: 1198,
          failedExecutions: 36,
          averageDuration: 45.6, // milliseconds
          successRate: 97.1,
          conditionMatchRate: 89.3,
        },
        performance: {
          executionTime: [
            { period: '2024-01-01', avg: 42.3, p95: 156.7, p99: 289.1 },
            { period: '2024-01-02', avg: 44.8, p95: 162.3, p99: 295.4 },
            { period: '2024-01-03', avg: 45.6, p95: 158.9, p99: 287.6 },
          ],
          throughput: [
            { period: '2024-01-01', value: 145 },
            { period: '2024-01-02', value: 162 },
            { period: '2024-01-03', value: 158 },
          ],
          accuracy: [
            { period: '2024-01-01', value: 96.8 },
            { period: '2024-01-02', value: 97.5 },
            { period: '2024-01-03', value: 97.1 },
          ],
        },
        conditions: [
          {
            id: 'cond_1',
            name: 'Amount threshold check',
            matchRate: 92.4,
            averageEvaluationTime: 12.3,
            impact: 'high',
          },
          {
            id: 'cond_2',
            name: 'User role validation',
            matchRate: 87.6,
            averageEvaluationTime: 8.7,
            impact: 'medium',
          },
        ],
        actions: [
          {
            id: 'action_1',
            name: 'Send notification',
            executionRate: 89.3,
            successRate: 98.7,
            averageDuration: 156.8,
          },
          {
            id: 'action_2',
            name: 'Update status',
            executionRate: 89.3,
            successRate: 99.2,
            averageDuration: 23.4,
          },
        ],
        businessImpact: {
          costSavings: 15420.0,
          timeReduction: 34.5, // percentage
          errorReduction: 67.8, // percentage
          processAutomation: 78.9, // percentage
        },
        optimization: [
          {
            type: 'condition',
            description: 'Optimize condition evaluation order',
            impact: 'medium',
            expectedBenefit: '15% performance improvement',
          },
          {
            type: 'action',
            description: 'Batch notification actions',
            impact: 'low',
            expectedBenefit: '8% resource reduction',
          },
        ],
      };

      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(analytics));
      return analytics;
    } catch (error) {
      this.logger.error('Error getting rule analytics', error);
      return null;
    }
  }

  private async evaluateConditions(
    conditions: RuleCondition[],
    input: any,
    context: ExecutionContext
  ): Promise<{ result: boolean; steps: ExecutionStep[] }> {
    const steps: ExecutionStep[] = [];
    let result = true;

    for (const condition of conditions) {
      const stepStartTime = new Date();
      const step: ExecutionStep = {
        type: 'condition',
        id: condition.id,
        name: `Condition: ${condition.field} ${condition.operator} ${condition.value}`,
        status: 'success',
        startTime: stepStartTime,
        endTime: new Date(),
        duration: 0,
        input: { field: condition.field, value: condition.value },
      };

      try {
        // Simplified condition evaluation (would use a proper rules engine in production)
        const fieldValue = this.extractFieldValue(input, condition.field);
        const conditionResult = this.evaluateCondition(fieldValue, condition);
        
        step.output = { result: conditionResult, fieldValue };
        step.status = conditionResult ? 'success' : 'failure';
        
        if (!conditionResult) {
          result = false;
        }
      } catch (error) {
        step.status = 'failure';
        step.error = {
          code: 'CONDITION_ERROR',
          message: error.message,
          recoverable: false,
        };
        result = false;
      }

      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      steps.push(step);
    }

    return { result, steps };
  }

  private async executeActions(
    actions: RuleAction[],
    input: any,
    context: ExecutionContext
  ): Promise<{ output: any; steps: ExecutionStep[]; errors: ExecutionError[] }> {
    const steps: ExecutionStep[] = [];
    const errors: ExecutionError[] = [];
    let output: any = {};

    // Sort actions by order
    const sortedActions = [...actions].sort((a, b) => a.order - b.order);

    for (const action of sortedActions) {
      const stepStartTime = new Date();
      const step: ExecutionStep = {
        type: 'action',
        id: action.id,
        name: `Action: ${action.type}`,
        status: 'success',
        startTime: stepStartTime,
        endTime: new Date(),
        duration: 0,
        input: action.configuration,
      };

      try {
        // Simplified action execution (would implement proper action handlers)
        const actionResult = await this.executeAction(action, input, context);
        step.output = actionResult;
        output = { ...output, ...actionResult };
      } catch (error) {
        step.status = 'failure';
        step.error = {
          code: 'ACTION_ERROR',
          message: error.message,
          recoverable: action.errorHandling.onError !== 'stop',
        };
        
        errors.push({
          step: action.id,
          code: 'ACTION_ERROR',
          message: error.message,
          timestamp: new Date(),
          recoverable: action.errorHandling.onError !== 'stop',
        });

        if (action.errorHandling.onError === 'stop') {
          break;
        }
      }

      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      steps.push(step);
    }

    return { output, steps, errors };
  }

  private extractFieldValue(input: any, fieldPath: string): any {
    const paths = fieldPath.split('.');
    let value = input;
    
    for (const path of paths) {
      if (value && typeof value === 'object' && path in value) {
        value = value[path];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, condition: RuleCondition): boolean {
    const { operator, value, dataType, negated } = condition;
    let result = false;

    switch (operator) {
      case 'equals':
        result = fieldValue === value;
        break;
      case 'not_equals':
        result = fieldValue !== value;
        break;
      case 'greater_than':
        result = Number(fieldValue) > Number(value);
        break;
      case 'greater_than_or_equal':
        result = Number(fieldValue) >= Number(value);
        break;
      case 'less_than':
        result = Number(fieldValue) < Number(value);
        break;
      case 'less_than_or_equal':
        result = Number(fieldValue) <= Number(value);
        break;
      case 'contains':
        result = String(fieldValue).includes(String(value));
        break;
      case 'not_contains':
        result = !String(fieldValue).includes(String(value));
        break;
      case 'starts_with':
        result = String(fieldValue).startsWith(String(value));
        break;
      case 'ends_with':
        result = String(fieldValue).endsWith(String(value));
        break;
      case 'in':
        result = Array.isArray(value) && value.includes(fieldValue);
        break;
      case 'not_in':
        result = Array.isArray(value) && !value.includes(fieldValue);
        break;
      case 'is_null':
        result = fieldValue == null;
        break;
      case 'is_not_null':
        result = fieldValue != null;
        break;
      case 'is_empty':
        result = !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0) || (typeof fieldValue === 'string' && fieldValue.trim() === '');
        break;
      case 'is_not_empty':
        result = !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0) && (typeof fieldValue !== 'string' || fieldValue.trim() !== '');
        break;
      case 'matches_regex':
        result = new RegExp(String(value)).test(String(fieldValue));
        break;
      default:
        result = false;
    }

    return negated ? !result : result;
  }

  private async executeAction(action: RuleAction, input: any, context: ExecutionContext): Promise<any> {
    const { type, configuration } = action;

    switch (type) {
      case 'assignment':
        return {
          type: 'assignment',
          target: configuration.target,
          value: configuration.value,
          operation: configuration.operation,
        };

      case 'notification':
        return {
          type: 'notification',
          sent: true,
          recipients: configuration.recipients,
          message: configuration.message,
        };

      case 'api_call':
        return {
          type: 'api_call',
          url: configuration.url,
          method: configuration.method,
          response: { status: 200, data: 'Mock response' },
        };

      case 'workflow':
        return {
          type: 'workflow',
          workflowId: configuration.workflowId,
          triggered: true,
        };

      default:
        return {
          type: action.type,
          executed: true,
        };
    }
  }

  private async getRule(ruleId: string): Promise<BusinessRule | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`rule:${ruleId}`);
      if (cached) {
        return JSON.parse(cached) as BusinessRule;
      }

      // Fall back to database
      const rule = await this.prisma.businessRule.findUnique({
        where: { id: ruleId },
      });

      if (rule) {
        const formatted = rule.definition as BusinessRule;
        await this.redis.setex(`rule:${ruleId}`, 3600, JSON.stringify(formatted));
        return formatted;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting rule', error);
      return null;
    }
  }

  private async updateRuleAnalytics(ruleId: string, execution: RuleExecution): Promise<void> {
    try {
      // Update analytics in background (simplified)
      const analyticsKey = `rule_analytics:${ruleId}:raw`;
      const rawData = await this.redis.get(analyticsKey);
      const analytics = rawData ? JSON.parse(rawData) : { executions: [] };
      
      analytics.executions.push({
        id: execution.id,
        timestamp: execution.startTime,
        duration: execution.duration,
        status: execution.status,
        conditionsEvaluated: execution.metrics.conditionsEvaluated,
        conditionsMet: execution.metrics.conditionsMet,
        actionsExecuted: execution.metrics.actionsExecuted,
        actionsSucceeded: execution.metrics.actionsSucceeded,
      });

      // Keep only last 1000 executions
      if (analytics.executions.length > 1000) {
        analytics.executions = analytics.executions.slice(-1000);
      }

      await this.redis.setex(analyticsKey, 86400, JSON.stringify(analytics)); // 24 hours
    } catch (error) {
      this.logger.warn('Error updating rule analytics', error);
    }
  }

  private formatRule(rule: any): any {
    const definition = rule.definition as BusinessRule;
    return {
      ruleId: rule.id,
      name: rule.name,
      category: rule.category,
      priority: rule.priority,
      status: rule.status,
      version: rule.version,
      conditionCount: definition?.conditions?.length || 0,
      actionCount: definition?.actions?.length || 0,
      executionCount: definition?.analytics?.usage?.totalExecutions || 0,
      successRate: definition?.analytics?.effectiveness?.accuracy || 0,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      effectiveFrom: definition?.effectiveFrom,
      effectiveTo: definition?.effectiveTo,
    };
  }
}