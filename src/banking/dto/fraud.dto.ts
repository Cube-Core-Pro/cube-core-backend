// path: src/banking/dto/fraud.dto.ts
// purpose: Fraud Detection DTOs - Request/response types for fraud monitoring and risk assessment
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  BLOCKED = 'BLOCKED'
}

export enum FraudReason {
  LARGE_AMOUNT = 'Transaction amount significantly higher than usual',
  NEW_LOCATION = 'Transaction from new geographic location',
  UNUSUAL_TIME = 'Transaction at unusual time',
  NEW_MERCHANT = 'New merchant category',
  HIGH_FREQUENCY = 'High transaction frequency detected',
  NEW_DEVICE = 'Transaction from new device',
  VELOCITY_CHECK = 'Impossible travel velocity detected',
  SANCTIONS_MATCH = 'Potential sanctions list match',
  BLACKLIST_MATCH = 'Device or IP on blacklist'
}

// ============================================================================
// TRANSACTION ANALYSIS DTOs
// ============================================================================

export class LocationDto {
  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'City name' })
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: 'GPS coordinates [latitude, longitude]' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates?: [number, number];
}

export class AnalyzeTransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Account ID' })
  @IsString()
  accountId: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Merchant category code' })
  @IsString()
  merchantCategory: string;

  @ApiProperty({ description: 'Transaction location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiPropertyOptional({ description: 'Device fingerprint' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @ApiProperty({ description: 'IP address' })
  @IsString()
  ipAddress: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Payment method' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Merchant name' })
  @IsOptional()
  @IsString()
  merchantName?: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FraudAnalysisResultDto {
  @ApiProperty({ description: 'Alert ID (if created)' })
  @IsOptional()
  @IsString()
  alertId?: string;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Risk factors identified' })
  @IsArray()
  @IsString({ each: true })
  riskReasons: string[];

  @ApiProperty({ description: 'Recommended action' })
  @IsString()
  recommendedAction: string;

  @ApiProperty({ description: 'Analysis timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Whether transaction should be blocked' })
  @IsBoolean()
  shouldBlock: boolean;
}

// ============================================================================
// ALERT MANAGEMENT DTOs
// ============================================================================

export class FraudAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Transaction ID' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Account ID' })
  @IsString()
  accountId: string;

  @ApiProperty({ description: 'Risk score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Risk reasons' })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];

  @ApiProperty({ description: 'Alert timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Alert status', enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional({ description: 'Reviewed by user ID' })
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class UpdateAlertStatusDto {
  @ApiProperty({ description: 'New alert status', enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiProperty({ description: 'User ID performing the review' })
  @IsString()
  reviewedBy: string;

  @ApiPropertyOptional({ description: 'Review notes' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// ============================================================================
// CUSTOMER PROFILE DTOs
// ============================================================================

export class CustomerBehaviorProfileDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Average transaction amount' })
  @IsNumber()
  @Min(0)
  averageTransactionAmount: number;

  @ApiProperty({ description: 'Typical merchant categories' })
  @IsArray()
  @IsString({ each: true })
  typicalMerchantCategories: string[];

  @ApiProperty({ description: 'Usual transaction locations' })
  @IsArray()
  @IsString({ each: true })
  usualLocations: string[];

  @ApiProperty({ description: 'Average transactions per day' })
  @IsNumber()
  @Min(0)
  transactionFrequency: number;

  @ApiProperty({ description: 'Typical transaction hours (0-23)' })
  @IsArray()
  @IsNumber({}, { each: true })
  timePatterns: number[];

  @ApiProperty({ description: 'Profile last updated' })
  @IsDateString()
  lastUpdated: string;
}

export class UpdateCustomerProfileDto {
  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Merchant category' })
  @IsString()
  merchantCategory: string;

  @ApiProperty({ description: 'Transaction location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Transaction timestamp' })
  @IsDateString()
  timestamp: string;
}

// ============================================================================
// DEVICE MANAGEMENT DTOs
// ============================================================================

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Device fingerprint' })
  @IsString()
  deviceFingerprint: string;

  @ApiPropertyOptional({ description: 'Device name/description' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type (mobile, desktop, tablet)' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'Browser information' })
  @IsOptional()
  @IsString()
  browser?: string;
}

export class DeviceInfoDto {
  @ApiProperty({ description: 'Device fingerprint' })
  @IsString()
  fingerprint: string;

  @ApiProperty({ description: 'First seen date' })
  @IsDateString()
  firstSeen: string;

  @ApiProperty({ description: 'Last seen date' })
  @IsDateString()
  lastSeen: string;

  @ApiProperty({ description: 'Transaction count from this device' })
  @IsNumber()
  @Min(0)
  transactionCount: number;

  @ApiProperty({ description: 'Device trust score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  trustScore: number;

  @ApiPropertyOptional({ description: 'Device name/description' })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

// ============================================================================
// REPORTING DTOs
// ============================================================================

export class FraudStatisticsDto {
  @ApiProperty({ description: 'Total alerts generated' })
  @IsNumber()
  @Min(0)
  totalAlerts: number;

  @ApiProperty({ description: 'Critical risk alerts' })
  @IsNumber()
  @Min(0)
  criticalAlerts: number;

  @ApiProperty({ description: 'High risk alerts' })
  @IsNumber()
  @Min(0)
  highRiskAlerts: number;

  @ApiProperty({ description: 'Medium risk alerts' })
  @IsNumber()
  @Min(0)
  mediumRiskAlerts: number;

  @ApiProperty({ description: 'Transactions blocked' })
  @IsNumber()
  @Min(0)
  blockedTransactions: number;

  @ApiProperty({ description: 'False positive alerts' })
  @IsNumber()
  @Min(0)
  falsePositives: number;

  @ApiProperty({ description: 'Average risk score' })
  @IsNumber()
  @Min(0)
  @Max(100)
  averageRiskScore: number;

  @ApiProperty({ description: 'Top risk factors' })
  @IsArray()
  @IsString({ each: true })
  topRiskFactors: string[];

  @ApiProperty({ description: 'Statistics period start' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Statistics period end' })
  @IsDateString()
  periodEnd: string;
}

export class FraudReportDto {
  @ApiProperty({ description: 'Report generation timestamp' })
  @IsDateString()
  generatedAt: string;

  @ApiPropertyOptional({ description: 'Customer ID (if customer-specific report)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'Fraud statistics summary' })
  @ValidateNested()
  @Type(() => FraudStatisticsDto)
  summary: FraudStatisticsDto;

  @ApiProperty({ description: 'Recommendations for improvement' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiPropertyOptional({ description: 'Detailed alert breakdown' })
  @IsOptional()
  @IsArray()
  alertBreakdown?: any[];

  @ApiPropertyOptional({ description: 'Risk trend analysis' })
  @IsOptional()
  riskTrends?: any;
}

// ============================================================================
// ML MODEL DTOs
// ============================================================================

export class TrainModelDto {
  @ApiProperty({ description: 'Training data features' })
  @IsArray()
  trainingData: any[];

  @ApiPropertyOptional({ description: 'Model type' })
  @IsOptional()
  @IsString()
  modelType?: string;

  @ApiPropertyOptional({ description: 'Training parameters' })
  @IsOptional()
  parameters?: any;
}

export class ModelPredictionDto {
  @ApiProperty({ description: 'Risk score prediction (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ description: 'Prediction confidence (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Feature importance scores' })
  @IsOptional()
  featureImportance?: Record<string, number>;

  @ApiProperty({ description: 'Model version used' })
  @IsString()
  modelVersion: string;

  @ApiProperty({ description: 'Prediction timestamp' })
  @IsDateString()
  timestamp: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class GetAlertsQueryDto {
  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Risk level filter', enum: RiskLevel })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Alert status filter', enum: AlertStatus })
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
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Results offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class GetStatisticsQueryDto {
  @ApiProperty({ description: 'Statistics start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Statistics end date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Include detailed breakdown' })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class FraudApiResponseDto<T> {
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

export class PaginatedFraudResponseDto<T> {
  @ApiProperty({ description: 'Response data array' })
  @IsArray()
  data: T[];

  @ApiProperty({ description: 'Total number of records' })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ description: 'Current page offset' })
  @IsNumber()
  @Min(0)
  offset: number;

  @ApiProperty({ description: 'Number of records per page' })
  @IsNumber()
  @Min(1)
  limit: number;

  @ApiProperty({ description: 'Whether there are more records' })
  @IsBoolean()
  hasMore: boolean;
}