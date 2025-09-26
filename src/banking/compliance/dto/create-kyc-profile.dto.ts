// path: src/banking/compliance/dto/create-kyc-profile.dto.ts
// purpose: DTO for creating KYC profiles
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
  TRUST = 'TRUST'
}

export enum KycStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export class CreateKycProfileDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Customer type', enum: CustomerType, default: CustomerType.INDIVIDUAL })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType = CustomerType.INDIVIDUAL;

  @ApiProperty({ description: 'KYC status', enum: KycStatus, default: KycStatus.PENDING })
  @IsEnum(KycStatus)
  @IsOptional()
  status?: KycStatus = KycStatus.PENDING;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel, default: RiskLevel.MEDIUM })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel = RiskLevel.MEDIUM;

  @ApiProperty({ description: 'Compliance score (0-100)', minimum: 0, maximum: 100, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  complianceScore?: number = 0;

  @ApiProperty({ description: 'Jurisdiction code (ISO 3166-1 alpha-2)' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Last review date', required: false })
  @IsOptional()
  lastReviewDate?: Date;

  @ApiProperty({ description: 'Next review date', required: false })
  @IsOptional()
  nextReviewDate?: Date;

  @ApiProperty({ description: 'Number of completed checks', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  completedChecks?: number = 0;

  @ApiProperty({ description: 'Total number of required checks', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalChecks?: number = 0;

  @ApiProperty({ description: 'Number of submitted documents', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  submittedDocuments?: number = 0;

  @ApiProperty({ description: 'Number of required documents', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  requiredDocuments?: number = 0;
}