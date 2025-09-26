// path: backend/src/fortune-500-orchestration/fortune-500-orchestration.module.ts
// purpose: Fortune 500 Master Orchestration Module - Connects all enterprise systems
// dependencies: All Fortune 500 modules and advanced enterprise orchestration

import { Module, Global } from '@nestjs/common';
import { Fortune500OrchestrationController } from './fortune-500-orchestration.controller';
import { Fortune500OrchestrationService } from './fortune-500-orchestration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Import all Fortune 500 Enterprise Modules
import { AdvancedSecurityModule } from '../advanced-security/advanced-security.module';
import { AiEnterpriseModule } from '../ai-enterprise/ai-enterprise.module';
import { AdvancedFinancialManagementModule } from '../advanced-financial-management/advanced-financial-management.module';
import { AdvancedErpModule } from '../advanced-erp/advanced-erp.module';
import { AdvancedHrManagementModule } from '../advanced-hr-management/advanced-hr-management.module';
import { AdvancedCrmModule } from '../advanced-crm/advanced-crm.module';
import { EnterpriseIntegrationHubModule } from '../enterprise-integration-hub/enterprise-integration-hub.module';
import { AuditModule } from '../audit/audit.module';
import { TokenizationBlockchainModule } from '../tokenization-blockchain/tokenization-blockchain.module';
import { AiPredictiveBiModule } from '../ai-predictive-bi/ai-predictive-bi.module';
import { Fortune500PremiumModule } from '../fortune-500-premium/fortune-500-premium.module';

// Fortune 500 Master Orchestration Services
import {
  EnterpriseOrchestrationService,
  SystemIntegrationManagerService,
  GlobalBusinessProcessService,
  CrossModuleDataSyncService,
  EnterpriseEventBusService,
  PerformanceMonitoringService,
  ScalabilityManagerService,
  SecurityOrchestrationService,
  ComplianceCoordinatorService,
  BusinessContinuityService,
  DisasterRecoveryOrchestrationService,
  GlobalConfigurationService,
  EnterpriseHealthCheckService,
  SystemOptimizationService,
  LoadBalancingManagerService
} from './services';

@Global()
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    
    // All Fortune 500 Enterprise Modules
    AdvancedSecurityModule,
    AiEnterpriseModule,
    AdvancedFinancialManagementModule,
    AdvancedErpModule,
    AdvancedHrManagementModule,
    AdvancedCrmModule,
    EnterpriseIntegrationHubModule,
    AuditModule,
    TokenizationBlockchainModule,
    AiPredictiveBiModule,
    Fortune500PremiumModule.forRoot(),
  ],
  controllers: [Fortune500OrchestrationController],
  providers: [
    Fortune500OrchestrationService,
    
    // Master Orchestration Services
    EnterpriseOrchestrationService,
    SystemIntegrationManagerService,
    GlobalBusinessProcessService,
    CrossModuleDataSyncService,
    EnterpriseEventBusService,
    PerformanceMonitoringService,
    ScalabilityManagerService,
    SecurityOrchestrationService,
    ComplianceCoordinatorService,
    BusinessContinuityService,
    DisasterRecoveryOrchestrationService,
    GlobalConfigurationService,
    EnterpriseHealthCheckService,
    SystemOptimizationService,
    LoadBalancingManagerService,
  ],
  exports: [
    Fortune500OrchestrationService,
    
    // Master Orchestration Services
    EnterpriseOrchestrationService,
    SystemIntegrationManagerService,
    GlobalBusinessProcessService,
    CrossModuleDataSyncService,
    EnterpriseEventBusService,
    PerformanceMonitoringService,
    ScalabilityManagerService,
    SecurityOrchestrationService,
    ComplianceCoordinatorService,
    BusinessContinuityService,
    DisasterRecoveryOrchestrationService,
    GlobalConfigurationService,
    EnterpriseHealthCheckService,
    SystemOptimizationService,
    LoadBalancingManagerService,
  ],
})
export class Fortune500OrchestrationModule {
  static forRoot() {
    return {
      module: Fortune500OrchestrationModule,
      global: true,
    };
  }
}