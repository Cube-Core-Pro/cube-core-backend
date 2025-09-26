// path: src/banking/dto/accounting.dto.ts
// purpose: Accounting DTOs - GAAP/IFRS compliant accounting and financial reporting types
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum JournalEntrySource {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
  IMPORT = 'IMPORT',
  SYSTEM = 'SYSTEM'
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export enum StatementType {
  BALANCE_SHEET = 'BALANCE_SHEET',
  INCOME_STATEMENT = 'INCOME_STATEMENT',
  CASH_FLOW = 'CASH_FLOW',
  EQUITY_STATEMENT = 'EQUITY_STATEMENT'
}

export enum ReportingStandard {
  GAAP = 'GAAP',
  IFRS = 'IFRS'
}

export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED'
}

export enum TaxType {
  INCOME = 'INCOME',
  SALES = 'SALES',
  VAT = 'VAT',
  PAYROLL = 'PAYROLL',
  PROPERTY = 'PROPERTY'
}

// ============================================================================
// CHART OF ACCOUNTS DTOs
// ============================================================================

export class CreateAccountDto {
  @ApiPropertyOptional({ description: 'Account code (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ description: 'Account sub-type' })
  @IsString()
  accountSubType: string;

  @ApiPropertyOptional({ description: 'Parent account code' })
  @IsOptional()
  @IsString()
  parentAccount?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tax code' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Department code' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional({ description: 'Whether account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChartOfAccountsDto {
  @ApiProperty({ description: 'Account code' })
  @IsString()
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Account type', enum: AccountType })
  @IsEnum(AccountType)
  accountType: AccountType;

  @ApiProperty({ description: 'Account sub-type' })
  @IsString()
  accountSubType: string;

  @ApiPropertyOptional({ description: 'Parent account code' })
  @IsOptional()
  @IsString()
  parentAccount?: string;

  @ApiProperty({ description: 'Whether account is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Normal balance', enum: NormalBalance })
  @IsEnum(NormalBalance)
  normalBalance: NormalBalance;

  @ApiProperty({ description: 'Account description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Tax code' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Department code' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiProperty({ description: 'Account creation date' })
  @IsDateString()
  createdDate: string;

  @ApiProperty({ description: 'Last modified date' })
  @IsDateString()
  lastModified: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Account name' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ description: 'Account sub-type' })
  @IsOptional()
  @IsString()
  accountSubType?: string;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tax code' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Department code' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional({ description: 'Whether account is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// JOURNAL ENTRY DTOs
// ============================================================================

export class JournalLineItemDto {
  @ApiProperty({ description: 'Line number' })
  @IsNumber()
  @Min(1)
  lineNumber: number;

  @ApiProperty({ description: 'Account code' })
  @IsString()
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Line item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Debit amount' })
  @IsNumber()
  @Min(0)
  debitAmount: number;

  @ApiProperty({ description: 'Credit amount' })
  @IsNumber()
  @Min(0)
  creditAmount: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({ description: 'Base currency amount' })
  @IsNumber()
  baseCurrencyAmount: number;

  @ApiPropertyOptional({ description: 'Tax code' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Department code' })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiPropertyOptional({ description: 'Project code' })
  @IsOptional()
  @IsString()
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Vendor ID' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Invoice ID' })
  @IsOptional()
  @IsString()
  invoiceId?: string;
}

export class CreateJournalEntryDto {
  @ApiPropertyOptional({ description: 'Entry number (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  entryNumber?: string;

  @ApiPropertyOptional({ description: 'Entry date (defaults to today)' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @ApiPropertyOptional({ description: 'Posting date (defaults to entry date)' })
  @IsOptional()
  @IsDateString()
  postingDate?: string;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Entry source', enum: JournalEntrySource })
  @IsOptional()
  @IsEnum(JournalEntrySource)
  source?: JournalEntrySource;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({ description: 'Journal line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineItemDto)
  lineItems: JournalLineItemDto[];

  @ApiProperty({ description: 'Created by user ID' })
  @IsString()
  createdBy: string;

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class JournalEntryDto {
  @ApiProperty({ description: 'Entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Entry number' })
  @IsString()
  entryNumber: string;

  @ApiProperty({ description: 'Entry date' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ description: 'Posting date' })
  @IsDateString()
  postingDate: string;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Reference number' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Entry source', enum: JournalEntrySource })
  @IsEnum(JournalEntrySource)
  source: JournalEntrySource;

  @ApiProperty({ description: 'Entry status', enum: JournalEntryStatus })
  @IsEnum(JournalEntryStatus)
  status: JournalEntryStatus;

  @ApiProperty({ description: 'Total debit amount' })
  @IsNumber()
  totalDebit: number;

  @ApiProperty({ description: 'Total credit amount' })
  @IsNumber()
  totalCredit: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Exchange rate' })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiProperty({ description: 'Journal line items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineItemDto)
  lineItems: JournalLineItemDto[];

  @ApiProperty({ description: 'Created by user ID' })
  @IsString()
  createdBy: string;

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Reversal entry ID' })
  @IsOptional()
  @IsString()
  reversalEntry?: string;

  @ApiProperty({ description: 'Attachments' })
  @IsArray()
  @IsString({ each: true })
  attachments: string[];

  @ApiProperty({ description: 'Tags' })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

export class PostJournalEntryDto {
  @ApiProperty({ description: 'Entry ID to post' })
  @IsString()
  entryId: string;

  @ApiProperty({ description: 'Approved by user ID' })
  @IsString()
  approvedBy: string;
}

// ============================================================================
// FINANCIAL STATEMENTS DTOs
// ============================================================================

export class TrialBalanceAccountDto {
  @ApiProperty({ description: 'Account code' })
  @IsString()
  accountCode: string;

  @ApiProperty({ description: 'Account name' })
  @IsString()
  accountName: string;

  @ApiProperty({ description: 'Account type' })
  @IsString()
  accountType: string;

  @ApiProperty({ description: 'Beginning balance' })
  @IsNumber()
  beginningBalance: number;

  @ApiProperty({ description: 'Total debit movements' })
  @IsNumber()
  debitMovements: number;

  @ApiProperty({ description: 'Total credit movements' })
  @IsNumber()
  creditMovements: number;

  @ApiProperty({ description: 'Ending balance' })
  @IsNumber()
  endingBalance: number;
}

export class TrialBalanceDto {
  @ApiProperty({ description: 'As of date' })
  @IsDateString()
  asOfDate: string;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Trial balance accounts' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrialBalanceAccountDto)
  accounts: TrialBalanceAccountDto[];

  @ApiProperty({ description: 'Total debits' })
  @IsNumber()
  totalDebits: number;

  @ApiProperty({ description: 'Total credits' })
  @IsNumber()
  totalCredits: number;

  @ApiProperty({ description: 'Whether trial balance is balanced' })
  @IsBoolean()
  isBalanced: boolean;

  @ApiProperty({ description: 'Generation date' })
  @IsDateString()
  generatedDate: string;
}

export class FinancialStatementDto {
  @ApiProperty({ description: 'Statement type', enum: StatementType })
  @IsEnum(StatementType)
  statementType: StatementType;

  @ApiProperty({ description: 'As of date' })
  @IsDateString()
  asOfDate: string;

  @ApiPropertyOptional({ description: 'Period start date' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end date' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Reporting standard', enum: ReportingStandard })
  @IsEnum(ReportingStandard)
  reportingStandard: ReportingStandard;

  @ApiProperty({ description: 'Statement data' })
  data: any;

  @ApiProperty({ description: 'Generation date' })
  @IsDateString()
  generatedDate: string;

  @ApiProperty({ description: 'Generated by user ID' })
  @IsString()
  generatedBy: string;
}

export class GenerateStatementDto {
  @ApiProperty({ description: 'Statement type', enum: StatementType })
  @IsEnum(StatementType)
  statementType: StatementType;

  @ApiProperty({ description: 'As of date' })
  @IsDateString()
  asOfDate: string;

  @ApiPropertyOptional({ description: 'Period start date (for income statement)' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Reporting standard', enum: ReportingStandard })
  @IsOptional()
  @IsEnum(ReportingStandard)
  reportingStandard?: ReportingStandard;

  @ApiPropertyOptional({ description: 'Include comparative periods' })
  @IsOptional()
  @IsBoolean()
  includeComparative?: boolean;
}

// ============================================================================
// BANK RECONCILIATION DTOs
// ============================================================================

export class ReconciliationItemDto {
  @ApiProperty({ description: 'Item ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Item date' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Item amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Reference number' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Whether item is cleared' })
  @IsBoolean()
  cleared: boolean;

  @ApiPropertyOptional({ description: 'Cleared date' })
  @IsOptional()
  @IsDateString()
  clearedDate?: string;
}

export class CreateBankReconciliationDto {
  @ApiProperty({ description: 'Bank account code' })
  @IsString()
  bankAccountCode: string;

  @ApiProperty({ description: 'Bank statement date' })
  @IsDateString()
  statementDate: string;

  @ApiProperty({ description: 'Bank statement balance' })
  @IsNumber()
  statementBalance: number;

  @ApiProperty({ description: 'Reconciled by user ID' })
  @IsString()
  reconciledBy: string;
}

export class BankReconciliationDto {
  @ApiProperty({ description: 'Reconciliation ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Bank account code' })
  @IsString()
  bankAccountCode: string;

  @ApiProperty({ description: 'Statement date' })
  @IsDateString()
  statementDate: string;

  @ApiProperty({ description: 'Statement balance' })
  @IsNumber()
  statementBalance: number;

  @ApiProperty({ description: 'Book balance' })
  @IsNumber()
  bookBalance: number;

  @ApiProperty({ description: 'Reconciled balance' })
  @IsNumber()
  reconciledBalance: number;

  @ApiProperty({ description: 'Outstanding deposits' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  outstandingDeposits: ReconciliationItemDto[];

  @ApiProperty({ description: 'Outstanding checks' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  outstandingChecks: ReconciliationItemDto[];

  @ApiProperty({ description: 'Bank adjustments' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  bankAdjustments: ReconciliationItemDto[];

  @ApiProperty({ description: 'Book adjustments' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  bookAdjustments: ReconciliationItemDto[];

  @ApiProperty({ description: 'Reconciliation status', enum: ReconciliationStatus })
  @IsEnum(ReconciliationStatus)
  status: ReconciliationStatus;

  @ApiProperty({ description: 'Reconciled by user ID' })
  @IsString()
  reconciledBy: string;

  @ApiPropertyOptional({ description: 'Reviewed by user ID' })
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiProperty({ description: 'Notes' })
  @IsArray()
  @IsString({ each: true })
  notes: string[];
}

// ============================================================================
// TAX CALCULATION DTOs
// ============================================================================

export class TaxCalculationDto {
  @ApiProperty({ description: 'Jurisdiction' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Tax type', enum: TaxType })
  @IsEnum(TaxType)
  taxType: TaxType;

  @ApiProperty({ description: 'Taxable amount' })
  @IsNumber()
  @Min(0)
  taxableAmount: number;

  @ApiProperty({ description: 'Tax rate' })
  @IsNumber()
  @Min(0)
  @Max(1)
  taxRate: number;

  @ApiProperty({ description: 'Tax amount' })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiPropertyOptional({ description: 'Exempt amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exemptAmount?: number;

  @ApiPropertyOptional({ description: 'Deductions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ description: 'Credits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credits?: number;

  @ApiProperty({ description: 'Calculation date' })
  @IsDateString()
  calculationDate: string;

  @ApiProperty({ description: 'Tax period' })
  @ValidateNested()
  @Type(() => TaxPeriodDto)
  taxPeriod: TaxPeriodDto;
}

export class TaxPeriodDto {
  @ApiProperty({ description: 'Period start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Period end date' })
  @IsDateString()
  endDate: string;
}

export class CalculateIncomeTaxDto {
  @ApiProperty({ description: 'Taxable income amount' })
  @IsNumber()
  @Min(0)
  taxableIncome: number;

  @ApiProperty({ description: 'Jurisdiction' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Tax year' })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  taxYear: number;

  @ApiPropertyOptional({ description: 'Deductions' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @ApiPropertyOptional({ description: 'Credits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credits?: number;
}

// ============================================================================
// AUTOMATED ENTRIES DTOs
// ============================================================================

export class CreateBankingTransactionEntryDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'Transaction type (DEPOSIT, WITHDRAWAL, TRANSFER)' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Account ID' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

// ============================================================================
// DASHBOARD DTOs
// ============================================================================

export class AccountingDashboardDto {
  @ApiProperty({ description: 'Trial balance summary' })
  trialBalance: {
    isBalanced: boolean;
    totalDebits: number;
    totalCredits: number;
    accountCount: number;
  };

  @ApiProperty({ description: 'Monthly performance' })
  monthlyPerformance: {
    revenue: number;
    expenses: number;
    netIncome: number;
    netMargin: number;
  };

  @ApiProperty({ description: 'Yearly performance' })
  yearlyPerformance: {
    revenue: number;
    expenses: number;
    netIncome: number;
    netMargin: number;
  };

  @ApiProperty({ description: 'Recent journal entries' })
  @IsArray()
  recentEntries: any[];

  @ApiProperty({ description: 'Pending reconciliations' })
  @IsArray()
  pendingReconciliations: any[];
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class GetJournalEntriesQueryDto {
  @ApiPropertyOptional({ description: 'Entry status filter', enum: JournalEntryStatus })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({ description: 'Entry source filter', enum: JournalEntrySource })
  @IsOptional()
  @IsEnum(JournalEntrySource)
  source?: JournalEntrySource;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Account code filter' })
  @IsOptional()
  @IsString()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Created by user filter' })
  @IsOptional()
  @IsString()
  createdBy?: string;

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

export class GetAccountsQueryDto {
  @ApiPropertyOptional({ description: 'Account type filter', enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @ApiPropertyOptional({ description: 'Active status filter' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Parent account filter' })
  @IsOptional()
  @IsString()
  parentAccount?: string;

  @ApiPropertyOptional({ description: 'Department code filter' })
  @IsOptional()
  @IsString()
  departmentCode?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class AccountingApiResponseDto<T> {
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

export class PaginatedAccountingResponseDto<T> {
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