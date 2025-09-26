import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

// Fortune 500 Audit & Compliance Suite
import { SOXComplianceAuditService } from './services/sox-compliance-audit.service';
import { ISO27001AuditService } from './services/iso27001-audit.service';
import { GDPRComplianceService } from './services/gdpr-compliance.service';
import { ContinuousMonitoringService } from './services/continuous-monitoring.service';
import { RegulatoryReportingService } from './services/regulatory-reporting.service';
import { InternalControlsService } from './services/internal-controls.service';
import { RiskAssessmentService } from './services/risk-assessment.service';
import { AuditTrailAnalyticsService } from './services/audit-trail-analytics.service';
import { ComplianceDashboardService } from './services/compliance-dashboard.service';
import { ThirdPartyRiskService } from './services/third-party-risk.service';
import { CyberSecurityAuditService } from './services/cybersecurity-audit.service';
import { FinancialAuditService } from './services/financial-audit.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    // Fortune 500 Audit Platform
    SOXComplianceAuditService,
    ISO27001AuditService,
    GDPRComplianceService,
    ContinuousMonitoringService,
    RegulatoryReportingService,
    InternalControlsService,
    RiskAssessmentService,
    AuditTrailAnalyticsService,
    ComplianceDashboardService,
    ThirdPartyRiskService,
    CyberSecurityAuditService,
    FinancialAuditService,
  ],
  exports: [
    AuditService,
    SOXComplianceAuditService,
    ISO27001AuditService,
    GDPRComplianceService,
    ContinuousMonitoringService,
    RegulatoryReportingService,
    InternalControlsService,
    RiskAssessmentService,
    AuditTrailAnalyticsService,
    ComplianceDashboardService,
    ThirdPartyRiskService,
    CyberSecurityAuditService,
    FinancialAuditService,
  ],
})
export class AuditModule {}
