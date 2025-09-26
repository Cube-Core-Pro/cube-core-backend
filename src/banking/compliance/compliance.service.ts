// path: src/banking/compliance/compliance.service.ts
// purpose: Banking Compliance Service - KYC/AML compliance management
// dependencies: Prisma, NestJS, compliance frameworks, regulatory reporting

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateKycProfileDto,
  UpdateKycProfileDto,
  CreateKycCheckDto,
  CreateAmlAlertDto,
  UpdateAmlAlertDto,
  CreateComplianceDocumentDto,
  CreateRegulatoryReportDto,
  KycCheckType,
  KycCheckStatus,
  RiskLevel,
  AmlAlertStatus,
  AmlAlertType,
  AmlAlertSeverity,
  CustomerType,
  KycStatus,
  ComplianceDocumentStatus,
  ComplianceDocumentType,
  RegulatoryReportStatus
} from './dto';
import { Prisma, KycProfile, KycCheck, AmlAlert, ComplianceDocument, RegulatoryReport } from '@prisma/client';

export interface ComplianceAssessmentResult {
  profileId: string;
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  completedChecks: number;
  totalChecks: number;
  missingDocuments: string[];
  recommendations: string[];
  nextReviewDate: Date;
}

export interface KycCheckResult {
  checkType: string;
  status: 'PASSED' | 'FAILED' | 'PENDING' | 'EXPIRED';
  score: number;
  details: any;
  expiresAt?: Date;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // KYC PROFILE MANAGEMENT
  // ============================================================================

  async createKycProfile(createKycProfileDto: CreateKycProfileDto, tenantId: string): Promise<KycProfile> {
    // Check if profile already exists for customer
    const existingProfile = await this.prisma.kycProfile.findFirst({
      where: {
        customerId: createKycProfileDto.customerId,
        tenantId
      }
    });

    if (existingProfile) {
      throw new BadRequestException('KYC profile already exists for this customer');
    }

    const {
      customerId,
      customerType,
      status,
      riskLevel,
      complianceScore,
      jurisdiction,
      lastReviewDate,
      nextReviewDate,
      completedChecks,
      totalChecks,
      submittedDocuments,
      requiredDocuments
    } = createKycProfileDto;

    const data: Prisma.KycProfileCreateInput = {
      customerId,
      tenantId,
      customerType: customerType ?? CustomerType.INDIVIDUAL,
      status: status ?? KycStatus.PENDING,
      riskLevel: riskLevel ?? RiskLevel.MEDIUM,
      verificationLevel: 'basic',
      complianceScore: complianceScore ?? 0,
      jurisdiction,
      requiredDocuments: requiredDocuments ?? 0,
      submittedDocuments: submittedDocuments ?? 0,
      completedChecks: completedChecks ?? 0,
      totalChecks: totalChecks ?? 0,
      lastReviewDate,
      nextReviewDate: nextReviewDate ?? this.calculateNextReviewDate((riskLevel ?? RiskLevel.MEDIUM) as string, lastReviewDate),
      reviewDue: false
    };

    return this.prisma.kycProfile.create({ data });
  }

  async getKycProfiles(tenantId: string, filters?: {
    status?: string;
    riskLevel?: string;
    customerType?: string;
    jurisdiction?: string;
    reviewDue?: boolean;
  }): Promise<KycProfile[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.riskLevel) where.riskLevel = filters.riskLevel;
      if (filters.customerType) where.customerType = filters.customerType;
      if (filters.jurisdiction) where.jurisdiction = filters.jurisdiction;
      if (filters.reviewDue) {
        where.nextReviewDate = {
          lte: new Date()
        };
      }
    }

    return this.prisma.kycProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getKycProfile(id: string, tenantId: string): Promise<KycProfile> {
    const profile = await this.prisma.kycProfile.findFirst({
      where: { id, tenantId }
    });

    if (!profile) {
      throw new NotFoundException('KYC profile not found');
    }

    return profile;
  }

  async getKycProfileByCustomer(customerId: string, tenantId: string): Promise<KycProfile | null> {
    return this.prisma.kycProfile.findFirst({
      where: { customerId, tenantId }
    });
  }

  async updateKycProfile(id: string, updateKycProfileDto: UpdateKycProfileDto, tenantId: string): Promise<KycProfile> {
    const profile = await this.getKycProfile(id, tenantId);

    return this.prisma.kycProfile.update({
      where: { id: profile.id },
      data: updateKycProfileDto
    });
  }

  async deleteKycProfile(id: string, tenantId: string): Promise<void> {
    const profile = await this.getKycProfile(id, tenantId);

    await this.prisma.kycProfile.delete({
      where: { id: profile.id }
    });
  }

  // ============================================================================
  // KYC CHECKS MANAGEMENT
  // ============================================================================

  async createKycCheck(createKycCheckDto: CreateKycCheckDto, tenantId: string): Promise<KycCheck> {
    // Verify profile exists
    await this.getKycProfile(createKycCheckDto.profileId, tenantId);

    const data: Prisma.KycCheckCreateInput = {
      profileId: createKycCheckDto.profileId,
      tenantId,
      type: createKycCheckDto.checkType,
      checkType: createKycCheckDto.checkType,
      status: createKycCheckDto.status ?? KycCheckStatus.PENDING,
      provider: 'internal',
      details: (createKycCheckDto.result ?? {}) as Prisma.InputJsonValue,
      performedAt: createKycCheckDto.performedAt ?? new Date(),
      performedBy: createKycCheckDto.performedBy,
      expiresAt: createKycCheckDto.expiresAt
    };

    const check = await this.prisma.kycCheck.create({ data });

    // Update profile statistics
    await this.updateProfileStatistics(createKycCheckDto.profileId, tenantId);

    return check;
  }

  async getKycChecks(profileId: string, tenantId: string): Promise<KycCheck[]> {
    // Verify profile exists
    await this.getKycProfile(profileId, tenantId);

    return this.prisma.kycCheck.findMany({
      where: { profileId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getKycCheck(id: string, tenantId: string): Promise<KycCheck> {
    const check = await this.prisma.kycCheck.findFirst({
      where: { id, tenantId }
    });

    if (!check) {
      throw new NotFoundException('KYC check not found');
    }

    return check;
  }

  async updateKycCheck(id: string, updateData: Partial<KycCheck>, tenantId: string): Promise<KycCheck> {
    const check = await this.getKycCheck(id, tenantId);

    const updatedCheck = await this.prisma.kycCheck.update({
      where: { id: check.id },
      data: updateData
    });

    // Update profile statistics
    await this.updateProfileStatistics(check.profileId, tenantId);

    return updatedCheck;
  }

  async performKycCheck(profileId: string, checkType: string, tenantId: string): Promise<KycCheckResult> {
    this.logger.log(`Performing KYC check: ${checkType} for profile ${profileId}`);

    const profile = await this.getKycProfile(profileId, tenantId);
    
    let result: KycCheckResult;

    switch (checkType) {
      case 'IDENTITY_VERIFICATION':
        result = await this.performIdentityVerification(profile);
        break;
      case 'ADDRESS_VERIFICATION':
        result = await this.performAddressVerification(profile);
        break;
      case 'DOCUMENT_VERIFICATION':
        result = await this.performDocumentVerification(profile);
        break;
      case 'PEP_SCREENING':
        result = await this.performPepScreening(profile);
        break;
      case 'SANCTIONS_SCREENING':
        result = await this.performSanctionsScreening(profile);
        break;
      case 'ADVERSE_MEDIA_SCREENING':
        result = await this.performAdverseMediaScreening(profile);
        break;
      case 'SOURCE_OF_FUNDS':
        result = await this.performSourceOfFundsCheck(profile);
        break;
      default:
        throw new BadRequestException(`Unknown check type: ${checkType}`);
    }

    // Save check result
    await this.createKycCheck({
      profileId,
      checkType: checkType as KycCheckType,
      status: result.status as KycCheckStatus,
      result: result.details,
      performedAt: new Date(),
      expiresAt: result.expiresAt
    }, tenantId);

    return result;
  }

  private async performIdentityVerification(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation - in production, integrate with identity verification service
    const score = Math.random() * 100;
    const status = score > 70 ? 'PASSED' : score > 40 ? 'PENDING' : 'FAILED';

    return {
      checkType: 'IDENTITY_VERIFICATION',
      status: status as any,
      score,
      details: {
        documentType: 'PASSPORT',
        documentNumber: 'REDACTED',
        verificationMethod: 'AUTOMATED',
        confidence: score,
        issues: score < 70 ? ['Document quality issues'] : []
      },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };
  }

  private async performAddressVerification(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation
    const score = Math.random() * 100;
    const status = score > 60 ? 'PASSED' : 'FAILED';

    return {
      checkType: 'ADDRESS_VERIFICATION',
      status: status as any,
      score,
      details: {
        method: 'UTILITY_BILL',
        addressMatch: score > 60,
        confidence: score
      },
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
    };
  }

  private async performDocumentVerification(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation
    const score = Math.random() * 100;
    const status = score > 75 ? 'PASSED' : 'FAILED';

    return {
      checkType: 'DOCUMENT_VERIFICATION',
      status: status as any,
      score,
      details: {
        documentsVerified: ['ID_DOCUMENT', 'PROOF_OF_ADDRESS'],
        authenticity: score > 75,
        readability: score > 60,
        completeness: score > 80
      }
    };
  }

  private async performPepScreening(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation - in production, integrate with PEP database
    const isPep = Math.random() < 0.05; // 5% chance of being PEP
    const score = isPep ? 100 : 0;

    return {
      checkType: 'PEP_SCREENING',
      status: isPep ? 'FAILED' : 'PASSED',
      score,
      details: {
        isPep,
        matches: isPep ? [{
          name: 'Sample PEP',
          position: 'Government Official',
          country: 'XX',
          confidence: 95
        }] : [],
        lastScreened: new Date()
      },
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 3 months
    };
  }

  private async performSanctionsScreening(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation - in production, integrate with sanctions lists
    const isSanctioned = Math.random() < 0.01; // 1% chance
    const score = isSanctioned ? 100 : 0;

    return {
      checkType: 'SANCTIONS_SCREENING',
      status: isSanctioned ? 'FAILED' : 'PASSED',
      score,
      details: {
        isSanctioned,
        listsChecked: ['OFAC', 'UN', 'EU', 'HMT'],
        matches: isSanctioned ? [{
          list: 'OFAC',
          name: 'Sample Sanctioned Entity',
          confidence: 98
        }] : [],
        lastScreened: new Date()
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month
    };
  }

  private async performAdverseMediaScreening(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation
    const hasAdverseMedia = Math.random() < 0.1; // 10% chance
    const score = hasAdverseMedia ? 60 : 0;

    return {
      checkType: 'ADVERSE_MEDIA_SCREENING',
      status: hasAdverseMedia ? 'PENDING' : 'PASSED',
      score,
      details: {
        hasAdverseMedia,
        articles: hasAdverseMedia ? [{
          title: 'Sample Adverse Article',
          source: 'News Source',
          date: new Date(),
          relevance: 'HIGH'
        }] : [],
        lastScreened: new Date()
      },
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 2 months
    };
  }

  private async performSourceOfFundsCheck(_profile: KycProfile): Promise<KycCheckResult> {
    // Mock implementation
    const score = Math.random() * 100;
    const status = score > 70 ? 'PASSED' : 'PENDING';

    return {
      checkType: 'SOURCE_OF_FUNDS',
      status: status as any,
      score,
      details: {
        sourceVerified: score > 70,
        sourceType: 'EMPLOYMENT',
        documentation: score > 70 ? 'COMPLETE' : 'INCOMPLETE',
        riskAssessment: score > 80 ? 'LOW' : score > 50 ? 'MEDIUM' : 'HIGH'
      }
    };
  }

  // ============================================================================
  // COMPLIANCE ASSESSMENT
  // ============================================================================

  async performComplianceAssessment(profileId: string, tenantId: string): Promise<ComplianceAssessmentResult> {
    const profile = await this.getKycProfile(profileId, tenantId);
    const checks = await this.getKycChecks(profileId, tenantId);
    const documents = await this.getComplianceDocuments(profile.customerId, tenantId);

    // Calculate overall score
    const passedChecks = checks.filter(c => c.status === 'PASSED');
    const completedChecks = checks.filter(c => c.status !== 'PENDING');
    const totalRequiredChecks = this.getRequiredChecksForCustomerType(profile.customerType);

    let overallScore = 0;
    if (completedChecks.length > 0) {
      overallScore = (passedChecks.length / totalRequiredChecks.length) * 100;
    }

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(overallScore, profile, checks);

    // Find missing documents
    const requiredDocuments = this.getRequiredDocumentsForCustomerType(profile.customerType);
    const submittedDocumentTypes = documents.map(d => d.documentType);
    const missingDocuments = requiredDocuments.filter(d => !submittedDocumentTypes.includes(d));

    // Generate recommendations
    const recommendations = this.generateRecommendations(profile, checks, missingDocuments);

    // Calculate next review date
    const nextReviewDate = this.calculateNextReviewDate(riskLevel, profile.lastReviewDate);

    // Update profile
    await this.updateKycProfile(profileId, {
      complianceScore: Math.round(overallScore),
      riskLevel: riskLevel as RiskLevel,
      completedChecks: completedChecks.length,
      totalChecks: totalRequiredChecks.length,
      submittedDocuments: documents.length,
      requiredDocuments: requiredDocuments.length,
      nextReviewDate,
      lastReviewDate: new Date()
    }, tenantId);

    return {
      profileId,
      overallScore: Math.round(overallScore),
      riskLevel,
      completedChecks: completedChecks.length,
      totalChecks: totalRequiredChecks.length,
      missingDocuments,
      recommendations,
      nextReviewDate
    };
  }

  private getRequiredChecksForCustomerType(customerType: string): string[] {
    const baseChecks = [
      'IDENTITY_VERIFICATION',
      'ADDRESS_VERIFICATION',
      'DOCUMENT_VERIFICATION',
      'PEP_SCREENING',
      'SANCTIONS_SCREENING'
    ];

    if (customerType === 'BUSINESS') {
      return [
        ...baseChecks,
        'BUSINESS_REGISTRATION',
        'BENEFICIAL_OWNERSHIP',
        'ADVERSE_MEDIA_SCREENING'
      ];
    }

    return baseChecks;
  }

  private getRequiredDocumentsForCustomerType(customerType: string): string[] {
    const baseDocuments = [
      'ID_DOCUMENT',
      'PROOF_OF_ADDRESS'
    ];

    if (customerType === 'BUSINESS') {
      return [
        ...baseDocuments,
        'BUSINESS_REGISTRATION',
        'ARTICLES_OF_INCORPORATION',
        'BENEFICIAL_OWNERSHIP_DECLARATION'
      ];
    }

    return baseDocuments;
  }

  private calculateRiskLevel(score: number, profile: KycProfile, checks: KycCheck[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Check for critical failures
    const criticalChecks = ['SANCTIONS_SCREENING', 'PEP_SCREENING'];
    const failedCriticalChecks = checks.filter(c => 
      criticalChecks.includes(c.checkType) && c.status === 'FAILED'
    );

    if (failedCriticalChecks.length > 0) {
      return 'CRITICAL';
    }

    if (score >= 90) return 'LOW';
    if (score >= 70) return 'MEDIUM';
    if (score >= 50) return 'HIGH';
    return 'CRITICAL';
  }

  private generateRecommendations(profile: KycProfile, checks: KycCheck[], missingDocuments: string[]): string[] {
    const recommendations: string[] = [];

    if (missingDocuments.length > 0) {
      recommendations.push(`Submit missing documents: ${missingDocuments.join(', ')}`);
    }

    const failedChecks = checks.filter(c => c.status === 'FAILED');
    if (failedChecks.length > 0) {
      recommendations.push(`Address failed checks: ${failedChecks.map(c => c.checkType).join(', ')}`);
    }

    const expiredChecks = checks.filter(c => 
      c.expiresAt && c.expiresAt < new Date()
    );
    if (expiredChecks.length > 0) {
      recommendations.push(`Renew expired checks: ${expiredChecks.map(c => c.checkType).join(', ')}`);
    }

    if (profile.riskLevel === 'HIGH' || profile.riskLevel === 'CRITICAL') {
      recommendations.push('Enhanced due diligence required');
    }

    return recommendations;
  }

  private calculateNextReviewDate(riskLevel: string, _lastReviewDate?: Date): Date {
    const now = new Date();
    let monthsToAdd: number;

    switch (riskLevel) {
      case 'CRITICAL':
        monthsToAdd = 3; // 3 months
        break;
      case 'HIGH':
        monthsToAdd = 6; // 6 months
        break;
      case 'MEDIUM':
        monthsToAdd = 12; // 1 year
        break;
      case 'LOW':
        monthsToAdd = 24; // 2 years
        break;
      default:
        monthsToAdd = 12;
    }

    const nextReview = new Date(now);
    nextReview.setMonth(nextReview.getMonth() + monthsToAdd);
    return nextReview;
  }

  private async updateProfileStatistics(profileId: string, tenantId: string): Promise<void> {
    const checks = await this.getKycChecks(profileId, tenantId);
    const completedChecks = checks.filter(c => c.status !== 'PENDING').length;
    const profile = await this.getKycProfile(profileId, tenantId);
    const totalChecks = this.getRequiredChecksForCustomerType(profile.customerType).length;

    await this.updateKycProfile(profileId, {
      completedChecks,
      totalChecks
    }, tenantId);
  }

  // ============================================================================
  // AML ALERTS MANAGEMENT
  // ============================================================================

  async createAmlAlert(createAmlAlertDto: CreateAmlAlertDto, tenantId: string): Promise<AmlAlert> {
    const data: Prisma.AmlAlertCreateInput = {
      tenantId,
      customerId: createAmlAlertDto.customerId,
      type: createAmlAlertDto.alertType ?? AmlAlertType.SUSPICIOUS_TRANSACTION,
      severity: createAmlAlertDto.severity ?? AmlAlertSeverity.MEDIUM,
      status: createAmlAlertDto.status ?? AmlAlertStatus.OPEN,
      description: createAmlAlertDto.description,
      details: {},
      assignedTo: createAmlAlertDto.assignedTo,
      resolution: createAmlAlertDto.resolution,
      resolvedAt: createAmlAlertDto.resolvedAt
    };

    return this.prisma.amlAlert.create({ data });
  }

  async getAmlAlerts(tenantId: string, filters?: {
    status?: string;
    severity?: string;
    alertType?: string;
    customerId?: string;
    assignedTo?: string;
  }): Promise<AmlAlert[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.severity) where.severity = filters.severity;
      if (filters.alertType) where.type = filters.alertType;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    }

    return this.prisma.amlAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAmlAlert(id: string, tenantId: string): Promise<AmlAlert> {
    const alert = await this.prisma.amlAlert.findFirst({
      where: { id, tenantId }
    });

    if (!alert) {
      throw new NotFoundException('AML alert not found');
    }

    return alert;
  }

  async updateAmlAlert(id: string, updateAmlAlertDto: UpdateAmlAlertDto, tenantId: string): Promise<AmlAlert> {
    const alert = await this.getAmlAlert(id, tenantId);

    return this.prisma.amlAlert.update({
      where: { id: alert.id },
      data: updateAmlAlertDto
    });
  }

  async resolveAmlAlert(id: string, resolution: string, resolvedBy: string, tenantId: string): Promise<AmlAlert> {
    return this.updateAmlAlert(id, {
      status: AmlAlertStatus.RESOLVED,
      resolution,
      resolvedAt: new Date()
    }, tenantId);
  }

  // ============================================================================
  // COMPLIANCE DOCUMENTS MANAGEMENT
  // ============================================================================

  async createComplianceDocument(createComplianceDocumentDto: CreateComplianceDocumentDto, tenantId: string): Promise<ComplianceDocument> {
    const data: Prisma.ComplianceDocumentCreateInput = {
      tenantId,
      customerId: createComplianceDocumentDto.customerId,
      documentType: createComplianceDocumentDto.documentType,
      filename: createComplianceDocumentDto.filename,
      fileSize: createComplianceDocumentDto.fileSize,
      mimeType: createComplianceDocumentDto.mimeType,
      status: createComplianceDocumentDto.status ?? ComplianceDocumentStatus.PENDING,
      verifiedAt: createComplianceDocumentDto.verifiedAt,
      verifiedBy: createComplianceDocumentDto.verifiedBy,
      expiresAt: createComplianceDocumentDto.expiresAt,
      type: 'document',
      title: this.buildComplianceDocumentTitle(createComplianceDocumentDto),
      tags: []
    };

    return this.prisma.complianceDocument.create({ data });
  }

  async getComplianceDocuments(customerId: string, tenantId: string): Promise<ComplianceDocument[]> {
    return this.prisma.complianceDocument.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getComplianceDocument(id: string, tenantId: string): Promise<ComplianceDocument> {
    const document = await this.prisma.complianceDocument.findFirst({
      where: { id, tenantId }
    });

    if (!document) {
      throw new NotFoundException('Compliance document not found');
    }

    return document;
  }

  async updateComplianceDocument(id: string, updateData: Partial<ComplianceDocument>, tenantId: string): Promise<ComplianceDocument> {
    const document = await this.getComplianceDocument(id, tenantId);

    return this.prisma.complianceDocument.update({
      where: { id: document.id },
      data: updateData
    });
  }

  async verifyComplianceDocument(id: string, verifiedBy: string, tenantId: string): Promise<ComplianceDocument> {
    return this.updateComplianceDocument(id, {
      status: 'VERIFIED',
      verifiedBy,
      verifiedAt: new Date()
    }, tenantId);
  }

  // ============================================================================
  // REGULATORY REPORTING
  // ============================================================================

  async createRegulatoryReport(createRegulatoryReportDto: CreateRegulatoryReportDto, tenantId: string): Promise<RegulatoryReport> {
    const {
      submittedTo,
      reportData,
      status,
      submittedAt,
      ...rest
    } = createRegulatoryReportDto;

    const data: Prisma.RegulatoryReportCreateInput = {
      ...rest,
      tenantId,
      reportData: reportData as Prisma.InputJsonValue,
      status: status ?? RegulatoryReportStatus.DRAFT,
      submittedAt,
      submittedTo
    };

    return this.prisma.regulatoryReport.create({ data });
  }

  async getRegulatoryReports(tenantId: string, filters?: {
    reportType?: string;
    status?: string;
    reportPeriod?: string;
  }): Promise<RegulatoryReport[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.reportType) where.reportType = filters.reportType;
      if (filters.status) where.status = filters.status;
      if (filters.reportPeriod) where.reportPeriod = filters.reportPeriod;
    }

    return this.prisma.regulatoryReport.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRegulatoryReport(id: string, tenantId: string): Promise<RegulatoryReport> {
    const report = await this.prisma.regulatoryReport.findFirst({
      where: { id, tenantId }
    });

    if (!report) {
      throw new NotFoundException('Regulatory report not found');
    }

    return report;
  }

  async updateRegulatoryReport(id: string, updateData: Partial<RegulatoryReport>, tenantId: string): Promise<RegulatoryReport> {
    const report = await this.getRegulatoryReport(id, tenantId);

    return this.prisma.regulatoryReport.update({
      where: { id: report.id },
      data: updateData
    });
  }

  async submitRegulatoryReport(id: string, submittedTo: string, tenantId: string): Promise<RegulatoryReport> {
    return this.updateRegulatoryReport(id, {
      status: RegulatoryReportStatus.SUBMITTED,
      submittedTo,
      submittedAt: new Date()
    }, tenantId);
  }

  private buildComplianceDocumentTitle(dto: CreateComplianceDocumentDto): string {
    if (dto.filename) {
      return dto.filename;
    }

    return dto.documentType ?? ComplianceDocumentType.OTHER;
  }

  // ============================================================================
  // TOKENIZATION COMPLIANCE SUPPORT
  // ============================================================================

  async validateTokenCreation(
    tenantId: string,
    request: { name: string; symbol: string; blockchain: string }
  ): Promise<void> {
    const existingToken = await this.prisma.blockchainToken.findFirst({
      where: {
        tenantId,
        symbol: request.symbol,
        blockchain: request.blockchain
      }
    });

    if (existingToken) {
      throw new BadRequestException('Token with this symbol already exists on the selected blockchain');
    }
  }
}
