import { Module } from '@nestjs/common';
import { EnterpriseIntegrationHubController } from './enterprise-integration-hub.controller';
import { EnterpriseIntegrationHubService } from './enterprise-integration-hub.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Fortune 500 Enterprise Integration Suite
import {
  APIGatewayService,
  EnterpriseServiceBusService,
  DataSynchronizationService,
  WorkflowOrchestrationService,
  B2BIntegrationService,
  CloudConnectorService,
  LegacySystemBridgeService,
  RealTimeEventProcessingService,
  MicroservicesOrchestrationService,
  DataTransformationService,
  IntegrationMonitoringService,
  SSOFederationService
} from './services';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [EnterpriseIntegrationHubController],
  providers: [
    EnterpriseIntegrationHubService,
    // Fortune 500 Integration Platform
    APIGatewayService,
    EnterpriseServiceBusService,
    DataSynchronizationService,
    WorkflowOrchestrationService,
    B2BIntegrationService,
    CloudConnectorService,
    LegacySystemBridgeService,
    RealTimeEventProcessingService,
    MicroservicesOrchestrationService,
    DataTransformationService,
    IntegrationMonitoringService,
    SSOFederationService,
  ],
  exports: [
    EnterpriseIntegrationHubService,
    APIGatewayService,
    EnterpriseServiceBusService,
    DataSynchronizationService,
    WorkflowOrchestrationService,
    B2BIntegrationService,
    CloudConnectorService,
    LegacySystemBridgeService,
    RealTimeEventProcessingService,
    MicroservicesOrchestrationService,
    DataTransformationService,
    IntegrationMonitoringService,
    SSOFederationService,
  ],
})
export class EnterpriseIntegrationHubModule {}
