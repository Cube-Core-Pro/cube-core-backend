// path: backend/src/fortune-500-premium/fortune-500-premium.module.ts
// purpose: Fortune 500 Premium Enterprise Features Module
// dependencies: All premium enterprise services and advanced functionality

import { Module } from '@nestjs/common';
import { Fortune500PremiumController } from './fortune-500-premium.controller';
import { Fortune500PremiumService } from './fortune-500-premium.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Fortune 500 Premium Enterprise Suite
import {
  // Executive Dashboard & Analytics
  ExecutiveDashboardService,
  RealTimeBusinessIntelligenceService,
  PredictiveCorporateAnalyticsService,
  
  // Advanced Governance
  CorporateGovernanceService,
  BoardManagementService,
  ShareholderRelationsService,
  
  // Premium Security Features
  QuantumCryptographyService,
  AdvancedThreatHuntingService,
  ZeroTrustArchitectureService,
  
  // Global Operations
  MultiTenantGlobalService,
  CrossBorderComplianceService,
  InternationalTaxOptimizationService,
  
  // AI-Powered Premium Features
  ExecutiveAIAssistantService,
  PredictiveRiskModelingService,
  AutonomousBusinessProcessService,
  
  // Premium Integration & Data
  EnterpriseDataLakeService,
  RealTimeDataStreamingService,
  AdvancedAPIManagementService,
  
  // Sustainability & ESG
  ESGReportingService,
  CarbonFootprintTrackingService,
  SustainabilityMetricsService,
  
  // Premium Performance & Optimization
  EnterprisePerformanceOptimizationService,
  ScalabilityIntelligenceService,
  CostOptimizationAIService
} from './services';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [Fortune500PremiumController],
  providers: [
    Fortune500PremiumService,
    
    // Executive Dashboard & Analytics
    ExecutiveDashboardService,
    RealTimeBusinessIntelligenceService,
    PredictiveCorporateAnalyticsService,
    
    // Advanced Governance
    CorporateGovernanceService,
    BoardManagementService,
    ShareholderRelationsService,
    
    // Premium Security Features
    QuantumCryptographyService,
    AdvancedThreatHuntingService,
    ZeroTrustArchitectureService,
    
    // Global Operations
    MultiTenantGlobalService,
    CrossBorderComplianceService,
    InternationalTaxOptimizationService,
    
    // AI-Powered Premium Features
    ExecutiveAIAssistantService,
    PredictiveRiskModelingService,
    AutonomousBusinessProcessService,
    
    // Premium Integration & Data
    EnterpriseDataLakeService,
    RealTimeDataStreamingService,
    AdvancedAPIManagementService,
    
    // Sustainability & ESG
    ESGReportingService,
    CarbonFootprintTrackingService,
    SustainabilityMetricsService,
    
    // Premium Performance & Optimization
    EnterprisePerformanceOptimizationService,
    ScalabilityIntelligenceService,
    CostOptimizationAIService,
  ],
  exports: [
    Fortune500PremiumService,
    
    // Executive Dashboard & Analytics
    ExecutiveDashboardService,
    RealTimeBusinessIntelligenceService,
    PredictiveCorporateAnalyticsService,
    
    // Advanced Governance
    CorporateGovernanceService,
    BoardManagementService,
    ShareholderRelationsService,
    
    // Premium Security Features
    QuantumCryptographyService,
    AdvancedThreatHuntingService,
    ZeroTrustArchitectureService,
    
    // Global Operations
    MultiTenantGlobalService,
    CrossBorderComplianceService,
    InternationalTaxOptimizationService,
    
    // AI-Powered Premium Features
    ExecutiveAIAssistantService,
    PredictiveRiskModelingService,
    AutonomousBusinessProcessService,
    
    // Premium Integration & Data
    EnterpriseDataLakeService,
    RealTimeDataStreamingService,
    AdvancedAPIManagementService,
    
    // Sustainability & ESG
    ESGReportingService,
    CarbonFootprintTrackingService,
    SustainabilityMetricsService,
    
    // Premium Performance & Optimization
    EnterprisePerformanceOptimizationService,
    ScalabilityIntelligenceService,
    CostOptimizationAIService,
  ],
})
export class Fortune500PremiumModule {
  static forRoot() {
    return {
      module: Fortune500PremiumModule,
      global: true,
    };
  }
}