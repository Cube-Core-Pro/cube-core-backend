// path: src/banking/fraud/dto/create-fraud-alert.dto.ts
// purpose: DTO for creating fraud alerts
// dependencies: class-validator, class-transformer

import { IsString, IsNumber, IsArray, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FraudRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum FraudAlertStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

export class CreateFraudAlertDto {
  @ApiProperty({ description: 'Transaction ID that triggered the alert' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Customer ID associated with the transaction' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Account ID associated with the transaction' })
  @IsString()
  accountId: string;

  @ApiProperty({ description: 'Risk score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({ description: 'Risk level', enum: FraudRiskLevel })
  @IsEnum(FraudRiskLevel)
  riskLevel: FraudRiskLevel;

  @ApiProperty({ description: 'Reasons for the fraud alert', type: [String] })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];

  @ApiProperty({ description: 'Alert status', enum: FraudAlertStatus, default: FraudAlertStatus.PENDING })
  @IsEnum(FraudAlertStatus)
  @IsOptional()
  status?: FraudAlertStatus = FraudAlertStatus.PENDING;

  @ApiProperty({ description: 'User ID who reviewed the alert', required: false })
  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @ApiProperty({ description: 'Review notes', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @ApiProperty({ description: 'Review timestamp', required: false })
  @IsOptional()
  reviewedAt?: Date;
}