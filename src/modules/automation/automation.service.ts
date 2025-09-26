// path: backend/src/modules/automation/automation.service.ts
// purpose: Core automation service orchestrating all automation features
// dependencies: @nestjs/common, prisma, redis

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { IntelligentAutomationService, AutomationWorkflow } from './services/intelligent-automation.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { BusinessProcessService } from './services/business-process.service';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { RuleEngineService } from './services/rule-engine.service';
import { IntegrationService } from './services/integration.service';
import { AutomationDashboardService } from './services/automation-dashboard.service';
import { AutomationMetricsService } from './services/automation-metrics.service';
import type { AutomationDashboard } from './services/automation-dashboard.service';
import type { AutomationExecution } from './services/intelligent-automation.service';

// Supporting interfaces for backward compatibility
export interface WorkflowPerformance {
  workflowId: string;
  name: string;
  executions: number;
  successRate: number;
  averageDuration: number;
  lastExecution: Date;
}

export interface AutomationHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  issues: HealthIssue[];
  recommendations: string[];
}

export interface HealthIssue {
  type: 'performance' | 'error' | 'resource' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedWorkflows: string[];
  suggestedFix: string;
}

export interface AIRecommendation {
  id: string;
  type: 'optimization' | 'new_automation' | 'error_prevention';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  estimatedSavings: {
    time: number;
    cost: number;
    errors: number;
  };
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly taskScheduler: TaskSchedulerService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly businessProcess: BusinessProcessService,
    private readonly ruleEngine: RuleEngineService,
    private readonly integration: IntegrationService,
    private readonly intelligentAutomation: IntelligentAutomationService,
    private readonly dashboard: AutomationDashboardService,
    private readonly metrics: AutomationMetricsService,
  ) {
    this.logger = new Logger(AutomationService.name);
  }

  async executeTask(taskId: string, tenantId: string, userId: string): Promise<any> {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.log(`Executing task ${taskId} for tenant ${tenantId}`);
      
      // Execute the task using task scheduler
      const result = await this.taskScheduler.executeTask(taskId, 'manual');
      
      success = true;
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordTaskExecution(taskId, duration, success, tenantId);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.recordTaskExecution(taskId, duration, success, tenantId);
      
      this.logger.error(`Task execution failed for ${taskId}`, error);
      throw error;
    }
  }

  async executeWorkflowManual(workflowId: string, tenantId: string, userId: string, input?: any): Promise<any> {
    const startTime = Date.now();
    let success = false;
    let stepsExecuted = 0;
    
    try {
      this.logger.log(`Executing workflow ${workflowId} for tenant ${tenantId}`);
      
      const result = await this.workflowEngine.executeWorkflow(workflowId, input, { tenantId, userId });
      
      success = true;
      stepsExecuted = (result as any).stepsExecuted || 0;
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordWorkflowExecution(workflowId, duration, success, stepsExecuted, tenantId);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.recordWorkflowExecution(workflowId, duration, success, stepsExecuted, tenantId);
      
      this.logger.error(`Workflow execution failed for ${workflowId}`, error);
      throw error;
    }
  }

  async executeRule(ruleId: string, tenantId: string, context?: any): Promise<any> {
    const startTime = Date.now();
    let conditionsMet = false;
    let actionsExecuted = 0;
    
    try {
      this.logger.log(`Executing rule ${ruleId} for tenant ${tenantId}`);
      
      const result = await this.ruleEngine.executeRule(ruleId, context);
      
      conditionsMet = (result as any).conditionsMet || false;
      actionsExecuted = (result as any).actionsExecuted || 0;
      const duration = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordRuleExecution(ruleId, duration, conditionsMet, actionsExecuted, tenantId);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.recordRuleExecution(ruleId, duration, conditionsMet, actionsExecuted, tenantId);
      
      this.logger.error(`Rule execution failed for ${ruleId}`, error);
      throw error;
    }
  }

  async callIntegration(integrationId: string, endpoint: string, tenantId: string, data?: any): Promise<any> {
    const startTime = Date.now();
    let statusCode = 0;
    
    try {
      this.logger.log(`Calling integration ${integrationId}/${endpoint} for tenant ${tenantId}`);
      
      const result = await this.integration.executeIntegration(integrationId, 'request', data);
      
      statusCode = (result as any).statusCode || 200;
      const responseTime = Date.now() - startTime;
      
      // Record metrics
      this.metrics.recordIntegrationCall(integrationId, endpoint, responseTime, statusCode, tenantId);
      
      return result;
    } catch (error) {
      statusCode = (error as any).statusCode || 500;
      const responseTime = Date.now() - startTime;
      
      // Record failure metrics
      this.metrics.recordIntegrationCall(integrationId, endpoint, responseTime, statusCode, tenantId);
      
      this.logger.error(`Integration call failed for ${integrationId}/${endpoint}`, error);
      throw error;
    }
  }

  async getMetrics(tenantId: string, timeRange: '1h' | '6h' | '24h' | '7d' = '1h') {
    return this.metrics.getMetrics(tenantId, timeRange);
  }

  async getAlerts(tenantId: string) {
    return this.metrics.getAlerts(tenantId);
  }

  async createWorkflow(
    userId: string,
    tenantId: string,
    workflowData: {
      name: string;
      description: string;
      type: 'simple' | 'intelligent' | 'business_process';
      configuration: Record<string, any>;
    }
  ): Promise<AutomationWorkflow> {
    try {
      this.logger.log(`Creating workflow: ${workflowData.name}`);

      let workflow: AutomationWorkflow;

      switch (workflowData.type) {
        case 'simple':
          workflow = await this.workflowEngine.createSimpleWorkflow(userId, tenantId, workflowData);
          break;
        case 'intelligent':
          workflow = await this.intelligentAutomation.createWorkflow({
            name: workflowData.name,
            description: workflowData.description,
            triggers: workflowData.configuration.triggers || [],
            actions: workflowData.configuration.actions || [],
            conditions: workflowData.configuration.conditions || [],
            status: 'ACTIVE',
            createdBy: userId,
          });
          break;
        case 'business_process':
          // Create a minimal Business Process and convert it to AutomationWorkflow shape
          const process = await this.businessProcess.createProcess(userId, tenantId, {
            name: workflowData.name,
            description: workflowData.description,
            category: 'operations',
            type: 'semi_automated',
            stages: (workflowData.configuration?.stages || workflowData.configuration?.steps || []).map((s: any, idx: number) => ({
              name: s?.name || `Stage ${idx + 1}`,
              description: s?.description || '',
              order: s?.order || idx + 1,
              type: 'task',
            })),
          });

          workflow = {
            workflowId: process.id,
            name: process.name,
            description: process.description,
            triggers: [],
            actions: (process.stages || []).map((stg, idx) => ({
              actionId: `action_${idx + 1}`,
              type: 'API_CALL',
              configuration: { endpoint: '', method: 'POST' },
              order: idx + 1,
              retryPolicy: { maxRetries: 3, retryDelay: 1000, backoffStrategy: 'EXPONENTIAL' },
            })),
            conditions: [],
            status: 'ACTIVE',
            createdBy: userId,
            createdAt: new Date(),
            executionCount: 0,
            successRate: 0,
          };
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowData.type}`);
      }

      // Log activity
      await this.logActivity(tenantId, userId, 'workflow_created', workflow.workflowId);

      return workflow;
    } catch (error) {
      this.logger.error('Error creating workflow', error);
      throw error;
    }
  }

  async scheduleTask(
    userId: string,
    tenantId: string,
    taskData: {
      name: string;
      description?: string;
      schedule: string; // cron expression
      action: string;
      parameters: Record<string, any>;
      enabled?: boolean;
    }
  ): Promise<any> {
    try {
      this.logger.log(`Scheduling task: ${taskData.name}`);

      // Map to TaskSchedulerService.createTask contract
      const scheduledTask = await this.taskScheduler.createTask(userId, tenantId, {
        name: taskData.name,
        description: taskData.description || '',
        type: 'cron',
        category: 'business',
        schedule: { type: 'cron', expression: taskData.schedule },
        action: {
          type: 'script',
          configuration: { script: taskData.action, language: 'bash' },
          parameters: taskData.parameters || {},
        },
        priority: 'normal',
        timeout: 300000,
      });

      // Log activity
      await this.logActivity(tenantId, userId, 'task_scheduled', scheduledTask.id);

      return scheduledTask;
    } catch (error) {
      this.logger.error('Error scheduling task', error);
      throw error;
    }
  }

  async createRule(
    userId: string,
    tenantId: string,
    ruleData: {
      name: string;
      description?: string;
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      actions: Array<{
        type: string;
        parameters: Record<string, any>;
      }>;
      enabled?: boolean;
    }
  ): Promise<any> {
    try {
      this.logger.log(`Creating rule: ${ruleData.name}`);

      // Adapt minimal ruleData to RuleEngineService contract
      const rule = await this.ruleEngine.createRule(userId, tenantId, {
        name: ruleData.name,
        description: ruleData.description || '',
        category: 'validation',
        conditions: ruleData.conditions.map(c => ({
          field: c.field,
          operator: c.operator as any,
          value: c.value,
          type: 'simple',
          dataType: 'string',
          source: 'input',
          negated: false,
        })),
        actions: ruleData.actions.map((a, idx) => ({
          type: (['assignment','calculation','validation','transformation','notification','api_call','workflow','approval','custom'] as const).includes(a.type as any)
            ? (a.type as any) : 'custom',
          order: idx + 1,
          configuration: a.parameters,
          errorHandling: { onError: 'stop' },
          async: false,
        })),
        priority: 100,
      });

      // Log activity
      await this.logActivity(tenantId, userId, 'rule_created', rule.id);

      return rule;
    } catch (error) {
      this.logger.error('Error creating rule', error);
      throw error;
    }
  }

  async createIntegration(
    userId: string,
    tenantId: string,
    integrationData: {
      name: string;
      type: string;
      configuration: Record<string, any>;
      enabled?: boolean;
    }
  ): Promise<any> {
    try {
      this.logger.log(`Creating integration: ${integrationData.name}`);

      // Adapt minimal integrationData to IntegrationService contract
      const integration = await this.integration.createIntegration(userId, tenantId, {
        name: integrationData.name,
        description: integrationData.name,
        type: 'rest_api',
        category: 'analytics',
        provider: 'custom',
        configuration: integrationData.configuration || {},
        authentication: { type: 'none', credentials: {} },
      });

      // Log activity
      await this.logActivity(tenantId, userId, 'integration_created', integration.id);

      return integration;
    } catch (error) {
      this.logger.error('Error creating integration', error);
      throw error;
    }
  }

  async getWorkflows(
    userId: string,
    tenantId: string,
    options: {
      status?: string;
      type?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ workflows: AutomationWorkflow[]; total: number }> {
    try {
      return await this.workflowEngine.getWorkflows(userId, tenantId, options);
    } catch (error) {
      this.logger.error('Error getting workflows', error);
      return { workflows: [], total: 0 };
    }
  }

  async getExecutions(
    workflowId: string,
    userId: string,
    tenantId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ executions: AutomationExecution[]; total: number }> {
    try {
      const result = await this.workflowEngine.getExecutions(workflowId, userId, tenantId, options);
      
      const executions: AutomationExecution[] = result.executions.map(e => ({
        executionId: e.id,
        workflowId: e.workflowId || 'unknown',
        triggeredBy: e.triggeredBy || 'system',
        startTime: e.startTime || new Date(),
        endTime: e.endTime,
        status: e.status === 'running' ? 'RUNNING' :
                e.status === 'completed' ? 'COMPLETED' :
                e.status === 'failed' ? 'FAILED' : 'CANCELLED',
        steps: [],
        logs: [],
        result: e.result,
        error: e.error,
      }));

      return { executions, total: result.total };
    } catch (error) {
      this.logger.error('Error getting executions', error);
      return { executions: [], total: 0 };
    }
  }

  async getAnalytics(
    userId: string,
    tenantId: string,
    options: {
      period?: string;
      modules?: string[];
      metrics?: string[];
    } = {}
  ): Promise<any> {
    try {
      this.logger.log(`Getting automation analytics for user ${userId}`);

      // Get analytics data
      const analytics = {
        period: options.period || 'last_30_days',
        totalExecutions: 1250,
        successfulExecutions: 1200,
        failedExecutions: 50,
        averageExecutionTime: 38000,
        topWorkflows: [
          {
            workflowId: 'wf_1',
            name: 'Daily Report Generation',
            executions: 150,
            successRate: 0.98,
            averageDuration: 45000,
          },
          {
            workflowId: 'wf_2',
            name: 'Data Synchronization',
            executions: 200,
            successRate: 0.95,
            averageDuration: 32000,
          },
        ],
        executionTrends: {
          daily: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
            executions: Math.floor(Math.random() * 50 + 20),
            successRate: Math.random() * 0.2 + 0.8,
          })),
        },
        errorAnalysis: {
          commonErrors: [
            { error: 'API timeout', count: 15, percentage: 30 },
            { error: 'Invalid data format', count: 12, percentage: 24 },
            { error: 'Network connectivity', count: 10, percentage: 20 },
          ],
        },
        performanceMetrics: {
          averageResponseTime: 2500,
          throughput: 45.2,
          resourceUtilization: 0.68,
        },
      };

      return analytics;
    } catch (error) {
      this.logger.error('Error getting automation analytics', error);
      throw error;
    }
  }

  async optimizeWorkflow(
    workflowId: string,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      this.logger.log(`Optimizing workflow: ${workflowId}`);

      const optimization = await this.intelligentAutomation.optimizeWorkflow(workflowId);

      // Log activity
      await this.logActivity(tenantId, userId, 'workflow_optimized', workflowId);

      return optimization;
    } catch (error) {
      this.logger.error('Error optimizing workflow', error);
      throw error;
    }
  }

  private async getWorkflowMetrics(tenantId: string): Promise<{
    total: number;
    active: number;
    topPerforming: WorkflowPerformance[];
  }> {
    // In production, this would query actual database
    return {
      total: 25,
      active: 18,
      topPerforming: [
        {
          workflowId: 'wf_1',
          name: 'Daily Report Generation',
          executions: 150,
          successRate: 0.98,
          averageDuration: 45000,
          lastExecution: new Date(),
        },
        {
          workflowId: 'wf_2',
          name: 'Data Synchronization',
          executions: 200,
          successRate: 0.95,
          averageDuration: 32000,
          lastExecution: new Date(),
        },
      ],
    };
  }

  private async getExecutionMetrics(tenantId: string): Promise<{
    total: number;
    successRate: number;
    averageDuration: number;
    recent: AutomationExecution[];
  }> {
    // In production, this would query actual database
    return {
      total: 1250,
      successRate: 0.96,
      averageDuration: 38000,
      recent: [
        {
          executionId: 'exec_1',
          workflowId: 'wf_1',
          status: 'COMPLETED',
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(Date.now() - 255000),
          triggeredBy: 'scheduler',
          steps: [],
          logs: [],
          result: { name: 'Daily Report Generation', duration: 45000 },
        },
        {
          executionId: 'exec_2',
          workflowId: 'wf_2',
          status: 'RUNNING',
          startTime: new Date(Date.now() - 120000),
          triggeredBy: 'user',
          steps: [],
          logs: [],
          result: { name: 'Data Synchronization' },
        },
      ],
    };
  }

  private async computeSystemHealth(tenantId: string): Promise<AutomationHealth> {
    // In production, this would analyze actual system metrics
    return {
      status: 'healthy',
      score: 92,
      issues: [
        {
          type: 'performance',
          severity: 'low',
          description: 'Some workflows showing slight performance degradation',
          affectedWorkflows: ['wf_3', 'wf_7'],
          suggestedFix: 'Consider optimizing database queries in affected workflows',
        },
      ],
      recommendations: [
        'Consider enabling auto-scaling for high-volume workflows',
        'Review and update outdated integrations',
        'Implement monitoring for critical business processes',
      ],
    };
  }

  // Expose system health for external callers
  async getSystemHealth(tenantId: string): Promise<AutomationHealth> {
    return this.computeSystemHealth(tenantId);
  }

  // Update automation system status with reason; store ephemeral record and return it
  async updateSystemStatus(
    userId: string,
    tenantId: string,
    status: 'healthy' | 'warning' | 'critical' | string,
    reason?: string,
  ): Promise<{ status: string; reason?: string; updatedBy: string; updatedAt: Date }> {
    const record = {
      status,
      reason,
      updatedBy: userId,
      updatedAt: new Date(),
    };
    try {
      await this.redis.set(`automation:status:${tenantId}`, JSON.stringify(record));
    } catch (err) {
      this.logger.warn('Failed to persist system status', err);
    }
    return record;
  }

  // Retrieve basic system metrics summary for dashboards
  async getSystemMetrics(
    tenantId: string,
    options: { period?: string; granularity?: string } = {}
  ): Promise<{ period: string; granularity: string; metrics: Record<string, any> }> {
    const period = options.period || 'last_7_days';
    const granularity = options.granularity || 'day';
    // In production, compile from monitoring/telemetry
    const metrics = {
      executions: Math.floor(Math.random() * 1000 + 500),
      successRate: Math.random() * 0.1 + 0.85,
      averageDurationMs: Math.floor(Math.random() * 2000 + 1500),
      errorRate: Math.random() * 0.05 + 0.01,
      queueLatencyMs: Math.floor(Math.random() * 500 + 100),
    };
    return { period, granularity, metrics };
  }

  async getDashboard(userId: string, tenantId: string): Promise<AutomationDashboard> {
    try {
      this.logger.log(`Getting automation dashboard for user ${userId} in tenant ${tenantId}`);
      return await this.dashboard.getDashboard(userId, tenantId);
    } catch (error) {
      this.logger.error('Error getting automation dashboard', error);
      throw new BadRequestException('Failed to retrieve automation dashboard');
    }
  }

  private async logActivity(
    tenantId: string,
    userId: string,
    action: string,
    resourceId: string
  ): Promise<void> {
    try {
      const activity = {
        tenantId,
        userId,
        action,
        resourceType: 'automation',
        resourceId,
        timestamp: new Date(),
      };

      await this.redis.lpush(`activity:automation:${tenantId}`, JSON.stringify(activity));
      await this.redis.ltrim(`activity:automation:${tenantId}`, 0, 100);
    } catch (error) {
      this.logger.warn('Failed to log activity', error);
    }
  }
}
