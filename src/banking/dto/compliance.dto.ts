// path: src/banking/dto/compliance.dto.ts
// purpose: Compliance DTOs - KYC/AML/regulatory compliance request/response types
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

export enum KycStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  PROHIBITED = 'PROHIBITED'
}

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS'
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  UTILITY_BILL = 'UTILITY_BILL',
  BANK_STATEMENT = 'BANK_STATEMENT',
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  ARTICLES_OF_INCORPORATION = 'ARTICLES_OF_INCORPORATION',
  TAX_DOCUMENT = 'TAX_DOCUMENT',
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS'
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum KycCheckType {
  IDENTITY = 'IDENTITY',
  ADDRESS = 'ADDRESS',
  SANCTIONS = 'SANCTIONS',
  PEP = 'PEP',
  ADVERSE_MEDIA = 'ADVERSE_MEDIA',
  CREDIT = 'CREDIT',
  BUSINESS_VERIFICATION = 'BUSINESS_VERIFICATION'
}

export enum CheckStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW'
}

export enum AmlAlertType {
  SANCTIONS_MATCH = 'SANCTIONS_MATCH',
  PEP_MATCH = 'PEP_MATCH',
  ADVERSE_MEDIA = 'ADVERSE_MEDIA',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  HIGH_RISK_JURISDICTION = 'HIGH_RISK_JURISDICTION'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

export enum ReportType {
  SAR = 'SAR',
  CTR = 'CTR',
  OFAC = 'OFAC',
  KYC_SUMMARY = 'KYC_SUMMARY',
  TRANSACTION_MONITORING = 'TRANSACTION_MONITORING'
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED'
}

// ============================================================================
// KYC PROFILE DTOs
// ============================================================================

export class CreateKycProfileDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Customer type', enum: CustomerType })
  @IsEnum(CustomerType)
  customerType: CustomerType;

  @ApiProperty({ description: 'Jurisdiction (country code)' })
  @IsString()
  jurisdiction: string;

  @ApiPropertyOptional({ description: 'Initial risk level', enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  initialRiskLevel?: RiskLevel;
}

export class KycProfileDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'KYC status', enum: KycStatus })
  @IsEnum(KycStatus)
  status: KycStatus;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Completed KYC checks' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycCheckDto)
  completedChecks: KycCheckDto[];

  @ApiProperty({ description: 'Required documents' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentRequirementDto)
  requiredDocuments: DocumentRequirementDto[];

  @ApiProperty({ description: 'Submitted documents' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmittedDocumentDto)
  submittedDocuments: SubmittedDocumentDto[];

  @ApiProperty({ description: 'Compliance score (0-100)' })
  @IsNumber()
  complianceScore: number;

  @ApiProperty({ description: 'Last review date' })
  @IsDateString()
  lastReviewDate: string;

  @ApiProperty({ description: 'Next review date' })
  @IsDateString()
  nextReviewDate: string;

  @ApiPropertyOptional({ description: 'Reviewed by user ID' })
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiProperty({ description: 'Review notes' })
  @IsArray()
  @IsString({ each: true })
  notes: string[];

  @ApiProperty({ description: 'Jurisdiction' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Customer type', enum: CustomerType })
  @IsEnum(CustomerType)
  customerType: CustomerType;
}

// ============================================================================
// KYC CHECK DTOs
// ============================================================================

export class KycCheckDto {
  @ApiProperty({ description: 'Check type', enum: KycCheckType })
  @IsEnum(KycCheckType)
  type: KycCheckType;

  @ApiProperty({ description: 'Check status', enum: CheckStatus })
  @IsEnum(CheckStatus)
  status: CheckStatus;

  @ApiProperty({ description: 'Provider used for check' })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Check result data' })
  result: any;

  @ApiProperty({ description: 'Check timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Check expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class PerformKycCheckDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Check type', enum: KycCheckType })
  @IsEnum(KycCheckType)
  checkType: KycCheckType;

  @ApiPropertyOptional({ description: 'Preferred provider' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ description: 'Customer data for verification' })
  customerData: any;
}

// ============================================================================
// DOCUMENT DTOs
// ============================================================================

export class DocumentRequirementDto {
  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({ description: 'Whether document is required' })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: 'Document description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Accepted file formats' })
  @IsArray()
  @IsString({ each: true })
  acceptedFormats: string[];

  @ApiProperty({ description: 'Maximum file size in MB' })
  @IsNumber()
  maxSizeMB: number;
}

export class SubmittedDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Upload date' })
  @IsDateString()
  uploadDate: string;

  @ApiProperty({ description: 'Verification status', enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  verificationStatus: DocumentStatus;

  @ApiPropertyOptional({ description: 'Verification result' })
  @IsOptional()
  verificationResult?: any;

  @ApiPropertyOptional({ description: 'Document expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class SubmitDocumentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'Filename' })
  @IsString()
  filename: string;

  @ApiPropertyOptional({ description: 'Document expiry date' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class VerifyDocumentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Document ID' })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({ description: 'Verification provider' })
  @IsOptional()
  @IsString()
  provider?: string;
}

// ============================================================================
// AML ALERT DTOs
// ============================================================================

export class AmlAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Alert type', enum: AmlAlertType })
  @IsEnum(AmlAlertType)
  alertType: AmlAlertType;

  @ApiProperty({ description: 'Alert severity', enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Alert details' })
  details: any;

  @ApiProperty({ description: 'Alert status', enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiProperty({ description: 'Alert creation date' })
  @IsDateString()
  createdDate: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Resolution description' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ description: 'Resolution date' })
  @IsOptional()
  @IsDateString()
  resolutionDate?: string;
}

export class UpdateAlertStatusDto {
  @ApiProperty({ description: 'New alert status', enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Resolution description' })
  @IsOptional()
  @IsString()
  resolution?: string;
}

// ============================================================================
// SCREENING DTOs
// ============================================================================

export class CustomerDataDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Nationality' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Address information' })
  @IsOptional()
  address?: any;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class PerformScreeningDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Customer data for screening' })
  @ValidateNested()
  @Type(() => CustomerDataDto)
  customerData: CustomerDataDto;

  @ApiPropertyOptional({ description: 'Screening types to perform' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  screeningTypes?: string[];
}

export class ScreeningResultDto {
  @ApiProperty({ description: 'Screening type' })
  @IsString()
  screeningType: string;

  @ApiProperty({ description: 'Number of matches found' })
  @IsNumber()
  matchCount: number;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  riskScore: number;

  @ApiProperty({ description: 'Screening results' })
  results: any;

  @ApiProperty({ description: 'Screening timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Requires manual review' })
  @IsBoolean()
  requiresReview: boolean;
}

// ============================================================================
// REPORTING DTOs
// ============================================================================

export class ComplianceReportDto {
  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ description: 'Report generation date' })
  @IsDateString()
  generatedDate: string;

  @ApiProperty({ description: 'Reporting period' })
  @ValidateNested()
  @Type(() => ReportingPeriodDto)
  reportingPeriod: ReportingPeriodDto;

  @ApiProperty({ description: 'Report data' })
  data: any;

  @ApiProperty({ description: 'Report status', enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'Submitted by user ID' })
  @IsOptional()
  @IsString()
  submittedBy?: string;

  @ApiPropertyOptional({ description: 'Submission date' })
  @IsOptional()
  @IsDateString()
  submissionDate?: string;

  @ApiPropertyOptional({ description: 'Regulatory reference number' })
  @IsOptional()
  @IsString()
  regulatoryReference?: string;
}

export class ReportingPeriodDto {
  @ApiProperty({ description: 'Period start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Period end date' })
  @IsDateString()
  endDate: string;
}

export class GenerateSarDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Suspicious activity details' })
  suspiciousActivity: any;

  @ApiProperty({ description: 'Reporting officer ID' })
  @IsString()
  reportingOfficer: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateCtrDto {
  @ApiProperty({ description: 'Transactions to report' })
  @IsArray()
  transactions: any[];

  @ApiProperty({ description: 'Reporting period' })
  @ValidateNested()
  @Type(() => ReportingPeriodDto)
  reportingPeriod: ReportingPeriodDto;

  @ApiProperty({ description: 'Reporting officer ID' })
  @IsString()
  reportingOfficer: string;
}

// ============================================================================
// STATISTICS DTOs
// ============================================================================

export class ComplianceStatisticsDto {
  @ApiProperty({ description: 'KYC profiles statistics' })
  kycProfiles: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };

  @ApiProperty({ description: 'AML alerts statistics' })
  amlAlerts: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    falsePositives: number;
  };

  @ApiProperty({ description: 'Reports statistics' })
  reports: {
    sars: number;
    ctrs: number;
    ofacReports: number;
  };

  @ApiProperty({ description: 'Risk distribution' })
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    prohibited: number;
  };

  @ApiProperty({ description: 'Statistics period' })
  @ValidateNested()
  @Type(() => ReportingPeriodDto)
  period: ReportingPeriodDto;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class GetKycProfilesQueryDto {
  @ApiPropertyOptional({ description: 'KYC status filter', enum: KycStatus })
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @ApiPropertyOptional({ description: 'Risk level filter', enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Customer type filter', enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({ description: 'Jurisdiction filter' })
  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @ApiPropertyOptional({ description: 'Number of results to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Results offset for pagination' })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class GetAlertsQueryDto {
  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Alert type filter', enum: AmlAlertType })
  @IsOptional()
  @IsEnum(AmlAlertType)
  alertType?: AmlAlertType;

  @ApiPropertyOptional({ description: 'Severity filter', enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Status filter', enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of results to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Results offset for pagination' })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class GetStatisticsQueryDto {
  @ApiProperty({ description: 'Statistics start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Statistics end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class ComplianceApiResponseDto<T> {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({ description: 'Response timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Request ID for tracking' })
  @IsOptional()
  @IsString()
  requestId?: string;
}

export class PaginatedComplianceResponseDto<T> {
  @ApiProperty({ description: 'Response data array' })
  @IsArray()
  data: T[];

  @ApiProperty({ description: 'Total number of records' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Current page offset' })
  @IsNumber()
  offset: number;

  @ApiProperty({ description: 'Number of records per page' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Whether there are more records' })
  @IsBoolean()
  hasMore: boolean;
}