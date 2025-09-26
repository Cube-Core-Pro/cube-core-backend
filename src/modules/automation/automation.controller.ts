// path: backend/src/modules/automation/automation.controller.ts
// purpose: Enterprise automation REST API controller
// dependencies: @nestjs/common, automation services

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { GetTenant } from '../../auth/decorators/get-tenant.decorator';
// import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';
// import { RateLimitInterceptor } from '../../common/interceptors/rate-limit.interceptor';
import { CacheInterceptor } from '@nestjs/cache-manager';

import { AutomationService } from './automation.service';
import { IntelligentAutomationService } from './services/intelligent-automation.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { BusinessProcessService } from './services/business-process.service';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { RuleEngineService } from './services/rule-engine.service';
import { IntegrationService } from './services/integration.service';

// DTOs
import {
  CreateWorkflowDto,
  CreateBusinessProcessDto,
  CreateTaskDto as CreateScheduledTaskDto,
  CreateRuleDto as CreateBusinessRuleDto,
  CreateIntegrationDto,
  AutomationQueryDto,
} from './dto';

@ApiTags('automation')
@ApiBearerAuth()
@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
// @UseInterceptors(AuditInterceptor, RateLimitInterceptor)
export class AutomationController {
  private readonly logger = new Logger(AutomationController.name);

  constructor(
    private readonly automationService: AutomationService,
    private readonly intelligentAutomationService: IntelligentAutomationService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly businessProcessService: BusinessProcessService,
    private readonly taskSchedulerService: TaskSchedulerService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly integrationService: IntegrationService,
  ) {}

  // ===== AUTOMATION DASHBOARD =====

  @Get('dashboard')
  @ApiOperation({ summary: 'Get automation dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  @UseInterceptors(CacheInterceptor)
  async getDashboard(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.automationService.getDashboard(user.id, tenantId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get automation analytics' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getAnalytics(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.automationService.getAnalytics(user.id, tenantId, {
      period: query.period,
      modules: query.modules,
      metrics: query.metrics,
    });
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get AI automation recommendations' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getRecommendations(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.intelligentAutomationService.getRecommendations(user.id, tenantId, {
      type: query.type,
      category: query.category,
      priority: query.priority,
    });
  }

  // ===== WORKFLOWS =====

  @Get('workflows')
  @ApiOperation({ summary: 'Get workflows list' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getWorkflows(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.workflowEngineService.getWorkflows(user.id, tenantId, {
      status: query.status,
      type: query.type,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post('workflows')
  @ApiOperation({ summary: 'Create new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @Roles('automation_admin', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) createWorkflowDto: CreateWorkflowDto,
  ) {
    // Transform DTO to service interface
    const workflowData = {
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      triggers: createWorkflowDto.triggers.map(trigger => ({
        triggerId: trigger.triggerId,
        type: trigger.type,
        configuration: trigger.configuration,
        enabled: trigger.enabled ?? true,
      })),
      steps: createWorkflowDto.steps.map(step => ({
        id: step.id,
        name: step.name,
        type: step.type,
        order: step.order,
        configuration: step.configuration,
        dependencies: step.dependencies || [],
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
      })),
      variables: createWorkflowDto.variables?.map(variable => ({
        name: variable.name,
        type: variable.type,
        value: variable.value,
        description: variable.description,
        isSecret: variable.isSecret ?? false,
      })) || [],
      errorHandling: createWorkflowDto.errorHandling,
      metadata: createWorkflowDto.metadata,
    };

    return this.workflowEngineService.createWorkflow(user.id, tenantId, workflowData);
  }

  @Post('workflows/:workflowId/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async executeWorkflow(
    @Param('workflowId') workflowId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) executeWorkflowDto: any,
  ) {
    return this.workflowEngineService.executeWorkflow(
      workflowId,
      user.id,
      executeWorkflowDto.triggerData,
      {
        priority: executeWorkflowDto.priority,
        delay: executeWorkflowDto.delay,
        context: executeWorkflowDto.context,
      }
    );
  }

  @Get('workflows/:workflowId/executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getWorkflowExecutions(
    @Param('workflowId') workflowId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.workflowEngineService.getExecutions(workflowId, user.id, tenantId, {
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ===== BUSINESS PROCESSES =====

  @Get('processes')
  @ApiOperation({ summary: 'Get business processes list' })
  @ApiResponse({ status: 200, description: 'Processes retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getProcesses(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.businessProcessService.getProcesses(user.id, tenantId, {
      category: query.category,
      type: query.type,
      status: query.status,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post('processes')
  @ApiOperation({ summary: 'Create new business process' })
  @ApiResponse({ status: 201, description: 'Process created successfully' })
  @Roles('automation_admin', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createProcess(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) createProcessDto: CreateBusinessProcessDto,
  ) {
    // Transform DTO to service interface
    const processData = {
      name: createProcessDto.name,
      description: createProcessDto.description,
      category: createProcessDto.category,
      type: createProcessDto.type,
      stages: createProcessDto.stages.map(stage => ({
        name: stage.name,
        description: stage.description,
        order: stage.order,
        type: 'task' as any,
        configuration: stage.configuration,
        requiresApproval: stage.requiresApproval,
        nextStages: stage.nextStages,
      })),
      // Keep participants minimal; service will apply defaults for permissions and notifications
      participants: createProcessDto.participants?.map(participant => ({
        id: participant.participantId,
        type: participant.type,
        name: participant.participantId,
        email: undefined,
      })),
      sla: createProcessDto.sla ? {
        responseTime: Math.floor((createProcessDto.sla.targetDuration || 0) / 60000) || 30,
        resolutionTime: Math.floor((createProcessDto.sla.criticalThreshold || 0) / 100) || 480,
        availability: 99.9,
        throughput: 10,
        qualityScore: 95,
        penalties: [],
        escalationMatrix: [],
      } : undefined,
    };

    return this.businessProcessService.createProcess(user.id, tenantId, processData);
  }

  @Post('processes/:processId/start')
  @ApiOperation({ summary: 'Start process instance' })
  @ApiResponse({ status: 200, description: 'Process instance started' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async startProcessInstance(
    @Param('processId') processId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) startProcessDto: any,
  ) {
    return this.businessProcessService.startProcessInstance(
      processId,
      user.id,
      tenantId,
      startProcessDto.data,
      {
        priority: startProcessDto.priority,
        dueDate: startProcessDto.dueDate,
        assignees: startProcessDto.assignees,
      }
    );
  }

  @Get('processes/:processId/instances')
  @ApiOperation({ summary: 'Get process instances' })
  @ApiResponse({ status: 200, description: 'Instances retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getProcessInstances(
    @Param('processId') processId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.businessProcessService.getInstances(processId, user.id, tenantId, {
      status: query.status,
      priority: query.priority,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('processes/:processId/analytics')
  @ApiOperation({ summary: 'Get process analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getProcessAnalytics(
    @Param('processId') processId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.businessProcessService.getProcessAnalytics(
      processId,
      user.id,
      tenantId,
      period as any
    );
  }

  // ===== SCHEDULED TASKS =====

  @Get('tasks')
  @ApiOperation({ summary: 'Get scheduled tasks list' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getTasks(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.taskSchedulerService.getTasks(user.id, tenantId, {
      type: query.type,
      category: query.category,
      status: query.status,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create new scheduled task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @Roles('automation_admin', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) createTaskDto: CreateScheduledTaskDto,
  ) {
    // Transform DTO to service interface
    const taskData = {
      name: createTaskDto.name,
      description: createTaskDto.description,
      type: createTaskDto.type,
      category: createTaskDto.category,
      schedule: createTaskDto.schedule,
      action: createTaskDto.action, // Expecting shape compatible with TaskAction
      priority: createTaskDto.priority,
      timeout: createTaskDto.timeout,
      retryPolicy: createTaskDto.maxRetries || createTaskDto.retryDelay ? {
        maxAttempts: createTaskDto.maxRetries || 3,
        baseDelay: createTaskDto.retryDelay || 1000,
        maxDelay: (createTaskDto.retryDelay || 1000) * 60,
        backoffStrategy: 'exponential',
        enabled: true,
        retryOn: ['error', 'timeout'],
      } : undefined,
      dependencies: (createTaskDto.dependencies || []).map(id => ({ taskId: id, type: 'completion' as const })),
      notifications: [],
      monitoring: undefined,
    } as any;

    return this.taskSchedulerService.createTask(user.id, tenantId, taskData);
  }

  @Post('tasks/:taskId/execute')
  @ApiOperation({ summary: 'Execute task manually' })
  @ApiResponse({ status: 200, description: 'Task execution started' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async executeTask(
    @Param('taskId') taskId: string,
    @GetUser() user: any,
    @Body(ValidationPipe) executeTaskDto: any,
  ) {
    return this.taskSchedulerService.executeTask(
      taskId,
      executeTaskDto.triggeredBy || 'manual',
      user.id,
      executeTaskDto.context
    );
  }

  @Get('tasks/:taskId/executions')
  @ApiOperation({ summary: 'Get task executions' })
  @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getTaskExecutions(
    @Param('taskId') taskId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.taskSchedulerService.getExecutions(taskId, user.id, tenantId, {
      status: query.status,
      triggeredBy: query.triggeredBy,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('tasks/:taskId/analytics')
  @ApiOperation({ summary: 'Get task analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getTaskAnalytics(
    @Param('taskId') taskId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.taskSchedulerService.getTaskAnalytics(
      taskId,
      user.id,
      tenantId,
      period as any
    );
  }

  // ===== BUSINESS RULES =====

  @Get('rules')
  @ApiOperation({ summary: 'Get business rules list' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getRules(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.ruleEngineService.getRules(user.id, tenantId, {
      category: query.category,
      status: query.status,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create new business rule' })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  @Roles('automation_admin', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) createRuleDto: CreateBusinessRuleDto,
  ) {
    // Transform DTO to service interface
    const ruleData = {
      name: createRuleDto.name,
      description: createRuleDto.description,
      category: createRuleDto.category,
      conditions: createRuleDto.conditions.map(condition => ({
        field: condition.field,
        operator: condition.operator as any,
        value: condition.value,
        type: 'simple' as const,
        dataType: condition.dataType || 'string',
        source: 'input' as const,
        negated: false,
      })),
      actions: createRuleDto.actions.map((action, index) => ({
        type: (
          action.type === 'send_notification' ? 'notification' :
          action.type === 'set_value' ? 'assignment' :
          action.type === 'trigger_workflow' ? 'workflow' :
          action.type === 'call_api' ? 'api_call' :
          action.type === 'log_event' ? 'custom' : 'custom'
        ) as any,
        configuration: action.configuration,
        order: action.order ?? index + 1,
        errorHandling: { onError: 'stop' as const },
        async: false,
      })),
      priority: createRuleDto.priority,
    };

    return this.ruleEngineService.createRule(user.id, tenantId, ruleData);
  }

  @Post('rules/:ruleId/execute')
  @ApiOperation({ summary: 'Execute business rule' })
  @ApiResponse({ status: 200, description: 'Rule executed successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async executeRule(
    @Param('ruleId') ruleId: string,
    @GetUser() user: any,
    @Body(ValidationPipe) executeRuleDto: any,
  ) {
    return this.ruleEngineService.executeRule(
      ruleId,
      executeRuleDto.input,
      {
        userId: user.id,
        correlationId: executeRuleDto.correlationId,
        source: executeRuleDto.source,
        metadata: executeRuleDto.metadata,
      }
    );
  }

  @Get('rules/:ruleId/analytics')
  @ApiOperation({ summary: 'Get rule analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getRuleAnalytics(
    @Param('ruleId') ruleId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.ruleEngineService.getRuleAnalytics(
      ruleId,
      user.id,
      tenantId,
      period as any
    );
  }

  // ===== INTEGRATIONS =====

  @Get('integrations')
  @ApiOperation({ summary: 'Get integrations list' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getIntegrations(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query() query: AutomationQueryDto,
  ) {
    return this.integrationService.getIntegrations(user.id, tenantId, {
      type: query.type,
      category: query.category,
      status: query.status,
      provider: query.provider,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Post('integrations')
  @ApiOperation({ summary: 'Create new integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  @Roles('automation_admin', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) createIntegrationDto: CreateIntegrationDto,
  ) {
    // Normalize authentication types from DTO to service types
    const mapAuthType = (t?: string): 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth1' | 'oauth2' | 'jwt' | 'certificate' | 'custom' => {
      switch (t) {
        case 'basic_auth':
          return 'basic';
        case 'bearer_token':
          return 'bearer';
        case 'oauth2':
          return 'oauth2';
        case 'oauth1':
          return 'oauth1';
        case 'api_key':
          return 'api_key';
        case 'jwt':
          return 'jwt';
        case 'certificate':
          return 'certificate';
        case 'custom':
          return 'custom';
        default:
          return 'none';
      }
    };

    const payload: any = {
      name: (createIntegrationDto as any).name,
      description: (createIntegrationDto as any).description,
      type: (createIntegrationDto as any).type,
      category: (createIntegrationDto as any).category,
      provider: (createIntegrationDto as any).provider,
      configuration: (createIntegrationDto as any).configuration || {},
      authentication: (createIntegrationDto as any).authentication ? {
        ...((createIntegrationDto as any).authentication),
        type: mapAuthType((createIntegrationDto as any).authentication.type),
      } : { type: 'none', credentials: {} },
      mapping: (createIntegrationDto as any).mapping,
      sync: (createIntegrationDto as any).sync,
    };

    return this.integrationService.createIntegration(user.id, tenantId, payload);
  }

  @Post('integrations/:integrationId/execute')
  @ApiOperation({ summary: 'Execute integration operation' })
  @ApiResponse({ status: 200, description: 'Integration executed successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async executeIntegration(
    @Param('integrationId') integrationId: string,
    @GetUser() user: any,
    @Body(ValidationPipe) executeIntegrationDto: any,
  ) {
    return this.integrationService.executeIntegration(
      integrationId,
      executeIntegrationDto.operation,
      executeIntegrationDto.data,
      {
        endpoint: executeIntegrationDto.endpoint,
        method: executeIntegrationDto.method,
        headers: executeIntegrationDto.headers,
        timeout: executeIntegrationDto.timeout,
        context: {
          userId: user.id,
          correlationId: executeIntegrationDto.correlationId,
          source: executeIntegrationDto.source,
          metadata: executeIntegrationDto.metadata,
        },
      }
    );
  }

  @Get('integrations/:integrationId/analytics')
  @ApiOperation({ summary: 'Get integration analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getIntegrationAnalytics(
    @Param('integrationId') integrationId: string,
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.integrationService.getIntegrationAnalytics(
      integrationId,
      user.id,
      tenantId,
      period as any
    );
  }

  // ===== INTELLIGENT AUTOMATION =====

  @Post('ai/analyze')
  @ApiOperation({ summary: 'AI analysis of automation patterns' })
  @ApiResponse({ status: 200, description: 'Analysis completed successfully' })
  @Roles('automation_admin', 'admin')
  async analyzeAutomationPatterns(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body() data: { type: string; scope: string; timeframe: string },
  ) {
    return this.intelligentAutomationService.analyzeAutomationPatterns(
      user.id,
      tenantId,
      { type: data.type, scope: data.scope, timeframe: data.timeframe }
    );
  }

  @Post('ai/optimize')
  @ApiOperation({ summary: 'AI optimization suggestions' })
  @ApiResponse({ status: 200, description: 'Optimization suggestions generated' })
  @Roles('automation_admin', 'admin')
  async generateOptimizationSuggestions(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body() data: { target: string; criteria: string[] },
  ) {
    // If a target workflowId is provided, optimize that workflow; otherwise return recommendations
    if (data?.target) {
      return this.intelligentAutomationService.optimizeWorkflow(data.target);
    }
    return this.intelligentAutomationService.generateAutomationRecommendations(user.id);
  }

  @Post('ai/predict')
  @ApiOperation({ summary: 'AI predictions for automation metrics' })
  @ApiResponse({ status: 200, description: 'Predictions generated successfully' })
  @Roles('automation_admin', 'admin')
  async predictAutomationMetrics(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body() data: { metrics: string[]; timeframe: string; factors: string[] },
  ) {
    // Use pattern analysis as a proxy for predictions
    return this.intelligentAutomationService.analyzeAutomationPatterns(
      user.id,
      tenantId,
      { metrics: data.metrics, timeframe: data.timeframe, factors: data.factors }
    );
  }

  // ===== SYSTEM MANAGEMENT =====

  @Put('status')
  @ApiOperation({ summary: 'Update automation system status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @Roles('automation_admin', 'admin')
  async updateStatus(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Body(ValidationPipe) updateStatusDto: any,
  ) {
    return this.automationService.updateSystemStatus(
      user.id,
      tenantId,
      updateStatusDto.status,
      updateStatusDto.reason
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Get automation system health' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getHealth(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
  ) {
    return this.automationService.getSystemHealth(tenantId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get automation system metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @Roles('automation_user', 'automation_admin', 'admin')
  async getMetrics(
    @GetUser() user: any,
    @GetTenant() tenantId: string,
    @Query('period') period?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.automationService.getSystemMetrics(tenantId, {
      period: period as any,
      granularity: granularity as any,
    });
  }
}