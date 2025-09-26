// path: src/banking/accounting/dto/create-financial-statement.dto.ts
// purpose: DTO for creating financial statements
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FinancialStatementType {
  BALANCE_SHEET = 'BALANCE_SHEET',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  CASH_FLOW = 'CASH_FLOW',
  STATEMENT_OF_EQUITY = 'STATEMENT_OF_EQUITY',
  TRIAL_BALANCE = 'TRIAL_BALANCE'
}

export class CreateFinancialStatementDto {
  @ApiProperty({ description: 'Statement type', enum: FinancialStatementType })
  @IsEnum(FinancialStatementType)
  statementType: FinancialStatementType;

  @ApiProperty({ description: 'As of date (for balance sheet)' })
  asOfDate: Date;

  @ApiProperty({ description: 'Period start date (for income statement)', required: false })
  @IsOptional()
  periodStart?: Date;

  @ApiProperty({ description: 'Period end date (for income statement)', required: false })
  @IsOptional()
  periodEnd?: Date;

  @ApiProperty({ description: 'User ID who generated the statement' })
  @IsString()
  generatedBy: string;

  @ApiProperty({ description: 'Statement data (JSON object)' })
  @IsObject()
  statementData: any;

  @ApiProperty({ description: 'Statement notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}