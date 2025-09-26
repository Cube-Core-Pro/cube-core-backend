// path: src/banking/compliance/dto/create-regulatory-report.dto.ts
// purpose: DTO for creating regulatory reports
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RegulatoryReportType {
  SAR = 'SAR', // Suspicious Activity Report
  CTR = 'CTR', // Currency Transaction Report
  FBAR = 'FBAR', // Foreign Bank Account Report
  BSA = 'BSA', // Bank Secrecy Act
  CDD = 'CDD', // Customer Due Diligence
  EDD = 'EDD', // Enhanced Due Diligence
  KYC_SUMMARY = 'KYC_SUMMARY',
  AML_MONITORING = 'AML_MONITORING',
  SANCTIONS_SCREENING = 'SANCTIONS_SCREENING',
  PEP_MONITORING = 'PEP_MONITORING',
  TRANSACTION_MONITORING = 'TRANSACTION_MONITORING',
  REGULATORY_CAPITAL = 'REGULATORY_CAPITAL',
  LIQUIDITY_COVERAGE = 'LIQUIDITY_COVERAGE',
  STRESS_TEST = 'STRESS_TEST'
}

export enum RegulatoryReportStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  REJECTED = 'REJECTED'
}

export class CreateRegulatoryReportDto {
  @ApiProperty({ description: 'Report type', enum: RegulatoryReportType })
  @IsEnum(RegulatoryReportType)
  reportType: RegulatoryReportType;

  @ApiProperty({ description: 'Reporting period (e.g., 2024-Q1, 2024-01, 2024)' })
  @IsString()
  reportPeriod: string;

  @ApiProperty({ description: 'Report status', enum: RegulatoryReportStatus, default: RegulatoryReportStatus.DRAFT })
  @IsEnum(RegulatoryReportStatus)
  @IsOptional()
  status?: RegulatoryReportStatus = RegulatoryReportStatus.DRAFT;

  @ApiProperty({ description: 'User ID who generated the report' })
  @IsString()
  generatedBy: string;

  @ApiProperty({ description: 'When the report was submitted', required: false })
  @IsOptional()
  submittedAt?: Date;

  @ApiProperty({ description: 'Regulatory authority the report was submitted to', required: false })
  @IsString()
  @IsOptional()
  submittedTo?: string;

  @ApiProperty({ description: 'Report data (JSON object)' })
  @IsObject()
  reportData: any;
}