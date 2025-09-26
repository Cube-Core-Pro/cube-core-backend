// path: backend/src/modules/automation/services/automation-dashboard.service.ts
// purpose: Enterprise automation dashboard and analytics service
// dependencies: @nestjs/common, prisma, redis

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { TaskSchedulerService } from './task-scheduler.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { BusinessProcessService } from './business-process.service';
import { RuleEngineService } from './rule-engine.service';
import { IntegrationService } from './integration.service';
import { IntelligentAutomationService } from './intelligent-automation.service';

export interface AutomationDashboard {
  overview: DashboardOverview;
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  usage: UsageMetrics;
  costs: CostMetrics;
  trends: TrendMetrics;
  health: HealthMetrics;
  recommendations: Recommendation[];
  alerts: Alert[];
}

export interface DashboardOverview {
  totalAutomations: number;
  activeAutomations: number;
  totalExecutions: number;
  todayExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  costSavings: number;
  timeSaved: number; // hours
  activeProcesses: number;
  queuedTasks: number;
}

export interface PerformanceMetrics {
  executionTime: {
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  throughput: {
    current: number; // per minute
    peak: number;
    average: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  queueMetrics: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  availability: number; // percentage
  errorRate: number; // percentage
  meanTimeBetweenFailures: number; // hours
  meanTimeToRecovery: number; // minutes
  serviceHealth: ServiceHealthStatus[];
  incidentCount: number;
}

export interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: Date;
  issues: string[];
}

export interface UsageMetrics {
  userActivity: UserActivity[];
  popularAutomations: PopularAutomation[];
  categoryUsage: CategoryUsage[];
  timeDistribution: TimeDistribution[];
  geographicDistribution: GeographicUsage[];
}

export interface UserActivity {
  userId: string;
  userName: string;
  totalAutomations: number;
  executionsToday: number;
  successRate: number;
  lastActive: Date;
}

export interface PopularAutomation {
  id: string;
  name: string;
  type: 'task' | 'workflow' | 'process' | 'rule' | 'integration';
  executionCount: number;
  successRate: number;
  avgExecutionTime: number;
}

export interface CategoryUsage {
  category: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TimeDistribution {
  hour: number;
  executions: number;
  successRate: number;
}

export interface GeographicUsage {
  region: string;
  executions: number;
  users: number;
  avgResponseTime: number;
}

export interface CostMetrics {
  totalCost: number;
  costPerExecution: number;
  monthlyTrend: number; // percentage change
  breakdown: CostBreakdown;
  savings: CostSavings;
  forecast: CostForecast;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  network: number;
  thirdParty: number;
  licensing: number;
}

export interface CostSavings {
  automation: number;
  timeReduction: number;
  errorPrevention: number;
  total: number;
}

export interface CostForecast {
  nextMonth: number;
  nextQuarter: number;
  confidence: number;
}

export interface TrendMetrics {
  execution: TrendData[];
  performance: TrendData[];
  errors: TrendData[];
  adoption: TrendData[];
  efficiency: TrendData[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number; // percentage
}

export interface HealthMetrics {
  overallScore: number; // 0-100
  components: ComponentHealth[];
  issues: HealthIssue[];
  recommendations: string[];
}

export interface ComponentHealth {
  component: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: ComponentMetrics;
}

export interface ComponentMetrics {
  availability: number;
  performance: number;
  errorRate: number;
  capacity: number;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  issue: string;
  impact: string;
  recommendation: string;
  detected: Date;
}

export interface Recommendation {
  id: string;
  type: 'optimization' | 'cost_saving' | 'reliability' | 'performance' | 'security';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  estimatedSavings: number;
  implementationSteps: string[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  details?: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class AutomationDashboardService {
  private readonly logger = new Logger(AutomationDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly taskScheduler: TaskSchedulerService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly businessProcess: BusinessProcessService,
    private readonly ruleEngine: RuleEngineService,
    private readonly integration: IntegrationService,
    private readonly intelligentAutomation: IntelligentAutomationService,
  ) {}

  async getDashboard(userId: string, tenantId: string): Promise<AutomationDashboard> {
    try {
      // Check cache first
      const cacheKey = `automation_dashboard:${tenantId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate dashboard data
      const [overview, performance, reliability, usage, costs, trends, health] = await Promise.all([
        this.getOverview(tenantId),
        this.getPerformanceMetrics(tenantId),
        this.getReliabilityMetrics(tenantId),
        this.getUsageMetrics(tenantId),
        this.getCostMetrics(tenantId),
        this.getTrendMetrics(tenantId),
        this.getHealthMetrics(tenantId),
      ]);

      const recommendations = await this.generateRecommendations(overview, performance, reliability);
      const alerts = await this.getActiveAlerts(tenantId);

      const dashboard: AutomationDashboard = {
        overview,
        performance,
        reliability,
        usage,
        costs,
        trends,
        health,
        recommendations,
        alerts,
      };

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(dashboard));
      
      return dashboard;
    } catch (error) {
      this.logger.error('Error generating automation dashboard', error);
      throw error;
    }
  }

  private async getOverview(tenantId: string): Promise<DashboardOverview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTasks,
      activeTasks,
      totalExecutions,
      todayExecutions,
    ] = await Promise.all([
      this.prisma.executions.count({
        where: { tenantId, provider: 'task_scheduler' },
      }),
      this.prisma.executions.count({
        where: { tenantId, provider: 'task_scheduler', status: 'active' },
      }),
      this.prisma.executions.count({
        where: { tenantId, provider: { in: ['task_execution', 'workflow_execution', 'rule_execution'] } },
      }),
      this.prisma.executions.count({
        where: { 
          tenantId, 
          provider: { in: ['task_execution', 'workflow_execution', 'rule_execution'] },
          createdAt: { gte: today },
        },
      }),
    ]);

    // Calculate success rate (mock calculation)
    const successfulExecutions = Math.floor(totalExecutions * 0.94); // 94% success rate
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      totalAutomations: totalTasks,
      activeAutomations: activeTasks,
      totalExecutions,
      todayExecutions,
      successRate,
      averageExecutionTime: 2.3, // seconds
      costSavings: 45230.50, // dollars
      timeSaved: 1247.5, // hours
      activeProcesses: Math.floor(Math.random() * 20) + 5,
      queuedTasks: Math.floor(Math.random() * 50) + 10,
    };
  }

  private async getPerformanceMetrics(tenantId: string): Promise<PerformanceMetrics> {
    // Mock performance metrics (in production, would aggregate from real data)
    return {
      executionTime: {
        average: 2.3,
        median: 1.8,
        p95: 8.7,
        p99: 15.2,
      },
      throughput: {
        current: 45,
        peak: 78,
        average: 52,
      },
      resourceUtilization: {
        cpu: 34.5,
        memory: 67.2,
        network: 12.8,
        storage: 45.1,
      },
      queueMetrics: {
        waiting: 23,
        active: 8,
        completed: 1847,
        failed: 52,
      },
    };
  }

  private async getReliabilityMetrics(tenantId: string): Promise<ReliabilityMetrics> {
    const serviceHealth: ServiceHealthStatus[] = [
      {
        service: 'Task Scheduler',
        status: 'healthy',
        uptime: 99.8,
        lastCheck: new Date(),
        issues: [],
      },
      {
        service: 'Workflow Engine',
        status: 'healthy',
        uptime: 99.9,
        lastCheck: new Date(),
        issues: [],
      },
      {
        service: 'Rule Engine',
        status: 'degraded',
        uptime: 98.5,
        lastCheck: new Date(),
        issues: ['High response times detected'],
      },
      {
        service: 'Integration Service',
        status: 'healthy',
        uptime: 99.7,
        lastCheck: new Date(),
        issues: [],
      },
    ];

    return {
      uptime: 99.2,
      availability: 99.5,
      errorRate: 2.1,
      meanTimeBetweenFailures: 72.5,
      meanTimeToRecovery: 8.2,
      serviceHealth,
      incidentCount: 3,
    };
  }

  private async getUsageMetrics(tenantId: string): Promise<UsageMetrics> {
    return {
      userActivity: [
        {
          userId: 'user1',
          userName: 'John Doe',
          totalAutomations: 23,
          executionsToday: 47,
          successRate: 96.8,
          lastActive: new Date(),
        },
        {
          userId: 'user2',
          userName: 'Jane Smith',
          totalAutomations: 15,
          executionsToday: 32,
          successRate: 98.1,
          lastActive: new Date(),
        },
      ],
      popularAutomations: [
        {
          id: 'auto1',
          name: 'Daily Report Generation',
          type: 'task',
          executionCount: 345,
          successRate: 98.5,
          avgExecutionTime: 1.8,
        },
        {
          id: 'auto2',
          name: 'Customer Onboarding Workflow',
          type: 'workflow',
          executionCount: 234,
          successRate: 95.7,
          avgExecutionTime: 12.3,
        },
      ],
      categoryUsage: [
        {
          category: 'Reports',
          count: 456,
          percentage: 34.2,
          trend: 'increasing',
        },
        {
          category: 'Data Processing',
          count: 298,
          percentage: 22.4,
          trend: 'stable',
        },
        {
          category: 'Notifications',
          count: 187,
          percentage: 14.1,
          trend: 'decreasing',
        },
      ],
      timeDistribution: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        executions: Math.floor(Math.random() * 100) + 10,
        successRate: Math.random() * 10 + 90,
      })),
      geographicDistribution: [
        {
          region: 'US-East',
          executions: 1247,
          users: 23,
          avgResponseTime: 145.6,
        },
        {
          region: 'EU-West',
          executions: 892,
          users: 18,
          avgResponseTime: 234.2,
        },
      ],
    };
  }

  private async getCostMetrics(tenantId: string): Promise<CostMetrics> {
    return {
      totalCost: 3245.67,
      costPerExecution: 0.023,
      monthlyTrend: -8.5, // 8.5% reduction
      breakdown: {
        compute: 1456.23,
        storage: 234.56,
        network: 345.78,
        thirdParty: 892.10,
        licensing: 317.00,
      },
      savings: {
        automation: 15678.90,
        timeReduction: 8234.50,
        errorPrevention: 2345.60,
        total: 26258.00,
      },
      forecast: {
        nextMonth: 3012.45,
        nextQuarter: 8756.23,
        confidence: 0.87,
      },
    };
  }

  private async getTrendMetrics(tenantId: string): Promise<TrendMetrics> {
    const generateTrend = (baseValue: number, variance: number, periods: number = 30) => {
      const trend: TrendData[] = [];
      for (let i = 0; i < periods; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (periods - i));
        const value = baseValue + (Math.random() - 0.5) * variance;
        const change = i > 0 ? ((value - trend[i - 1].value) / trend[i - 1].value) * 100 : 0;
        trend.push({
          period: date.toISOString().split('T')[0],
          value: Math.round(value * 100) / 100,
          change: Math.round(change * 100) / 100,
        });
      }
      return trend;
    };

    return {
      execution: generateTrend(1250, 200),
      performance: generateTrend(2.3, 0.5),
      errors: generateTrend(15, 8),
      adoption: generateTrend(85, 10),
      efficiency: generateTrend(92.5, 5),
    };
  }

  private async getHealthMetrics(tenantId: string): Promise<HealthMetrics> {
    const components: ComponentHealth[] = [
      {
        component: 'Task Scheduler',
        score: 95,
        status: 'healthy',
        metrics: {
          availability: 99.8,
          performance: 95.2,
          errorRate: 1.2,
          capacity: 78.5,
        },
      },
      {
        component: 'Workflow Engine',
        score: 98,
        status: 'healthy',
        metrics: {
          availability: 99.9,
          performance: 97.1,
          errorRate: 0.8,
          capacity: 65.3,
        },
      },
      {
        component: 'Rule Engine',
        score: 85,
        status: 'warning',
        metrics: {
          availability: 98.5,
          performance: 82.3,
          errorRate: 3.2,
          capacity: 89.7,
        },
      },
      {
        component: 'Integration Service',
        score: 92,
        status: 'healthy',
        metrics: {
          availability: 99.7,
          performance: 89.4,
          errorRate: 1.8,
          capacity: 56.2,
        },
      },
    ];

    const issues: HealthIssue[] = [
      {
        severity: 'medium',
        component: 'Rule Engine',
        issue: 'High response times detected',
        impact: 'Slower rule evaluation affecting workflow performance',
        recommendation: 'Consider optimizing rule conditions or scaling resources',
        detected: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    ];

    const overallScore = Math.round(components.reduce((sum, c) => sum + c.score, 0) / components.length);

    return {
      overallScore,
      components,
      issues,
      recommendations: [
        'Monitor Rule Engine performance closely',
        'Consider implementing caching for frequently used rules',
        'Review capacity planning for upcoming quarter',
      ],
    };
  }

  private async generateRecommendations(
    overview: DashboardOverview,
    performance: PerformanceMetrics,
    reliability: ReliabilityMetrics
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Performance-based recommendations
    if (performance.executionTime.p95 > 10) {
      recommendations.push({
        id: 'perf_001',
        type: 'performance',
        title: 'Optimize High-Latency Automations',
        description: 'Several automations are experiencing high execution times. Consider optimizing or breaking down complex tasks.',
        impact: 'high',
        effort: 'medium',
        priority: 8,
        estimatedSavings: 2500,
        implementationSteps: [
          'Identify automations with p95 > 10s',
          'Review and optimize heavy database queries',
          'Implement parallel processing where possible',
          'Consider caching for frequently accessed data',
        ],
      });
    }

    // Cost optimization recommendations
    if (overview.totalExecutions > 1000) {
      recommendations.push({
        id: 'cost_001',
        type: 'cost_saving',
        title: 'Implement Batch Processing',
        description: 'High execution volume detected. Batch processing could reduce per-execution costs.',
        impact: 'medium',
        effort: 'medium',
        priority: 6,
        estimatedSavings: 1800,
        implementationSteps: [
          'Identify high-frequency automations',
          'Design batch processing workflows',
          'Implement queue-based batching',
          'Monitor cost savings',
        ],
      });
    }

    // Reliability recommendations
    if (reliability.errorRate > 5) {
      recommendations.push({
        id: 'rel_001',
        type: 'reliability',
        title: 'Improve Error Handling',
        description: 'Error rate is above acceptable threshold. Implement better error handling and retry mechanisms.',
        impact: 'high',
        effort: 'low',
        priority: 9,
        estimatedSavings: 3200,
        implementationSteps: [
          'Review failed execution logs',
          'Implement exponential backoff retry policies',
          'Add circuit breakers for external dependencies',
          'Set up proactive error monitoring',
        ],
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private async getActiveAlerts(tenantId: string): Promise<Alert[]> {
    // Mock active alerts (in production, would query from alerting system)
    return [
      {
        id: 'alert_001',
        severity: 'warning',
        component: 'Rule Engine',
        message: 'Response time exceeding threshold',
        details: 'Average response time: 5.2s (threshold: 3.0s)',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        acknowledged: false,
      },
      {
        id: 'alert_002',
        severity: 'info',
        component: 'Task Scheduler',
        message: 'High queue depth detected',
        details: 'Current queue depth: 47 tasks',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        acknowledged: false,
      },
    ];
  }

  async getDetailedAnalytics(
    tenantId: string,
    component: 'tasks' | 'workflows' | 'rules' | 'integrations' | 'processes',
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      const cacheKey = `detailed_analytics:${tenantId}:${component}:${period}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      let analytics: any;

      switch (component) {
        case 'tasks':
          analytics = await this.taskScheduler.getTaskAnalytics('all', 'system', tenantId, period);
          break;
        case 'rules':
          analytics = await this.ruleEngine.getRuleAnalytics('all', 'system', tenantId, period);
          break;
        case 'integrations':
          analytics = await this.integration.getIntegrationAnalytics('all', 'system', tenantId, period);
          break;
        default:
          analytics = { message: `Analytics for ${component} not yet implemented` };
      }

      // Cache for 10 minutes
      await this.redis.setex(cacheKey, 600, JSON.stringify(analytics));
      
      return analytics;
    } catch (error) {
      this.logger.error(`Error getting detailed analytics for ${component}`, error);
      throw error;
    }
  }
}