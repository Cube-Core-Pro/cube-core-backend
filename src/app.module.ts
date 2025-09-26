// path: backend/src/app.module.ts
// purpose: Main application module with all enterprise modules
// dependencies: All core and advanced modules, configuration, database

import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { FeatureFlagGuard } from './common/feature-flag.guard';
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { CommonModule } from "./common/common.module";
import { AppService } from "./app.service";

// Core Infrastructure
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./redis/redis.module";
import { EmailModule } from "./email/email.module";
import { HealthModule } from "./health/health.module";
import { LoggerService } from "./logger/logger.service";
import { ValidationModule } from "./common/validation.module";

// Core Business Modules
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { CrmModule } from "./crm/crm.module";
// import { BankingModule } from "./banking/banking.module";
// import { BillingModule } from "./billing/billing.module";
// import { AuditModule } from "./audit/audit.module";
// import { AntiFraudModule } from "./antifraud/antifraud.module";
// import { PosModule } from "./pos/pos.module";

// Advanced Modules (will be added progressively)
import { AdvancedCrmModule } from "./advanced-crm/advanced-crm.module";
import { AdvancedErpModule } from "./advanced-erp/advanced-erp.module";
import { BillingModule } from "./billing/billing.module";
import { PosModule } from "./pos/pos.module";
import { BusinessIntelligenceModule } from "./business-intelligence/business-intelligence.module";
import { AdvancedAnalyticsModule } from "./advanced-analytics/advanced-analytics.module";
import { AuditModule } from "./audit/audit.module";
import { BankingModule } from "./banking/banking.module";
import { TokenizationBlockchainModule } from "./tokenization-blockchain/tokenization-blockchain.module";
import { PciDssComplianceModule } from "./pci-dss-compliance/pci-dss-compliance.module";
import { AiTradingMarketsModule } from "./ai-trading-markets/ai-trading-markets.module";
// Enterprise Collaboration Modules
import { OfficeModule } from "./modules/office/office.module";
import { VideoModule } from "./modules/video/video.module";
import { WebmailModule } from "./modules/webmail/webmail.module";
import { RdpModule } from "./modules/rdp/rdp.module";

// New Critical Modules (Framework Implementation)
import { CollaborationModule } from "./modules/collaboration/collaboration.module";
import { VideoConferencingModule } from "./modules/video-conferencing/video-conferencing.module";
import { EnterpriseEmailModule } from "./modules/enterprise-email/enterprise-email.module";
import { RemoteDesktopModule } from "./modules/remote-desktop/remote-desktop.module";
import { ApiGatewayModule } from "./api-gateway/api-gateway.module";
import { AdvancedSecurityModule } from "./advanced-security/advanced-security.module";
import { InternationalizationModule } from "./internationalization/internationalization.module";
import { DevopsDeploymentModule } from "./devops-deployment/devops-deployment.module";
import { DataWarehouseModule } from "./data-warehouse/data-warehouse.module";
import { MachineLearningModule } from "./machine-learning/machine-learning.module";
import { RealTimeCommunicationModule } from "./real-time-communication/real-time-communication.module";
import { SocketModule } from "./socket/socket.module";
import { AdminModule } from "./admin/admin.module";
import { ContentModule } from "./content/content.module";
import { SiatModule } from "./siat/siat.module";
import { WellnessModule } from "./modules/wellness/wellness.module";
import { WebsiteManagementModule } from "./modules/website-management/website-management.module";

// Fortune 500 Premium Modules
import { EnterpriseCommandCenterModule } from "./enterprise-command-center/enterprise-command-center.module";
import { AIAnalyticsEngineModule } from "./ai-analytics-engine/ai-analytics-engine.module";
import { ExecutiveDashboardModule } from "./executive-dashboard/executive-dashboard.module";

function isEnabled(flag: string, defaultTrue = true) {
  const val = process.env[flag];
  if (val === undefined) return defaultTrue;
  return val === 'true' || val === '1' || val === 'on';
}

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Common providers (Feature Flags, Password Policy, etc.)
    CommonModule,

    // Global rate limit (Fortune 500 baseline)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [{
        ttl: Number(cfg.get('THROTTLE_TTL') ?? 60),
        limit: Number(cfg.get('THROTTLE_LIMIT') ?? 300)
      }],
    }),
    // Scheduler for daily attestations and other jobs
    ScheduleModule.forRoot(),
    
    // Core Infrastructure
    DatabaseModule,
    RedisModule,
    EmailModule,
    HealthModule,
    ValidationModule.forRoot(),
    
    // Core Business Modules
    AuthModule,
    UsersModule,
    DashboardModule,
    CrmModule,

    // Critical pack (feature flags, default: enabled)
    ...(isEnabled('FEATURE_ADVANCED_CRM', true) ? [AdvancedCrmModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_ERP', true) ? [AdvancedErpModule] : []),
    ...(isEnabled('FEATURE_BILLING', true) ? [BillingModule] : []),
    ...(isEnabled('FEATURE_POS', true) ? [PosModule] : []),
    ...(isEnabled('FEATURE_BUSINESS_INTELLIGENCE', true) ? [BusinessIntelligenceModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_ANALYTICS', true) ? [AdvancedAnalyticsModule] : []),
    ...(isEnabled('FEATURE_AUDIT', true) ? [AuditModule] : []),

    // Extended pack
    ...(isEnabled('FEATURE_BANKING', true) ? [BankingModule] : []),
    ...(isEnabled('FEATURE_TOKENIZATION_BLOCKCHAIN', true) ? [TokenizationBlockchainModule] : []),
    ...(isEnabled('FEATURE_PCI_DSS_COMPLIANCE', true) ? [PciDssComplianceModule] : []),
    ...(isEnabled('FEATURE_AI_TRADING_MARKETS', true) ? [AiTradingMarketsModule] : []),
    // Enterprise Collaboration Pack
    ...(isEnabled('FEATURE_OFFICE_SUITE', true) ? [OfficeModule] : []),
    ...(isEnabled('FEATURE_VIDEO_CONFERENCING', true) ? [VideoModule] : []),
    ...(isEnabled('FEATURE_ENTERPRISE_WEBMAIL', true) ? [WebmailModule] : []),
    ...(isEnabled('FEATURE_REMOTE_DESKTOP_ACCESS', true) ? [RdpModule] : []),
    
    // New Critical Framework Modules
    ...(isEnabled('FEATURE_COLLABORATION_FRAMEWORK', true) ? [CollaborationModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_VIDEO_CONFERENCING', true) ? [VideoConferencingModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_ENTERPRISE_EMAIL', true) ? [EnterpriseEmailModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_REMOTE_DESKTOP', true) ? [RemoteDesktopModule] : []),
    ...(isEnabled('FEATURE_API_GATEWAY', true) ? [ApiGatewayModule] : []),
    ...(isEnabled('FEATURE_ADVANCED_SECURITY', true) ? [AdvancedSecurityModule] : []),
    ...(isEnabled('FEATURE_INTERNATIONALIZATION', true) ? [InternationalizationModule] : []),
    ...(isEnabled('FEATURE_DEVOPS_DEPLOYMENT', true) ? [DevopsDeploymentModule] : []),
    ...(isEnabled('FEATURE_DATA_WAREHOUSE', true) ? [DataWarehouseModule] : []),
    ...(isEnabled('FEATURE_MACHINE_LEARNING', true) ? [MachineLearningModule] : []),
    ...(isEnabled('FEATURE_REAL_TIME_COMMUNICATION', true) ? [RealTimeCommunicationModule] : []),
    ...(isEnabled('FEATURE_SOCKET', true) ? [SocketModule] : []),
    ...(isEnabled('FEATURE_ADMIN', true) ? [AdminModule] : []),
    ...(isEnabled('FEATURE_CONTENT', true) ? [ContentModule] : []),
    ...(isEnabled('FEATURE_SIAT', true) ? [SiatModule] : []),
  ...(isEnabled('FEATURE_WELLNESS', true) ? [WellnessModule] : []),
    ...(isEnabled('FEATURE_WEBSITE_MANAGEMENT', true) ? [WebsiteManagementModule] : []),
    
    // Fortune 500 Premium Modules
    ...(isEnabled('FEATURE_ENTERPRISE_COMMAND_CENTER', true) ? [EnterpriseCommandCenterModule] : []),
    ...(isEnabled('FEATURE_AI_ANALYTICS_ENGINE', true) ? [AIAnalyticsEngineModule] : []),
    ...(isEnabled('FEATURE_EXECUTIVE_DASHBOARD', true) ? [ExecutiveDashboardModule] : []),
    
    // Advanced modules will be added here progressively
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    ...(process.env.DISABLE_FEATURE_FLAGS === 'true' ? [] : [{ provide: APP_GUARD, useClass: FeatureFlagGuard }]),
  ],
  exports: [
    LoggerService,
  ],
})
export class AppModule {}
