// path: backend/src/modules/automation/services/workflow-engine.service.ts
// purpose: Enterprise workflow execution engine with advanced orchestration
// dependencies: @nestjs/common, @nestjs/bull, prisma, redis

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AutomationWorkflow, AutomationExecution, WorkflowTrigger, WorkflowAction } from './intelligent-automation.service';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  isActive: boolean;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  errorHandling: ErrorHandling;
  metadata: WorkflowMetadata;
  createdBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'wait' | 'human_task' | 'subworkflow';
  order: number;
  configuration: StepConfiguration;
  dependencies: string[]; // Step IDs that must complete before this step
  timeout?: number; // milliseconds
  retryPolicy: RetryPolicy;
  errorHandling: StepErrorHandling;
}

export interface StepConfiguration {
  // Action configuration
  actionType?: 'api_call' | 'database_query' | 'file_operation' | 'email' | 'notification' | 'custom';
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: any;
  
  // Condition configuration
  condition?: string;
  
  // Loop configuration
  loopType?: 'for_each' | 'while' | 'until';
  collection?: string;
  condition_expression?: string;
  
  // Wait configuration
  waitType?: 'fixed_delay' | 'dynamic_delay' | 'condition_met' | 'external_event';
  delay?: number;
  
  // Human task configuration
  assignee?: string;
  approvers?: string[];
  form_fields?: FormField[];
  
  // Subworkflow configuration
  subworkflow_id?: string;
  input_mapping?: Record<string, string>;
  output_mapping?: Record<string, string>;
}

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  label: string;
  required: boolean;
  validation?: string;
  options?: string[];
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: any;
  description?: string;
  isSecret: boolean;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

export interface ErrorHandling {
  onError: 'stop' | 'continue' | 'retry' | 'compensate';
  compensationSteps?: string[];
  notificationRecipients?: string[];
  escalationRules?: EscalationRule[];
}

export interface StepErrorHandling {
  onError: 'fail_workflow' | 'skip_step' | 'retry_step' | 'run_compensation';
  compensationStep?: string;
  continueOnError: boolean;
}

export interface EscalationRule {
  condition: string;
  delay: number;
  recipients: string[];
  action: 'notify' | 'reassign' | 'abort';
}

export interface WorkflowMetadata {
  tags: string[];
  category: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  estimatedDuration: number; // milliseconds
  resourceRequirements: ResourceRequirements;
  compliance: ComplianceInfo;
  analytics: WorkflowAnalytics;
}

export interface ResourceRequirements {
  cpu: number;
  memory: number; // MB
  storage: number; // MB
  networkBandwidth: number; // Mbps
}

export interface ComplianceInfo {
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number; // days
  auditRequired: boolean;
  encryptionRequired: boolean;
}

export interface WorkflowAnalytics {
  executionCount: number;
  successRate: number;
  averageDuration: number;
  lastExecuted: Date;
  performanceScore: number;
  costPerExecution: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  version: number;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  currentStep?: string;
  startTime: Date;
  endTime?: Date;
  triggeredBy: string;
  triggerData?: any;
  context: ExecutionContext;
  steps: StepExecution[];
  variables: Record<string, any>;
  error?: ExecutionError;
  metadata: ExecutionMetadata;
}

export interface ExecutionContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  correlationId: string;
  parentExecutionId?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout';
  startTime: Date;
  endTime?: Date;
  input?: any;
  output?: any;
  error?: StepError;
  retryCount: number;
  logs: StepLog[];
}

export interface StepError {
  code: string;
  message: string;
  details?: any;
  stackTrace?: string;
  recoverable: boolean;
}

export interface StepLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface ExecutionError {
  step?: string;
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface ExecutionMetadata {
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
  resourceUsage: {
    cpuTime: number;
    memoryPeak: number;
    storageUsed: number;
    networkTraffic: number;
  };
  performance: {
    duration: number;
    stepCount: number;
    retryCount: number;
    queueTime: number;
  };
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private static readonly ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  constructor(
    @InjectQueue('workflow-execution') private readonly workflowQueue: Queue,
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

    if (typeof value === 'string' && WorkflowEngineService.ISO_DATE_REGEX.test(value)) {
      return new Date(value) as unknown as T;
    }

    return value;
  }

  async createWorkflow(
    userId: string,
    tenantId: string,
    workflowData: {
      name: string;
      description: string;
      triggers: WorkflowTrigger[];
      steps: WorkflowStep[];
      variables?: WorkflowVariable[];
      errorHandling?: Partial<ErrorHandling>;
      metadata?: Partial<WorkflowMetadata>;
    }
  ): Promise<WorkflowDefinition> {
    try {
      const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: workflowData.name,
        description: workflowData.description,
        version: 1,
        isActive: true,
        triggers: workflowData.triggers,
        steps: workflowData.steps.map((step, index) => ({
          ...step,
          id: step.id || `step_${index + 1}`,
          order: step.order || index + 1,
          retryPolicy: step.retryPolicy || {
            enabled: true,
            maxAttempts: 3,
            backoffStrategy: 'exponential',
            baseDelay: 1000,
            maxDelay: 30000,
          },
          errorHandling: step.errorHandling || {
            onError: 'fail_workflow',
            continueOnError: false,
          },
        })),
        variables: workflowData.variables || [],
        errorHandling: {
          onError: 'stop',
          notificationRecipients: [],
          escalationRules: [],
          ...workflowData.errorHandling,
        },
        metadata: {
          tags: [],
          category: 'general',
          priority: 'normal',
          estimatedDuration: 60000, // 1 minute default
          resourceRequirements: {
            cpu: 0.1,
            memory: 128,
            storage: 10,
            networkBandwidth: 1,
          },
          compliance: {
            dataClassification: 'internal',
            retentionPeriod: 90,
            auditRequired: true,
            encryptionRequired: false,
          },
          analytics: {
            executionCount: 0,
            successRate: 0,
            averageDuration: 0,
            lastExecuted: new Date(),
            performanceScore: 100,
            costPerExecution: 0.01,
          },
          ...workflowData.metadata,
        },
        createdBy: userId,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database using executions table as proxy for workflow definitions
      await this.prisma.executions.create({
        data: {
          id: workflowId,
          tenantId,
          provider: 'workflow_definition',
          brokerOrderId: workflow.name,
          localOrderId: workflow.description || '',
          symbol: workflow.version.toString(),
          side: workflow.isActive ? 'buy' : 'sell',
          quantity: new Prisma.Decimal(1),
          price: new Prisma.Decimal(0),
          gross: new Prisma.Decimal(0),
          commission: new Prisma.Decimal(0),
          markup: new Prisma.Decimal(0),
          net: new Prisma.Decimal(0),
          status: workflow.isActive ? 'active' : 'inactive',
          executedQuantity: new Prisma.Decimal(0),
          executedPrice: new Prisma.Decimal(0),
          executedAt: workflow.createdAt,
          metadata: this.toJsonObject({ definition: workflow }, 'workflow definition metadata'),
          raw: this.toJsonObject(workflow, 'workflow definition raw payload'),
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
        },
      });

      // Cache workflow
      await this.redis.setex(`workflow:${workflowId}`, 3600, this.stringify(workflow));

      // Register triggers
      await this.registerTriggers(workflowId, workflow.triggers);

      this.logger.log(`Workflow created: ${workflowId} (${workflow.name})`);
      return workflow;
    } catch (error) {
      this.logger.error('Error creating workflow', error);
      throw error;
    }
  }

  async executeWorkflow(
    workflowId: string,
    triggeredBy: string,
    triggerData?: any,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      delay?: number;
      context?: Partial<ExecutionContext>;
    } = {}
  ): Promise<WorkflowExecution> {
    try {
      // Get workflow definition
      const workflow = await this.getWorkflow(workflowId);
      if (!workflow) {
        throw new NotFoundException(`Workflow not found: ${workflowId}`);
      }

      if (!workflow.isActive) {
        throw new BadRequestException(`Workflow is not active: ${workflowId}`);
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const correlationId = `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        version: workflow.version,
        status: 'queued',
        startTime: new Date(),
        triggeredBy,
        triggerData,
        context: {
          tenantId: workflow.tenantId,
          userId: triggeredBy,
          correlationId,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
          ...options.context,
        },
        steps: workflow.steps.map(step => ({
          stepId: step.id,
          status: 'pending',
          startTime: new Date(),
          retryCount: 0,
          logs: [],
        })),
        variables: this.initializeVariables(workflow.variables, triggerData),
        metadata: {
          priority: options.priority || workflow.metadata.priority,
          tags: workflow.metadata.tags,
          resourceUsage: {
            cpuTime: 0,
            memoryPeak: 0,
            storageUsed: 0,
            networkTraffic: 0,
          },
          performance: {
            duration: 0,
            stepCount: workflow.steps.length,
            retryCount: 0,
            queueTime: 0,
          },
        },
      };

      // Store execution using executions table
      await this.prisma.executions.create({
        data: {
          id: executionId,
          tenantId: workflow.tenantId,
          provider: 'workflow_execution',
          brokerOrderId: workflowId,
          localOrderId: execution.triggeredBy,
          symbol: execution.status,
          side: 'buy',
          quantity: new Prisma.Decimal(1),
          price: new Prisma.Decimal(0),
          gross: new Prisma.Decimal(0),
          commission: new Prisma.Decimal(0),
          markup: new Prisma.Decimal(0),
          net: new Prisma.Decimal(0),
          status: execution.status,
          executedQuantity: new Prisma.Decimal(0),
          executedPrice: new Prisma.Decimal(0),
          executedAt: execution.startTime,
          metadata: this.toJsonObject({ execution }, 'workflow execution metadata'),
          raw: this.toJsonObject(execution, 'workflow execution raw payload'),
          createdAt: execution.startTime,
          updatedAt: execution.startTime,
        },
      });

      // Queue for execution
      const job = await this.workflowQueue.add(
        'execute-workflow',
        { executionId },
        {
          priority: this.getPriority(execution.metadata.priority),
          delay: options.delay || 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      // Cache execution
      await this.redis.setex(`execution:${executionId}`, 7200, this.stringify(execution));

      this.logger.log(`Workflow queued for execution: ${executionId} (workflow: ${workflowId})`);
      return execution;
    } catch (error) {
      this.logger.error('Error executing workflow', error);
      throw error;
    }
  }

  async createSimpleWorkflow(
    userId: string,
    tenantId: string,
    workflowData: {
      name: string;
      description: string;
      configuration: any;
    }
  ): Promise<any> {
    try {
      // Convert simple workflow to full workflow definition
      const triggers: WorkflowTrigger[] = workflowData.configuration.triggers || [{
        triggerId: 'manual_trigger',
        type: 'MANUAL' as const,
        configuration: {},
        enabled: true,
      }];

      const steps: WorkflowStep[] = (workflowData.configuration.actions || []).map((action: any, index: number) => ({
        id: `step_${index + 1}`,
        name: action.name || `Step ${index + 1}`,
        type: 'action' as const,
        order: index + 1,
        configuration: {
          actionType: action.type,
          ...action.configuration,
        },
        dependencies: index > 0 ? [`step_${index}`] : [],
        retryPolicy: {
          enabled: true,
          maxAttempts: 3,
          backoffStrategy: 'exponential' as const,
          baseDelay: 1000,
          maxDelay: 30000,
        },
        errorHandling: {
          onError: 'fail_workflow' as const,
          continueOnError: false,
        },
      }));

      return await this.createWorkflow(userId, tenantId, {
        name: workflowData.name,
        description: workflowData.description,
        triggers,
        steps,
      });
    } catch (error) {
      this.logger.error('Error creating simple workflow', error);
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
  ): Promise<{ workflows: any[]; total: number }> {
    try {
      const where = {
        tenantId,
        isDeleted: false,
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
          ],
        }),
      };

      const [workflows, total] = await Promise.all([
        this.prisma.executions.findMany({
          where: {
            tenantId,
            provider: 'workflow_definition',
            ...(options.search && {
              OR: [
                { brokerOrderId: { contains: options.search, mode: 'insensitive' as any } },
                { localOrderId: { contains: options.search, mode: 'insensitive' as any } },
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
            provider: 'workflow_definition',
            ...(options.search && {
              OR: [
                { brokerOrderId: { contains: options.search, mode: 'insensitive' as any } },
                { localOrderId: { contains: options.search, mode: 'insensitive' as any } },
              ],
            }),
          }
        }),
      ]);

      return {
        workflows: workflows.map(w => this.formatWorkflow(w)),
        total,
      };
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
  ): Promise<{ executions: any[]; total: number }> {
    try {
      const where = {
        workflowId,
        ...(options.status && { status: options.status }),
      };

      const [executions, total] = await Promise.all([
        this.prisma.executions.findMany({
          where: {
            provider: 'workflow_execution',
            brokerOrderId: workflowId,
            ...(options.status && { symbol: options.status }),
          },
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.executions.count({ 
          where: {
            provider: 'workflow_execution',
            brokerOrderId: workflowId,
            ...(options.status && { symbol: options.status }),
          }
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

  private async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`workflow:${workflowId}`);
      if (cached) {
        return this.reviveDates(JSON.parse(cached)) as WorkflowDefinition;
      }

      // Fall back to database using executions table
      const workflow = await this.prisma.executions.findUnique({
        where: { id: workflowId },
      });

      if (workflow && workflow.provider === 'workflow_definition') {
        const storedDefinition =
          this.reviveJsonValue<WorkflowDefinition>(workflow.raw) ||
          this.reviveJsonValue<{ definition: WorkflowDefinition }>(workflow.metadata)?.definition;

        const fallbackMetadata: WorkflowMetadata = {
          tags: [],
          category: 'general',
          priority: 'normal',
          estimatedDuration: 300000,
          resourceRequirements: { cpu: 100, memory: 512, storage: 1024, networkBandwidth: 10 },
          compliance: { dataClassification: 'internal', retentionPeriod: 30, auditRequired: false, encryptionRequired: false },
          analytics: {
            executionCount: 0,
            successRate: 0,
            averageDuration: 0,
            lastExecuted: new Date(),
            performanceScore: 100,
            costPerExecution: 0.01,
          },
        };

        const formatted: WorkflowDefinition = {
          id: workflow.id,
          name: workflow.brokerOrderId || storedDefinition?.name || 'Unknown Workflow',
          description: workflow.localOrderId || storedDefinition?.description || '',
          version: parseInt(workflow.symbol) || storedDefinition?.version || 1,
          isActive: workflow.side ? workflow.side === 'buy' : storedDefinition?.isActive ?? true,
          triggers: storedDefinition?.triggers || [],
          steps: storedDefinition?.steps || [],
          variables: storedDefinition?.variables || [],
          errorHandling: storedDefinition?.errorHandling || { onError: 'stop' },
          metadata: storedDefinition?.metadata || fallbackMetadata,
          createdBy: storedDefinition?.createdBy || 'system',
          tenantId: workflow.tenantId,
          createdAt: storedDefinition?.createdAt || workflow.createdAt,
          updatedAt: storedDefinition?.updatedAt || workflow.updatedAt,
        };

        await this.redis.setex(`workflow:${workflowId}`, 3600, this.stringify(formatted));
        return formatted;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting workflow', error);
      return null;
    }
  }

  private async registerTriggers(workflowId: string, triggers: WorkflowTrigger[]): Promise<void> {
    try {
      for (const trigger of triggers) {
        if (trigger.type === 'TIME_BASED' && trigger.configuration.schedule) {
          // Register cron job (would integrate with scheduler service)
          await this.redis.sadd(`triggers:time_based`, this.stringify({
            workflowId,
            triggerId: trigger.triggerId,
            schedule: trigger.configuration.schedule,
          }));
        } else if (trigger.type === 'EVENT_BASED' && trigger.configuration.event) {
          // Register event listener
          await this.redis.sadd(`triggers:event_based:${trigger.configuration.event}`, workflowId);
        }
      }
    } catch (error) {
      this.logger.warn('Error registering triggers', error);
    }
  }

  private initializeVariables(variables: WorkflowVariable[], triggerData?: any): Record<string, any> {
    const result: Record<string, any> = {};

    // Initialize workflow variables
    for (const variable of variables) {
      result[variable.name] = variable.value;
    }

    // Add trigger data
    if (triggerData) {
      result.trigger = triggerData;
    }

    // Add system variables
    result.execution = {
      startTime: new Date(),
      correlationId: `corr_${Date.now()}`,
    };

    return result;
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

  private formatWorkflow(workflow: any): any {
    const storedDefinition =
      this.reviveJsonValue<{ definition: WorkflowDefinition }>(workflow.metadata)?.definition ||
      this.reviveJsonValue<WorkflowDefinition>(workflow.raw) ||
      ({} as WorkflowDefinition);

    return {
      workflowId: workflow.id,
      name: workflow.brokerOrderId || storedDefinition.name || 'Unnamed Workflow',
      description: workflow.localOrderId || storedDefinition.description || '',
      status: (workflow.status || (storedDefinition.isActive ? 'active' : 'inactive')).toUpperCase(),
      createdBy: storedDefinition.createdBy || 'system',
      createdAt: storedDefinition.createdAt || workflow.createdAt,
      triggers: storedDefinition.triggers || [],
      actions: storedDefinition.steps || [],
      conditions: [],
      executionCount: storedDefinition.metadata?.analytics?.executionCount || 0,
      successRate: storedDefinition.metadata?.analytics?.successRate || 0,
    };
  }

  private formatExecution(execution: any): any {
    const executionData =
      this.reviveJsonValue<{ execution: WorkflowExecution }>(execution.metadata)?.execution ||
      this.reviveJsonValue<WorkflowExecution>(execution.raw) ||
      (execution.execution as WorkflowExecution | undefined);

    return {
      executionId: execution.id,
      workflowId: execution.brokerOrderId || execution.workflowId,
      status: (execution.status || executionData?.status || 'queued').toUpperCase(),
      startTime: execution.createdAt,
      endTime: executionData?.endTime,
      triggeredBy: executionData?.triggeredBy || execution.localOrderId || 'unknown',
      steps: executionData?.steps || [],
      logs: [],
      result: executionData?.status === 'completed' ? { success: true } : undefined,
      error: executionData?.error?.message,
    };
  }
}
