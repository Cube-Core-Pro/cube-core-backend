import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// ==========================
// Interfaces - Compliance
// ==========================

export interface ComplianceOverview {
  orgId: string;
  generatedAt: Date;
  status: 'compliant' | 'partially_compliant' | 'non_compliant';
  score: number; // 0-100
  frameworks: ComplianceFrameworkStatus[];
  audits: ComplianceAudit[];
  policies: CorporatePolicy[];
  certifications: WellnessCertification[];
  legalDocuments: LegalDocument[];
  regulatoryReports: RegulatoryReport[];
  upcomingDeadlines: ComplianceDeadline[];
}

export interface ComplianceFrameworkStatus {
  name: string; // e.g., 'OSHA', 'ISO 45001', 'WHO Healthy Workplace'
  version?: string;
  coveragePct: number; // % of controls implemented
  status: 'compliant' | 'partially_compliant' | 'non_compliant';
  controls: ComplianceControl[];
}

export interface ComplianceControl {
  id: string;
  title: string;
  description: string;
  implemented: boolean;
  evidenceRefs: string[];
  owner: string;
  lastReviewed: Date;
  nextReview: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ComplianceAudit {
  id: string;
  type: 'internal' | 'external' | 'regulatory';
  scope: string;
  date: Date;
  auditor: string;
  findings: AuditFinding[];
  score: number; // 0-100
  actions: RemediationAction[];
}

export interface AuditFinding {
  id: string;
  category: 'process' | 'technical' | 'documentation' | 'training' | 'governance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  statement: string;
  evidence: string[];
  relatedControls: string[];
}

export interface RemediationAction {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'completed' | 'deferred';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CorporatePolicy {
  id: string;
  title: string;
  category: 'health_safety' | 'wellness' | 'mental_health' | 'nutrition' | 'ergonomics' | 'privacy';
  version: string;
  effectiveDate: Date;
  lastReviewed: Date;
  owner: string;
  status: 'active' | 'draft' | 'archived';
  requiredTraining?: PolicyTraining;
}

export interface PolicyTraining {
  required: boolean;
  targetRoles: string[];
  completionRatePct: number;
  refresherIntervalMonths: number;
}

export interface WellnessCertification {
  id: string;
  name: string; // e.g., 'Great Place to Work - Wellness'
  issuer: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  obtainedDate?: Date;
  expirationDate?: Date;
  status: 'in_progress' | 'obtained' | 'expired';
  requirements: CertificationRequirement[];
}

export interface CertificationRequirement {
  id: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  evidenceRefs: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  type: 'policy' | 'procedure' | 'guideline' | 'contract' | 'waiver' | 'consent';
  version: string;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  storageRef: string; // pointer to DMS or blob store
}

export interface RegulatoryReport {
  id: string;
  name: string;
  authority: string; // e.g., Ministry of Labor
  frequency: 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
  period: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: Date;
  dueDate: Date;
  data: Record<string, any>;
}

export interface ComplianceDeadline {
  id: string;
  title: string;
  date: Date;
  relatedItem: string; // policy id, certification id, etc.
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

@Injectable()
export class CorporateWellnessComplianceService {
  private readonly logger = new Logger(CorporateWellnessComplianceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Vista general de cumplimiento corporativo en wellness
   */
  async getComplianceOverview(orgId: string): Promise<ComplianceOverview> {
    try {
      this.logger.log(`Building wellness compliance overview for org ${orgId}`);
      const frameworks = this.generateMockFrameworkStatuses();
      const audits = this.generateMockAudits();
      const policies = this.generateMockPolicies();
      const certifications = this.generateMockCertifications();
      const legalDocuments = this.generateMockLegalDocuments();
      const regulatoryReports = this.generateMockRegulatoryReports();
      const upcomingDeadlines = this.generateMockDeadlines();

      const score = Math.round(
        frameworks.reduce((acc, f) => acc + f.coveragePct, 0) / Math.max(1, frameworks.length)
      );

      const status: ComplianceOverview['status'] = score >= 85 ? 'compliant' : score >= 65 ? 'partially_compliant' : 'non_compliant';

      return {
        orgId,
        generatedAt: new Date(),
        status,
        score,
        frameworks,
        audits,
        policies,
        certifications,
        legalDocuments,
        regulatoryReports,
        upcomingDeadlines,
      };
    } catch (error) {
      this.logger.error(`Error building compliance overview:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta auditoría de cumplimiento (mock)
   */
  async runComplianceAudit(orgId: string, scope: string = 'wellness_programs'): Promise<ComplianceAudit> {
    try {
      this.logger.log(`Running compliance audit for org ${orgId} scope=${scope}`);
      const audit = this.generateMockAudits()[0];
      return audit;
    } catch (error) {
      this.logger.error(`Error running compliance audit:`, error);
      throw error;
    }
  }

  /**
   * Genera reporte regulatorio listo para envío
   */
  async generateRegulatoryReport(orgId: string, authority: string, period: string): Promise<RegulatoryReport> {
    try {
      this.logger.log(`Generating regulatory report for ${authority} period ${period}`);
      const report: RegulatoryReport = {
        id: `RR_${Date.now()}`,
        name: `Wellness Compliance - ${period}`,
        authority,
        frequency: 'annual',
        period,
        status: 'draft',
        dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
        data: {
          programCoveragePct: 72,
          incidentsReported: 0,
          trainingCompletionPct: 88,
          auditsThisPeriod: 2,
        },
      };
      return report;
    } catch (error) {
      this.logger.error(`Error generating regulatory report:`, error);
      throw error;
    }
  }

  /**
   * Registra/actualiza política corporativa de wellness
   */
  async upsertCorporatePolicy(policy: Partial<CorporatePolicy>): Promise<CorporatePolicy> {
    try {
      this.logger.log(`Upserting corporate policy: ${policy.title}`);
      return this.generateMockPolicies()[0];
    } catch (error) {
      this.logger.error(`Error upserting corporate policy:`, error);
      throw error;
    }
  }

  /**
   * Lista certificaciones y su estado
   */
  async listCertifications(orgId: string): Promise<WellnessCertification[]> {
    try {
      this.logger.log(`Listing wellness certifications for org ${orgId}`);
      return this.generateMockCertifications();
    } catch (error) {
      this.logger.error(`Error listing certifications:`, error);
      throw error;
    }
  }

  /**
   * Adjunta evidencia a control de cumplimiento (mock)
   */
  async attachEvidenceToControl(controlId: string, evidenceRef: string): Promise<void> {
    try {
      this.logger.log(`Attaching evidence to control ${controlId}: ${evidenceRef}`);
      // await this.prisma.complianceControl.update({ where: { id: controlId }, data: { evidenceRefs: { push: evidenceRef } } });
    } catch (error) {
      this.logger.error(`Error attaching evidence to control ${controlId}:`, error);
      throw error;
    }
  }

  // ==========================
  // Private mock generators
  // ==========================

  private generateMockFrameworkStatuses(): ComplianceFrameworkStatus[] {
    return [
      {
        name: 'OSHA (Occupational Safety and Health Administration)',
        version: '2024',
        coveragePct: 88,
        status: 'partially_compliant',
        controls: [
          {
            id: 'OSHA-WS-1',
            title: 'Ergonomic Risk Assessment',
            description: 'Regular ergonomic assessments for workstations',
            implemented: true,
            evidenceRefs: ['doc://assessments/ergonomics-q2-2025.pdf'],
            owner: 'Facilities',
            lastReviewed: new Date('2025-06-15'),
            nextReview: new Date('2025-12-15'),
            riskLevel: 'medium',
          },
        ],
      },
      {
        name: 'ISO 45001 (Occupational Health & Safety)',
        version: '2018',
        coveragePct: 82,
        status: 'partially_compliant',
        controls: [
          {
            id: 'ISO-45001-7.2',
            title: 'Competence & Training',
            description: 'Ensure training for wellness and safety procedures',
            implemented: false,
            evidenceRefs: [],
            owner: 'HR',
            lastReviewed: new Date('2025-08-20'),
            nextReview: new Date('2025-11-20'),
            riskLevel: 'high',
          },
        ],
      },
    ];
  }

  private generateMockAudits(): ComplianceAudit[] {
    return [
      {
        id: `AUD_${Date.now()}`,
        type: 'internal',
        scope: 'wellness_programs',
        date: new Date(),
        auditor: 'Internal Compliance Team',
        findings: [
          {
            id: 'F1',
            category: 'documentation',
            severity: 'medium',
            statement: 'Missing evidence for training completion in Q2',
            evidence: ['sys://lms/export-q2.csv'],
            relatedControls: ['ISO-45001-7.2'],
          },
        ],
        score: 84,
        actions: [
          {
            id: 'A1',
            title: 'Consolidate training records',
            description: 'Centralize LMS exports and link to compliance controls',
            owner: 'HR Ops',
            dueDate: new Date(Date.now() + 21 * 24 * 3600 * 1000),
            status: 'in_progress',
            priority: 'high',
          },
        ],
      },
    ];
  }

  private generateMockPolicies(): CorporatePolicy[] {
    return [
      {
        id: 'POL-WS-001',
        title: 'Workplace Wellness Policy',
        category: 'wellness',
        version: '2.1',
        effectiveDate: new Date('2024-03-01'),
        lastReviewed: new Date('2025-08-01'),
        owner: 'HR',
        status: 'active',
        requiredTraining: {
          required: true,
          targetRoles: ['All Employees'],
          completionRatePct: 88,
          refresherIntervalMonths: 12,
        },
      },
    ];
  }

  private generateMockCertifications(): WellnessCertification[] {
    return [
      {
        id: 'CERT-GPTW-WELLNESS',
        name: 'Great Place to Work - Wellness',
        issuer: 'GPTW',
        level: 'gold',
        obtainedDate: new Date('2025-05-15'),
        expirationDate: new Date('2026-05-15'),
        status: 'obtained',
        requirements: [
          { id: 'R1', description: 'Employee wellness participation > 60%', status: 'completed', evidenceRefs: ['db://metrics/participation'] },
          { id: 'R2', description: 'Annual mental health training', status: 'completed', evidenceRefs: ['lms://course/mental-health-2025'] },
        ],
      },
    ];
  }

  private generateMockLegalDocuments(): LegalDocument[] {
    return [
      {
        id: 'DOC-PRIV-001',
        title: 'Employee Wellness Data Privacy Policy',
        type: 'policy',
        version: '1.3',
        createdAt: new Date('2024-07-01'),
        updatedAt: new Date('2025-08-10'),
        owner: 'Legal',
        storageRef: 'dms://policies/privacy-wellness-v1.3.pdf',
      },
    ];
  }

  private generateMockRegulatoryReports(): RegulatoryReport[] {
    return [
      {
        id: 'RR-2024-ANNUAL',
        name: 'Annual Wellness Compliance Submission',
        authority: 'Ministry of Labor',
        frequency: 'annual',
        period: '2024',
        status: 'accepted',
        submittedAt: new Date('2025-01-31'),
        dueDate: new Date('2025-01-31'),
        data: { trainingCompletionPct: 86, incidentsReported: 0 },
      },
    ];
  }

  private generateMockDeadlines(): ComplianceDeadline[] {
    return [
      {
        id: 'DL-TRAIN-REFRESH',
        title: 'Annual Wellness Training Refresher',
        date: new Date(Date.now() + 45 * 24 * 3600 * 1000),
        relatedItem: 'POL-WS-001',
        priority: 'high',
      },
    ];
  }
}
