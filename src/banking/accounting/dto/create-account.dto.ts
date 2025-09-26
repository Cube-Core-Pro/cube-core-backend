// path: src/banking/accounting/dto/create-account.dto.ts
// purpose: DTO for creating chart of accounts
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum AccountSubType {
  // Assets
  CURRENT_ASSET = 'CURRENT_ASSET',
  NON_CURRENT_ASSET = 'NON_CURRENT_ASSET',
  CASH = 'CASH',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  INVENTORY = 'INVENTORY',
  FIXED_ASSET = 'FIXED_ASSET',
  INTANGIBLE_ASSET = 'INTANGIBLE_ASSET',
  
  // Liabilities
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  NON_CURRENT_LIABILITY = 'NON_CURRENT_LIABILITY',
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  ACCRUED_LIABILITY = 'ACCRUED_LIABILITY',
  LONG_TERM_DEBT = 'LONG_TERM_DEBT',
  
  // Equity
  SHARE_CAPITAL = 'SHARE_CAPITAL',
  RETAINED_EARNINGS = 'RETAINED_EARNINGS',
  OTHER_EQUITY = 'OTHER_EQUITY',
  
  // Revenue
  OPERATING_REVENUE = 'OPERATING_REVENUE',
  NON_OPERATING_REVENUE = 'NON_OPERATING_REVENUE',
  
  // Expenses
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  NON_OPERATING_EXPENSE = 'NON_OPERATING_EXPENSE',
  COST_OF_GOODS_SOLD = 'COST_OF_GOODS_SOLD'
}

export class CreateAccountDto {
  @ApiProperty({ description: 'Account code (unique identifier)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Account description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiProperty({ description: 'Account sub-type', enum: AccountSubType, required: false })
  @IsEnum(AccountSubType)
  @IsOptional()
  subType?: AccountSubType;

  @ApiProperty({ description: 'Parent account code', required: false })
  @IsString()
  @IsOptional()
  parentCode?: string;

  @ApiProperty({ description: 'Current balance', default: 0 })
  @IsNumber()
  @IsOptional()
  balance?: number = 0;

  @ApiProperty({ description: 'Whether the account is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Whether the account allows manual journal entries', default: true })
  @IsBoolean()
  @IsOptional()
  allowManualEntries?: boolean = true;

  @ApiProperty({ description: 'Tax code for reporting', required: false })
  @IsString()
  @IsOptional()
  taxCode?: string;

  @ApiProperty({ description: 'Account level in hierarchy', minimum: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  level?: number = 1;
}