// path: src/banking/compliance/dto/create-aml-alert.dto.ts
// purpose: DTO for creating AML alerts
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AmlAlertType {
  SUSPICIOUS_TRANSACTION = 'SUSPICIOUS_TRANSACTION',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  HIGH_RISK_CUSTOMER = 'HIGH_RISK_CUSTOMER',
  SANCTIONS_MATCH = 'SANCTIONS_MATCH',
  PEP_MATCH = 'PEP_MATCH',
  ADVERSE_MEDIA = 'ADVERSE_MEDIA',
  STRUCTURING = 'STRUCTURING',
  SMURFING = 'SMURFING',
  CASH_INTENSIVE = 'CASH_INTENSIVE',
  CROSS_BORDER = 'CROSS_BORDER'
}

export enum AmlAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AmlAlertStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

export class CreateAmlAlertDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Alert type', enum: AmlAlertType })
  @IsEnum(AmlAlertType)
  alertType: AmlAlertType;

  @ApiProperty({ description: 'Alert severity', enum: AmlAlertSeverity, default: AmlAlertSeverity.MEDIUM })
  @IsEnum(AmlAlertSeverity)
  @IsOptional()
  severity?: AmlAlertSeverity = AmlAlertSeverity.MEDIUM;

  @ApiProperty({ description: 'Alert description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Alert status', enum: AmlAlertStatus, default: AmlAlertStatus.OPEN })
  @IsEnum(AmlAlertStatus)
  @IsOptional()
  status?: AmlAlertStatus = AmlAlertStatus.OPEN;

  @ApiProperty({ description: 'User ID assigned to handle the alert', required: false })
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ description: 'Resolution details', required: false })
  @IsString()
  @IsOptional()
  resolution?: string;

  @ApiProperty({ description: 'When the alert was resolved', required: false })
  @IsOptional()
  resolvedAt?: Date;
}