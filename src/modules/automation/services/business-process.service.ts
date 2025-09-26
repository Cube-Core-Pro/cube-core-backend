// path: backend/src/modules/automation/services/business-process.service.ts
// purpose: Enterprise business process management and optimization
// dependencies: @nestjs/common, @nestjs/bull, prisma, redis

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface BusinessProcess {
  id: string;
  name: string;
  description: string;
  category: 'finance' | 'hr' | 'sales' | 'operations' | 'compliance' | 'procurement' | 'manufacturing' | 'logistics';
  type: 'manual' | 'semi_automated' | 'fully_automated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'paused' | 'deprecated';
  version: number;
  stages: ProcessStage[];
  participants: ProcessParticipant[];
  kpis: ProcessKPI[];
  sla: ServiceLevelAgreement;
  compliance: ComplianceRequirements;
  automation: AutomationConfiguration;
  analytics: ProcessAnalytics;
  metadata: ProcessMetadata;
  tenantId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessStage {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'decision' | 'parallel_gateway' | 'exclusive_gateway' | 'event' | 'subprocess';
  order: number;
  required: boolean;
  configuration: StageConfiguration;
  participants: string[]; // Role or user IDs
  dependencies: string[]; // Stage IDs that must be completed first
  conditions: StageCondition[];
  sla: {
    expectedDuration: number; // minutes
    maxDuration: number; // minutes
    escalationRules: EscalationRule[];
  };
  automation: StageAutomation;
  forms: ProcessForm[];
}

export interface StageConfiguration {
  // Task configuration
  taskType?: 'human_task' | 'system_task' | 'service_task' | 'script_task';
  assignmentRule?: 'round_robin' | 'load_balancing' | 'skill_based' | 'manual';
  
  // Decision configuration
  decisionType?: 'rule_based' | 'data_driven' | 'machine_learning' | 'human_review';
  decisionCriteria?: DecisionCriteria[];
  
  // Gateway configuration
  gatewayType?: 'and' | 'or' | 'xor' | 'complex';
  conditions?: string[];
  
  // Event configuration
  eventType?: 'timer' | 'message' | 'signal' | 'conditional' | 'error';
  eventConfiguration?: EventConfiguration;
  
  // Service configuration
  serviceEndpoint?: string;
  serviceMethod?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
}

export interface DecisionCriteria {
  name: string;
  condition: string;
  weight: number;
  outcome: string;
}

export interface EventConfiguration {
  schedule?: string; // Cron expression for timer events
  messageType?: string;
  signalName?: string;
  condition?: string;
  timeout?: number;
}

export interface StageCondition {
  type: 'pre_condition' | 'post_condition' | 'execution_condition';
  expression: string;
  errorMessage?: string;
  bypassable: boolean;
}

export interface StageAutomation {
  enabled: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
  aiAssistance: AIAssistanceConfig;
}

export interface AutomationTrigger {
  event: 'stage_start' | 'stage_complete' | 'data_change' | 'time_based' | 'external_event';
  condition?: string;
  configuration: any;
}

export interface AutomationAction {
  type: 'send_notification' | 'update_data' | 'call_service' | 'generate_document' | 'assign_task';
  configuration: any;
  delay?: number;
}

export interface AIAssistanceConfig {
  enabled: boolean;
  features: ('auto_assignment' | 'intelligent_routing' | 'content_analysis' | 'recommendation_engine' | 'anomaly_detection')[];
  mlModels: string[];
  confidenceThreshold: number;
}

export interface ProcessParticipant {
  id: string;
  type: 'user' | 'role' | 'group' | 'system';
  name: string;
  email?: string;
  permissions: ProcessPermission[];
  notificationPreferences: NotificationPreferences;
}

export interface ProcessPermission {
  action: 'view' | 'edit' | 'approve' | 'reject' | 'reassign' | 'escalate' | 'abort';
  stages: string[]; // Stage IDs where permission applies
  conditions?: string[];
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
  slack: boolean;
  teams: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'never';
}

export interface ProcessKPI {
  id: string;
  name: string;
  description: string;
  type: 'time' | 'cost' | 'quality' | 'volume' | 'efficiency' | 'satisfaction';
  metric: string;
  target: KPITarget;
  calculation: KPICalculation;
  visualization: KPIVisualization;
}

export interface KPITarget {
  value: number;
  unit: string;
  comparison: 'less_than' | 'less_equal' | 'equal' | 'greater_equal' | 'greater_than' | 'between';
  upperBound?: number;
  tolerance: number; // percentage
}

export interface KPICalculation {
  formula: string;
  aggregation: 'sum' | 'average' | 'min' | 'max' | 'count' | 'percentage';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dataSource: string;
}

export interface KPIVisualization {
  chartType: 'line' | 'bar' | 'gauge' | 'pie' | 'scatter' | 'heatmap';
  color: string;
  showTrend: boolean;
  alertThreshold: number;
}

export interface ServiceLevelAgreement {
  responseTime: number; // minutes
  resolutionTime: number; // minutes
  availability: number; // percentage
  throughput: number; // processes per hour
  qualityScore: number; // 0-100
  penalties: SLAPenalty[];
  escalationMatrix: EscalationRule[];
}

export interface SLAPenalty {
  condition: string;
  penalty: number;
  unit: 'fixed' | 'percentage';
  maxPenalty?: number;
}

export interface EscalationRule {
  level: number;
  condition: string;
  delay: number; // minutes
  recipients: string[];
  action: 'notify' | 'reassign' | 'escalate' | 'abort';
  template?: string;
}

export interface ComplianceRequirements {
  regulations: ComplianceRegulation[];
  auditTrail: AuditTrailConfig;
  dataRetention: DataRetentionPolicy;
  security: SecurityRequirements;
  approvals: ApprovalMatrix;
}

export interface ComplianceRegulation {
  name: string;
  type: 'SOX' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'ISO_27001' | 'SOC2' | 'custom';
  requirements: string[];
  controls: ComplianceControl[];
  evidence: string[];
}

export interface ComplianceControl {
  id: string;
  description: string;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  automated: boolean;
  owner: string;
}

export interface AuditTrailConfig {
  enabled: boolean;
  fields: string[];
  retention: number; // days
  immutable: boolean;
  encryption: boolean;
}

export interface DataRetentionPolicy {
  retention: number; // days
  archiveAfter: number; // days
  deleteAfter: number; // days
  backupRequired: boolean;
  location: 'local' | 'cloud' | 'hybrid';
}

export interface SecurityRequirements {
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryption: boolean;
  accessControl: 'rbac' | 'abac' | 'dac';
  mfa: boolean;
  vpn: boolean;
}

export interface ApprovalMatrix {
  levels: ApprovalLevel[];
  rules: ApprovalRule[];
  bypassConditions: string[];
  timeouts: ApprovalTimeout[];
}

export interface ApprovalLevel {
  level: number;
  name: string;
  approvers: string[];
  required: number; // Number of approvers required
  condition?: string;
}

export interface ApprovalRule {
  condition: string;
  requiredLevel: number;
  sequential: boolean;
  allowDelegation: boolean;
}

export interface ApprovalTimeout {
  level: number;
  timeout: number; // minutes
  action: 'auto_approve' | 'auto_reject' | 'escalate' | 'notify';
}

export interface AutomationConfiguration {
  enabled: boolean;
  scope: 'full' | 'partial' | 'assisted';
  triggers: ProcessTrigger[];
  rules: AutomationRule[];
  integrations: SystemIntegration[];
  monitoring: AutomationMonitoring;
}

export interface ProcessTrigger {
  id: string;
  name: string;
  type: 'schedule' | 'event' | 'condition' | 'manual' | 'api';
  configuration: TriggerConfiguration;
  enabled: boolean;
}

export interface TriggerConfiguration {
  schedule?: string; // Cron expression
  event?: string;
  condition?: string;
  webhook?: string;
  apiKey?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: string;
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
}

export interface RuleAction {
  type: 'assign' | 'notify' | 'update' | 'escalate' | 'approve' | 'reject' | 'route';
  configuration: any;
  delay?: number;
}

export interface SystemIntegration {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'hrms' | 'finance' | 'document_management' | 'communication' | 'analytics';
  endpoint: string;
  authentication: IntegrationAuth;
  mapping: DataMapping;
  sync: SyncConfiguration;
}

export interface IntegrationAuth {
  type: 'api_key' | 'oauth' | 'basic' | 'certificate';
  credentials: any;
}

export interface DataMapping {
  inbound: Record<string, string>;
  outbound: Record<string, string>;
  transformations: DataTransformation[];
}

export interface DataTransformation {
  field: string;
  type: 'format' | 'calculate' | 'lookup' | 'validate' | 'encrypt';
  configuration: any;
}

export interface SyncConfiguration {
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  batchSize: number;
  errorHandling: 'retry' | 'skip' | 'abort';
  maxRetries: number;
}

export interface AutomationMonitoring {
  enabled: boolean;
  metrics: string[];
  alerts: AlertConfiguration[];
  reporting: ReportConfiguration;
}

export interface AlertConfiguration {
  name: string;
  condition: string;
  threshold: number;
  recipients: string[];
  frequency: 'immediate' | 'hourly' | 'daily';
}

export interface ReportConfiguration {
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'excel' | 'dashboard';
  metrics: string[];
}

export interface ProcessAnalytics {
  performance: PerformanceMetrics;
  bottlenecks: BottleneckAnalysis[];
  trends: TrendAnalysis[];
  predictions: PredictionModel[];
  optimization: OptimizationSuggestion[];
}

export interface PerformanceMetrics {
  averageDuration: number;
  medianDuration: number;
  throughput: number;
  successRate: number;
  errorRate: number;
  costPerInstance: number;
  utilizationRate: number;
  satisfactionScore: number;
}

export interface BottleneckAnalysis {
  stageId: string;
  stageName: string;
  averageWaitTime: number;
  utilizationRate: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changeRate: number;
  seasonality: boolean;
  forecast: ForecastData[];
}

export interface ForecastData {
  period: string;
  predicted: number;
  confidence: number;
  range: { min: number; max: number };
}

export interface PredictionModel {
  name: string;
  type: 'duration' | 'outcome' | 'resource_need' | 'risk';
  accuracy: number;
  lastTrained: Date;
  features: string[];
}

export interface OptimizationSuggestion {
  type: 'automation' | 'resource_allocation' | 'process_redesign' | 'technology_upgrade';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  roi: number;
  implementation: string[];
}

export interface ProcessMetadata {
  tags: string[];
  documentation: string;
  changeLog: ChangeLogEntry[];
  attachments: ProcessAttachment[];
  customFields: CustomField[];
}

export interface ChangeLogEntry {
  version: number;
  changes: string[];
  author: string;
  timestamp: Date;
  approved: boolean;
}

export interface ProcessAttachment {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'link';
  url: string;
  description?: string;
}

export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'list';
  value: any;
  required: boolean;
}

export interface ProcessForm {
  id: string;
  name: string;
  fields: FormField[];
  validation: FormValidation;
  layout: FormLayout;
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: string[];
  dependencies?: FieldDependency[];
}

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: string;
}

export interface FieldDependency {
  field: string;
  condition: string;
  value: any;
}

export interface FormValidation {
  rules: ValidationRule[];
  customValidation?: string;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'phone' | 'url' | 'pattern' | 'range' | 'custom';
  value?: any;
  message: string;
}

export interface FormLayout {
  columns: number;
  sections: FormSection[];
  theme: 'default' | 'compact' | 'spacious';
}

export interface FormSection {
  title: string;
  fields: string[];
  collapsible: boolean;
  expanded: boolean;
}

export interface ProcessInstance {
  id: string;
  processId: string;
  version: number;
  status: 'initiated' | 'running' | 'suspended' | 'completed' | 'terminated' | 'aborted';
  currentStage: string;
  data: Record<string, any>;
  participants: InstanceParticipant[];
  history: StageHistory[];
  timeline: TimelineEvent[];
  metrics: InstanceMetrics;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstanceParticipant {
  userId: string;
  role: string;
  stages: string[];
  status: 'active' | 'completed' | 'delegated' | 'absent';
  joinedAt: Date;
}

export interface StageHistory {
  stageId: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'failed';
  assignee?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  data?: any;
  comments?: string;
  attachments?: string[];
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'stage_start' | 'stage_complete' | 'assignment' | 'comment' | 'escalation' | 'approval' | 'rejection';
  actor: string;
  stage?: string;
  description: string;
  metadata?: any;
}

export interface InstanceMetrics {
  duration: number;
  stagesCompleted: number;
  stagesRemaining: number;
  slaCompliance: boolean;
  costs: ProcessCosts;
  quality: QualityMetrics;
}

export interface ProcessCosts {
  labor: number;
  system: number;
  external: number;
  total: number;
  currency: string;
}

export interface QualityMetrics {
  accuracy: number;
  completeness: number;
  timeliness: number;
  satisfaction: number;
  reworkRate: number;
}

@Injectable()
export class BusinessProcessService {
  private readonly logger = new Logger(BusinessProcessService.name);

  constructor(
    @InjectQueue('business-processes') private readonly processQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createProcess(
    userId: string,
    tenantId: string,
    processData: {
      name: string;
      description: string;
      category: BusinessProcess['category'];
      type: BusinessProcess['type'];
      stages: Partial<ProcessStage>[];
      participants?: Partial<ProcessParticipant>[];
      kpis?: Partial<ProcessKPI>[];
      sla?: Partial<ServiceLevelAgreement>;
      compliance?: Partial<ComplianceRequirements>;
    }
  ): Promise<BusinessProcess> {
    try {
      const processId = `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const process: BusinessProcess = {
        id: processId,
        name: processData.name,
        description: processData.description,
        category: processData.category,
        type: processData.type,
        priority: 'medium',
        status: 'draft',
        version: 1,
        stages: processData.stages.map((stage, index) => ({
          id: stage.id || `stage_${index + 1}`,
          name: stage.name || `Stage ${index + 1}`,
          description: stage.description || '',
          type: stage.type || 'task',
          order: stage.order || index + 1,
          required: stage.required !== false,
          configuration: stage.configuration || {},
          participants: stage.participants || [],
          dependencies: stage.dependencies || [],
          conditions: stage.conditions || [],
          sla: stage.sla || {
            expectedDuration: 60,
            maxDuration: 120,
            escalationRules: [],
          },
          automation: stage.automation || {
            enabled: false,
            triggers: [],
            actions: [],
            aiAssistance: {
              enabled: false,
              features: [],
              mlModels: [],
              confidenceThreshold: 0.8,
            },
          },
          forms: stage.forms || [],
        })),
        participants: processData.participants?.map(p => ({
          id: p.id || `participant_${Date.now()}`,
          type: p.type || 'user',
          name: p.name || 'Unknown',
          email: p.email,
          permissions: p.permissions || [],
          notificationPreferences: p.notificationPreferences || {
            email: true,
            sms: false,
            inApp: true,
            slack: false,
            teams: false,
            frequency: 'immediate',
          },
        })) || [],
        kpis: processData.kpis?.map(kpi => ({
          id: kpi.id || `kpi_${Date.now()}`,
          name: kpi.name || 'KPI',
          description: kpi.description || '',
          type: kpi.type || 'time',
          metric: kpi.metric || 'duration',
          target: kpi.target || {
            value: 100,
            unit: 'minutes',
            comparison: 'less_than',
            tolerance: 10,
          },
          calculation: kpi.calculation || {
            formula: 'AVG(duration)',
            aggregation: 'average',
            period: 'daily',
            dataSource: 'process_instances',
          },
          visualization: kpi.visualization || {
            chartType: 'line',
            color: '#007bff',
            showTrend: true,
            alertThreshold: 80,
          },
        })) || [],
        sla: {
          responseTime: 30,
          resolutionTime: 480,
          availability: 99.9,
          throughput: 10,
          qualityScore: 95,
          penalties: [],
          escalationMatrix: [],
          ...processData.sla,
        },
        compliance: {
          regulations: [],
          auditTrail: {
            enabled: true,
            fields: ['status', 'assignee', 'data'],
            retention: 2555, // 7 years
            immutable: true,
            encryption: true,
          },
          dataRetention: {
            retention: 2555,
            archiveAfter: 365,
            deleteAfter: 2555,
            backupRequired: true,
            location: 'cloud',
          },
          security: {
            classification: 'internal',
            encryption: true,
            accessControl: 'rbac',
            mfa: false,
            vpn: false,
          },
          approvals: {
            levels: [],
            rules: [],
            bypassConditions: [],
            timeouts: [],
          },
          ...processData.compliance,
        },
        automation: {
          enabled: processData.type !== 'manual',
          scope: processData.type === 'fully_automated' ? 'full' : 'partial',
          triggers: [],
          rules: [],
          integrations: [],
          monitoring: {
            enabled: true,
            metrics: ['duration', 'throughput', 'error_rate'],
            alerts: [],
            reporting: {
              frequency: 'weekly',
              recipients: [userId],
              format: 'dashboard',
              metrics: ['performance', 'sla'],
            },
          },
        },
        analytics: {
          performance: {
            averageDuration: 0,
            medianDuration: 0,
            throughput: 0,
            successRate: 0,
            errorRate: 0,
            costPerInstance: 0,
            utilizationRate: 0,
            satisfactionScore: 0,
          },
          bottlenecks: [],
          trends: [],
          predictions: [],
          optimization: [],
        },
        metadata: {
          tags: [],
          documentation: '',
          changeLog: [{
            version: 1,
            changes: ['Initial creation'],
            author: userId,
            timestamp: new Date(),
            approved: true,
          }],
          attachments: [],
          customFields: [],
        },
        tenantId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.prisma.businessProcess.create({
        data: {
          id: processId,
          name: process.name,
          description: process.description,
          category: process.category,
          type: process.type,
          status: process.status,
          version: process.version,
          definition: process as any,
          tenantId,
          createdBy: userId,
          createdAt: process.createdAt,
        },
      });

      // Cache process
      await this.redis.setex(`process:${processId}`, 3600, JSON.stringify(process));

      this.logger.log(`Business process created: ${processId} (${process.name})`);
      return process;
    } catch (error) {
      this.logger.error('Error creating business process', error);
      throw error;
    }
  }

  async startProcessInstance(
    processId: string,
    userId: string,
    tenantId: string,
    data: Record<string, any> = {},
    options: {
      priority?: ProcessInstance['priority'];
      dueDate?: Date;
      assignees?: Record<string, string>;
    } = {}
  ): Promise<ProcessInstance> {
    try {
      // Get process definition
      const process = await this.getProcess(processId);
      if (!process) {
        throw new NotFoundException(`Process not found: ${processId}`);
      }

      if (process.status !== 'active') {
        throw new BadRequestException(`Process is not active: ${processId}`);
      }

      const instanceId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const instance: ProcessInstance = {
        id: instanceId,
        processId,
        version: process.version,
        status: 'initiated',
        currentStage: process.stages[0]?.id || '',
        data,
        participants: process.participants.map(p => ({
          userId: p.id,
          role: p.type,
          stages: [],
          status: 'active',
          joinedAt: new Date(),
        })),
        history: process.stages.map(stage => ({
          stageId: stage.id,
          status: 'pending',
        })),
        timeline: [{
          timestamp: new Date(),
          type: 'stage_start',
          actor: userId,
          description: 'Process instance initiated',
        }],
        metrics: {
          duration: 0,
          stagesCompleted: 0,
          stagesRemaining: process.stages.length,
          slaCompliance: true,
          costs: {
            labor: 0,
            system: 0,
            external: 0,
            total: 0,
            currency: 'USD',
          },
          quality: {
            accuracy: 100,
            completeness: 0,
            timeliness: 100,
            satisfaction: 0,
            reworkRate: 0,
          },
        },
        priority: options.priority || 'medium',
        dueDate: options.dueDate,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store instance
      await this.prisma.processInstance.create({
        data: {
          id: instanceId,
          processId,
          status: instance.status,
          currentStage: instance.currentStage,
          priority: instance.priority,
          instance: instance as any,
          createdBy: userId,
          createdAt: instance.createdAt,
        },
      });

      // Queue for processing
      await this.processQueue.add(
        'start-instance',
        { instanceId },
        {
          priority: this.getPriority(instance.priority),
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      // Cache instance
      await this.redis.setex(`instance:${instanceId}`, 7200, JSON.stringify(instance));

      this.logger.log(`Process instance started: ${instanceId} (process: ${processId})`);
      return instance;
    } catch (error) {
      this.logger.error('Error starting process instance', error);
      throw error;
    }
  }

  async executeProcess(
    processId: string,
    data: Record<string, any> = {},
    context: {
      userId?: string;
      tenantId?: string;
      options?: {
        priority?: ProcessInstance['priority'];
        dueDate?: Date | string;
        assignees?: Record<string, string>;
      };
    } = {},
  ): Promise<ProcessInstance> {
    const tenantId = context.tenantId ?? data?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required to execute process');
    }

    const userId = context.userId ?? data?.initiatedBy ?? 'system';
    const { priority, dueDate, assignees } = context.options ?? {};
    const normalizedDueDate = dueDate
      ? typeof dueDate === 'string'
        ? new Date(dueDate)
        : new Date(dueDate)
      : undefined;

    if (normalizedDueDate && Number.isNaN(normalizedDueDate.getTime())) {
      throw new BadRequestException('Invalid due date provided for process execution');
    }

    try {
      this.logger.log(`Executing business process: ${processId} (tenant: ${tenantId})`);
      return await this.startProcessInstance(processId, userId, tenantId, data, {
        priority,
        dueDate: normalizedDueDate,
        assignees,
      });
    } catch (error) {
      this.logger.error(`Failed to execute business process ${processId}`, error);
      throw error;
    }
  }

  async getProcesses(
    userId: string,
    tenantId: string,
    options: {
      category?: string;
      type?: string;
      status?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ processes: any[]; total: number }> {
    try {
      const where = {
        tenantId,
        isDeleted: false,
        ...(options.category && { category: options.category }),
        ...(options.type && { type: options.type }),
        ...(options.status && { status: options.status }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
          ],
        }),
      };

      const [processes, total] = await Promise.all([
        this.prisma.businessProcess.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.businessProcess.count({ where }),
      ]);

      return {
        processes: processes.map(p => this.formatProcess(p)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting processes', error);
      return { processes: [], total: 0 };
    }
  }

  async getInstances(
    processId: string,
    userId: string,
    tenantId: string,
    options: {
      status?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ instances: any[]; total: number }> {
    try {
      const where = {
        processId,
        ...(options.status && { status: options.status }),
        ...(options.priority && { priority: options.priority }),
      };

      const [instances, total] = await Promise.all([
        this.prisma.processInstance.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.processInstance.count({ where }),
      ]);

      return {
        instances: instances.map(i => this.formatInstance(i)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting instances', error);
      return { instances: [], total: 0 };
    }
  }

  async getProcessAnalytics(
    processId: string,
    userId: string,
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<any> {
    try {
      // Get process analytics from cache or calculate
      const cacheKey = `analytics:${processId}:${period}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate analytics (simplified for demo)
      const analytics = {
        overview: {
          totalInstances: 156,
          activeInstances: 23,
          completedInstances: 133,
          averageDuration: 2.5, // hours
          successRate: 94.2,
          slaCompliance: 87.5,
        },
        performance: {
          throughput: [
            { period: '2024-01', value: 45 },
            { period: '2024-02', value: 52 },
            { period: '2024-03', value: 48 },
          ],
          duration: [
            { period: '2024-01', value: 2.8 },
            { period: '2024-02', value: 2.3 },
            { period: '2024-03', value: 2.5 },
          ],
          quality: [
            { period: '2024-01', value: 92.1 },
            { period: '2024-02', value: 94.8 },
            { period: '2024-03', value: 94.2 },
          ],
        },
        bottlenecks: [
          {
            stageName: 'Approval Review',
            averageWaitTime: 4.2,
            impact: 'high',
            recommendation: 'Add parallel approval paths',
          },
          {
            stageName: 'Document Preparation',
            averageWaitTime: 1.8,
            impact: 'medium',
            recommendation: 'Implement template automation',
          },
        ],
        costs: {
          totalCost: 12450.0,
          costPerInstance: 79.8,
          breakdown: {
            labor: 8900.0,
            system: 1200.0,
            external: 2350.0,
          },
        },
        predictions: {
          nextWeekThroughput: 12,
          nextWeekDuration: 2.3,
          monthlyTrend: 'increasing',
          recommendations: [
            'Consider adding automation to stage 3',
            'Optimize resource allocation during peak hours',
          ],
        },
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));
      return analytics;
    } catch (error) {
      this.logger.error('Error getting process analytics', error);
      return null;
    }
  }

  private async getProcess(processId: string): Promise<BusinessProcess | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`process:${processId}`);
      if (cached) {
        return JSON.parse(cached) as BusinessProcess;
      }

      // Fall back to database
      const process = await this.prisma.businessProcess.findUnique({
        where: { id: processId },
      });

      if (process) {
        const formatted = process.definition as BusinessProcess;
        await this.redis.setex(`process:${processId}`, 3600, JSON.stringify(formatted));
        return formatted;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting process', error);
      return null;
    }
  }

  private getPriority(priority: string): number {
    switch (priority) {
      case 'critical': return 1;
      case 'high': return 3;
      case 'medium': return 5;
      case 'low': return 7;
      default: return 5;
    }
  }

  private formatProcess(process: any): any {
    const definition = process.definition as BusinessProcess;
    return {
      processId: process.id,
      name: process.name,
      description: process.description,
      category: process.category,
      type: process.type,
      status: process.status,
      version: process.version,
      stageCount: definition?.stages?.length || 0,
      participantCount: definition?.participants?.length || 0,
      kpiCount: definition?.kpis?.length || 0,
      automation: definition?.automation?.enabled || false,
      createdBy: process.createdBy,
      createdAt: process.createdAt,
      analytics: definition?.analytics?.performance || {},
    };
  }

  private formatInstance(instance: any): any {
    const instanceData = instance.instance as ProcessInstance;
    return {
      instanceId: instance.id,
      processId: instance.processId,
      status: instance.status,
      currentStage: instance.currentStage,
      priority: instance.priority,
      progress: this.calculateProgress(instanceData),
      duration: instanceData?.metrics?.duration || 0,
      slaCompliance: instanceData?.metrics?.slaCompliance || true,
      createdBy: instance.createdBy,
      createdAt: instance.createdAt,
    };
  }

  private calculateProgress(instance: ProcessInstance): number {
    if (!instance.history) return 0;
    const completed = instance.history.filter(h => h.status === 'completed').length;
    const total = instance.history.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
