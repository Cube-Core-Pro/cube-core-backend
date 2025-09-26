// path: src/banking/compliance/dto/create-kyc-check.dto.ts
// purpose: DTO for creating KYC checks
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum KycCheckType {
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  ADDRESS_VERIFICATION = 'ADDRESS_VERIFICATION',
  DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION',
  PEP_SCREENING = 'PEP_SCREENING',
  SANCTIONS_SCREENING = 'SANCTIONS_SCREENING',
  ADVERSE_MEDIA_SCREENING = 'ADVERSE_MEDIA_SCREENING',
  SOURCE_OF_FUNDS = 'SOURCE_OF_FUNDS',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  BENEFICIAL_OWNERSHIP = 'BENEFICIAL_OWNERSHIP'
}

export enum KycCheckStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}

export class CreateKycCheckDto {
  @ApiProperty({ description: 'KYC profile ID' })
  @IsString()
  profileId: string;

  @ApiProperty({ description: 'Check type', enum: KycCheckType })
  @IsEnum(KycCheckType)
  checkType: KycCheckType;

  @ApiProperty({ description: 'Check status', enum: KycCheckStatus, default: KycCheckStatus.PENDING })
  @IsEnum(KycCheckStatus)
  @IsOptional()
  status?: KycCheckStatus = KycCheckStatus.PENDING;

  @ApiProperty({ description: 'Check result data', required: false })
  @IsObject()
  @IsOptional()
  result?: any;

  @ApiProperty({ description: 'When the check was performed', required: false })
  @IsOptional()
  performedAt?: Date;

  @ApiProperty({ description: 'User ID who performed the check', required: false })
  @IsString()
  @IsOptional()
  performedBy?: string;

  @ApiProperty({ description: 'When the check expires', required: false })
  @IsOptional()
  expiresAt?: Date;
}