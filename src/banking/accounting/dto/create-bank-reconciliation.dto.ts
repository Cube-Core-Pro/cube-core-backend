// path: src/banking/accounting/dto/create-bank-reconciliation.dto.ts
// purpose: DTO for creating bank reconciliations
// dependencies: class-validator, class-transformer

import { IsString, IsNumber, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED'
}

export class ReconciliationItemDto {
  @ApiProperty({ description: 'Item type (deposit, withdrawal, fee, etc.)' })
  @IsString()
  itemType: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Item amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Item date' })
  date: Date;

  @ApiProperty({ description: 'Whether item is cleared', default: false })
  @IsOptional()
  isCleared?: boolean = false;

  @ApiProperty({ description: 'Reference number', required: false })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class CreateBankReconciliationDto {
  @ApiProperty({ description: 'Bank account code' })
  @IsString()
  bankAccountCode: string;

  @ApiProperty({ description: 'Bank statement date' })
  statementDate: Date;

  @ApiProperty({ description: 'Beginning balance from bank statement' })
  @IsNumber()
  beginningBalance: number;

  @ApiProperty({ description: 'Ending balance from bank statement' })
  @IsNumber()
  endingBalance: number;

  @ApiProperty({ description: 'Book balance as of statement date' })
  @IsNumber()
  bookBalance: number;

  @ApiProperty({ description: 'Reconciliation status', enum: ReconciliationStatus, default: ReconciliationStatus.IN_PROGRESS })
  @IsEnum(ReconciliationStatus)
  @IsOptional()
  status?: ReconciliationStatus = ReconciliationStatus.IN_PROGRESS;

  @ApiProperty({ description: 'Outstanding deposits', type: [ReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  outstandingDeposits: ReconciliationItemDto[];

  @ApiProperty({ description: 'Outstanding checks', type: [ReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  outstandingChecks: ReconciliationItemDto[];

  @ApiProperty({ description: 'Bank adjustments', type: [ReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  bankAdjustments: ReconciliationItemDto[];

  @ApiProperty({ description: 'Book adjustments', type: [ReconciliationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  bookAdjustments: ReconciliationItemDto[];

  @ApiProperty({ description: 'User ID who performed the reconciliation' })
  @IsString()
  reconciledBy: string;

  @ApiProperty({ description: 'Reconciliation notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}