// path: backend/src/modules/automation/automation.module.ts
// purpose: Enterprise Automation Framework Module
// dependencies: @nestjs/common, @nestjs/schedule, prisma, redis, bull

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { IntelligentAutomationService } from './services/intelligent-automation.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { BusinessProcessService } from './services/business-process.service';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { RuleEngineService } from './services/rule-engine.service';
import { IntegrationService } from './services/integration.service';
import { AutomationDashboardService } from './services/automation-dashboard.service';
import { AutomationMetricsService } from './services/automation-metrics.service';
import { 
  ScheduledTasksProcessor,
  WorkflowExecutionProcessor,
  BusinessProcessProcessor,
  AutomationTasksProcessor,
} from './processors/automation.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditModule } from '../../audit/audit.module';
import { MetricsController } from './controllers/metrics.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    AuditModule,
    HttpModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      {
        name: 'workflow-execution',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'automation-tasks',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'business-processes',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: 'scheduled-tasks',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
        },
      },
    ),
  ],
  controllers: [AutomationController, MetricsController],
  providers: [
    AutomationService,
    IntelligentAutomationService,
    WorkflowEngineService,
    BusinessProcessService,
    TaskSchedulerService,
    RuleEngineService,
    IntegrationService,
    AutomationDashboardService,
    AutomationMetricsService,
    ScheduledTasksProcessor,
    WorkflowExecutionProcessor,
    BusinessProcessProcessor,
    AutomationTasksProcessor,
  ],
  exports: [
    AutomationService,
    IntelligentAutomationService,
    WorkflowEngineService,
    BusinessProcessService,
    TaskSchedulerService,
    RuleEngineService,
    IntegrationService,
    AutomationDashboardService,
    AutomationMetricsService,
  ],
})
export class AutomationModule {}