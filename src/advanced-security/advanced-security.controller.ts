import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { AdvancedSecurityService } from './advanced-security.service';
import { Fortune500SecurityConfig } from '../types/fortune500-types';

@Controller('advanced-security')
export class AdvancedSecurityController {
  private readonly logger = new Logger(AdvancedSecurityController.name);

  constructor(private readonly advancedSecurityService: AdvancedSecurityService) {}

  @Get('health')
  getHealth() {
    return this.advancedSecurityService.health();
  }

  // ==================== SECURITY DASHBOARD ====================

  @Get(':tenantId/dashboard')
  async getSecurityDashboard(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting security dashboard for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getSecurityDashboard(tenantId);
    } catch (error) {
      this.logger.error(`Error getting security dashboard: ${error.message}`);
      throw error;
    }
  }

  // ==================== THREAT INTELLIGENCE ====================

  @Get(':tenantId/threats')
  async getThreatIntelligence(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting threat intelligence for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getThreatIntelligence(tenantId);
    } catch (error) {
      this.logger.error(`Error getting threat intelligence: ${error.message}`);
      throw error;
    }
  }

  @Post(':tenantId/threats/analyze')
  async analyzeThreat(
    @Param('tenantId') tenantId: string,
    @Body() threatData: any
  ) {
    try {
      this.logger.log(`Analyzing threat for tenant: ${tenantId}`);
      return await this.advancedSecurityService.analyzeThreat(tenantId, threatData);
    } catch (error) {
      this.logger.error(`Error analyzing threat: ${error.message}`);
      throw error;
    }
  }

  // ==================== VULNERABILITY MANAGEMENT ====================

  @Get(':tenantId/vulnerabilities')
  async getVulnerabilityAssessment(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting vulnerability assessment for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getVulnerabilityAssessment(tenantId);
    } catch (error) {
      this.logger.error(`Error getting vulnerability assessment: ${error.message}`);
      throw error;
    }
  }

  @Post(':tenantId/vulnerabilities/prioritize')
  async prioritizeVulnerabilities(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Prioritizing vulnerabilities for tenant: ${tenantId}`);
      return await this.advancedSecurityService.prioritizeVulnerabilities(tenantId);
    } catch (error) {
      this.logger.error(`Error prioritizing vulnerabilities: ${error.message}`);
      throw error;
    }
  }

  // ==================== INCIDENT RESPONSE ====================

  @Get(':tenantId/incidents')
  async getSecurityIncidents(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting security incidents for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getSecurityIncidents(tenantId);
    } catch (error) {
      this.logger.error(`Error getting security incidents: ${error.message}`);
      throw error;
    }
  }

  @Post(':tenantId/incidents')
  async createIncident(
    @Param('tenantId') tenantId: string,
    @Body() incidentData: any
  ) {
    try {
      this.logger.log(`Creating security incident for tenant: ${tenantId}`);
      return await this.advancedSecurityService.createIncident(tenantId, incidentData);
    } catch (error) {
      this.logger.error(`Error creating security incident: ${error.message}`);
      throw error;
    }
  }

  // ==================== COMPLIANCE MANAGEMENT ====================

  @Get(':tenantId/compliance')
  async getComplianceFrameworks(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting compliance frameworks for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getComplianceFrameworks(tenantId);
    } catch (error) {
      this.logger.error(`Error getting compliance frameworks: ${error.message}`);
      throw error;
    }
  }

  // ==================== ACCESS CONTROL ====================

  @Get(':tenantId/access-control')
  async getAccessControlAnalysis(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting access control analysis for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getAccessControlAnalysis(tenantId);
    } catch (error) {
      this.logger.error(`Error getting access control analysis: ${error.message}`);
      throw error;
    }
  }

  // ==================== SECURITY AUDITING ====================

  @Get(':tenantId/audits')
  async getSecurityAudits(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting security audits for tenant: ${tenantId}`);
      return await this.advancedSecurityService.getSecurityAudits(tenantId);
    } catch (error) {
      this.logger.error(`Error getting security audits: ${error.message}`);
      throw error;
    }
  }

  // ==================== SECURITY METRICS & REPORTING ====================

  @Get(':tenantId/metrics')
  async getSecurityMetrics(
    @Param('tenantId') tenantId: string,
    @Query('period') period?: string
  ) {
    try {
      this.logger.log(`Getting security metrics for tenant: ${tenantId}, period: ${period}`);
      return await this.advancedSecurityService.getSecurityMetrics(tenantId, period);
    } catch (error) {
      this.logger.error(`Error getting security metrics: ${error.message}`);
      throw error;
    }
  }

  // ==================== RISK ASSESSMENT ====================

  @Post(':tenantId/risk-assessment')
  async performRiskAssessment(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Performing risk assessment for tenant: ${tenantId}`);
      return await this.advancedSecurityService.performRiskAssessment(tenantId);
    } catch (error) {
      this.logger.error(`Error performing risk assessment: ${error.message}`);
      throw error;
    }
  }

  // ==================== SECURITY INTELLIGENCE ====================

  @Get(':tenantId/intelligence/summary')
  async getSecurityIntelligenceSummary(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Getting security intelligence summary for tenant: ${tenantId}`);
      
      const [dashboard, threats, vulnerabilities, incidents, compliance, metrics] = await Promise.all([
        this.advancedSecurityService.getSecurityDashboard(tenantId),
        this.advancedSecurityService.getThreatIntelligence(tenantId),
        this.advancedSecurityService.getVulnerabilityAssessment(tenantId),
        this.advancedSecurityService.getSecurityIncidents(tenantId),
        this.advancedSecurityService.getComplianceFrameworks(tenantId),
        this.advancedSecurityService.getSecurityMetrics(tenantId)
      ]);

      return {
        summary: {
          generatedAt: new Date(),
          tenantId,
          overallSecurityPosture: dashboard.overallSecurityScore,
          threatLevel: dashboard.threatLevel,
          activeThreats: threats.length,
          criticalVulnerabilities: vulnerabilities.criticalVulnerabilities,
          openIncidents: incidents.filter(i => i.status !== 'closed').length,
          complianceScore: dashboard.complianceScore
        },
        dashboard,
        threats: threats.slice(0, 5), // Top 5 threats
        vulnerabilities: {
          summary: {
            total: vulnerabilities.totalVulnerabilities,
            critical: vulnerabilities.criticalVulnerabilities,
            high: vulnerabilities.highVulnerabilities,
            riskScore: vulnerabilities.riskScore
          },
          topVulnerabilities: vulnerabilities.vulnerabilities.slice(0, 3)
        },
        incidents: incidents.filter(i => i.status !== 'closed').slice(0, 3),
        compliance: compliance.map(c => ({
          name: c.name,
          status: c.status,
          score: c.score,
          gaps: c.gaps.length
        })),
        metrics: {
          kpis: metrics.kpis,
          trends: metrics.trends
        },
        executiveInsights: [
          `Security posture score: ${dashboard.overallSecurityScore}/100`,
          `${threats.length} active threats detected and being monitored`,
          `${vulnerabilities.criticalVulnerabilities} critical vulnerabilities require immediate attention`,
          `Compliance average: ${(compliance.reduce((sum, c) => sum + c.score, 0) / compliance.length).toFixed(1)}%`,
          `Mean time to detection: ${metrics.kpis.meanTimeToDetection} hours`
        ],
        recommendations: [
          'Prioritize patching of critical vulnerabilities',
          'Enhance threat detection capabilities',
          'Conduct security awareness training',
          'Review and update incident response procedures',
          'Implement additional compliance controls'
        ]
      };
    } catch (error) {
      this.logger.error(`Error getting security intelligence summary: ${error.message}`);
      throw error;
    }
  }

  // ==================== EXECUTIVE REPORTING ====================

  @Get(':tenantId/executive-report')
  async getExecutiveSecurityReport(@Param('tenantId') tenantId: string) {
    try {
      this.logger.log(`Generating executive security report for tenant: ${tenantId}`);

      const [dashboard, riskAssessment, metrics, compliance] = await Promise.all([
        this.advancedSecurityService.getSecurityDashboard(tenantId),
        this.advancedSecurityService.performRiskAssessment(tenantId),
        this.advancedSecurityService.getSecurityMetrics(tenantId),
        this.advancedSecurityService.getComplianceFrameworks(tenantId)
      ]);

      return {
        reportId: `exec-security-${Date.now()}`,
        generatedAt: new Date(),
        tenantId,
        executiveSummary: {
          securityPosture: dashboard.overallSecurityScore,
          riskLevel: riskAssessment.riskLevel,
          complianceStatus: compliance.every(c => c.status === 'compliant') ? 'compliant' : 'partial',
          keyMetrics: {
            meanTimeToDetection: metrics.kpis.meanTimeToDetection,
            meanTimeToResponse: metrics.kpis.meanTimeToResponse,
            incidentRate: metrics.kpis.securityIncidentRate,
            patchCompliance: metrics.kpis.patchComplianceRate
          }
        },
        riskOverview: {
          overallRisk: riskAssessment.overallRiskScore,
          topRisks: riskAssessment.riskCategories.slice(0, 3),
          businessImpact: riskAssessment.businessImpactAnalysis
        },
        securityInvestments: {
          currentSpend: 2500000, // Mock data
          recommendedSpend: 3200000,
          roi: {
            riskReduction: 35.7,
            costAvoidance: 8500000,
            efficiencyGains: 1200000
          }
        },
        complianceStatus: compliance.map(c => ({
          framework: c.name,
          status: c.status,
          score: c.score,
          nextAssessment: c.nextAssessment
        })),
        strategicRecommendations: [
          {
            priority: 'high',
            category: 'Technology',
            recommendation: 'Implement zero-trust architecture',
            businessJustification: 'Reduce breach risk by 60% and improve compliance posture',
            estimatedCost: 500000,
            timeline: '6-12 months'
          },
          {
            priority: 'high',
            category: 'Process',
            recommendation: 'Enhance incident response capabilities',
            businessJustification: 'Reduce mean time to resolution by 50%',
            estimatedCost: 200000,
            timeline: '3-6 months'
          },
          {
            priority: 'medium',
            category: 'People',
            recommendation: 'Expand security team and training',
            businessJustification: 'Improve security awareness and reduce human error',
            estimatedCost: 800000,
            timeline: '12 months'
          }
        ],
        nextSteps: [
          'Board presentation on security strategy',
          'Budget approval for recommended investments',
          'Quarterly security review implementation',
          'Executive security dashboard deployment'
        ]
      };
    } catch (error) {
      this.logger.error(`Error generating executive security report: ${error.message}`);
      throw error;
    }
  }
}