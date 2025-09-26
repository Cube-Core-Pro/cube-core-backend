// path: src/banking/accounting/accounting.controller.ts
// purpose: Banking Accounting Controller - REST API endpoints for accounting management
// dependencies: NestJS, AccountingService, DTOs, Guards, Swagger

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { 
  CreateAccountDto, 
  UpdateAccountDto, 
  CreateJournalEntryDto, 
  UpdateJournalEntryDto,
  CreateFinancialStatementDto,
  CreateBankReconciliationDto,
  CreateTaxCalculationDto
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetTenant } from '../../auth/decorators/get-tenant.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Permission } from '../../auth/enums/permission.enum';

@ApiTags('Banking - Accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banking/accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ============================================================================
  // CHART OF ACCOUNTS
  // ============================================================================

  @Post('accounts')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Create account' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Account created successfully' })
  async createAccount(
    @Body() createAccountDto: CreateAccountDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.createAccount(createAccountDto, tenantId);
  }

  @Get('accounts')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get accounts' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by account type' })
  @ApiQuery({ name: 'parentCode', required: false, description: 'Filter by parent account code' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Accounts retrieved successfully' })
  async getAccounts(
    @GetTenant() tenantId: string,
    @Query('type') type?: string,
    @Query('parentCode') parentCode?: string,
    @Query('isActive') isActive?: boolean
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (parentCode) filters.parentCode = parentCode;
    if (isActive !== undefined) filters.isActive = isActive;

    return this.accountingService.getAccounts(tenantId, filters);
  }

  @Get('accounts/chart')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get chart of accounts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chart of accounts retrieved successfully' })
  async getChartOfAccounts(@GetTenant() tenantId: string) {
    return this.accountingService.getChartOfAccounts(tenantId);
  }

  @Get('accounts/:id')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async getAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.getAccount(id, tenantId);
  }

  @Get('accounts/code/:code')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get account by code' })
  @ApiParam({ name: 'code', description: 'Account code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async getAccountByCode(
    @Param('code') code: string,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.getAccountByCode(code, tenantId);
  }

  @Patch('accounts/:id')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Update account' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async updateAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAccountDto: UpdateAccountDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.updateAccount(id, updateAccountDto, tenantId);
  }

  @Delete('accounts/:id')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Delete account' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Account deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async deleteAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    await this.accountingService.deleteAccount(id, tenantId);
  }

  // ============================================================================
  // JOURNAL ENTRIES
  // ============================================================================

  @Post('journal-entries')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Create journal entry' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Journal entry created successfully' })
  async createJournalEntry(
    @Body() createJournalEntryDto: CreateJournalEntryDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.createJournalEntry(createJournalEntryDto, tenantId);
  }

  @Get('journal-entries')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get journal entries' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
  @ApiQuery({ name: 'accountCode', required: false, description: 'Filter by account code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal entries retrieved successfully' })
  async getJournalEntries(
    @GetTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('accountCode') accountCode?: string
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (accountCode) filters.accountCode = accountCode;

    return this.accountingService.getJournalEntries(tenantId, filters);
  }

  @Get('journal-entries/:id')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get journal entry by ID' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal entry retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Journal entry not found' })
  async getJournalEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.getJournalEntry(id, tenantId);
  }

  @Patch('journal-entries/:id')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Update journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal entry updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Journal entry not found' })
  async updateJournalEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.updateJournalEntry(id, updateJournalEntryDto, tenantId);
  }

  @Post('journal-entries/:id/post')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Post journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal entry posted successfully' })
  async postJournalEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string,
    @GetUser() user: any
  ) {
    return this.accountingService.postJournalEntry(id, user.id, tenantId);
  }

  @Post('journal-entries/:id/reverse')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Reverse journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Journal entry reversed successfully' })
  async reverseJournalEntry(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string,
    @GetUser() user: any
  ) {
    return this.accountingService.reverseJournalEntry(id, user.id, tenantId);
  }

  // ============================================================================
  // FINANCIAL REPORTING
  // ============================================================================

  @Get('reports/trial-balance')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Generate trial balance' })
  @ApiQuery({ name: 'asOfDate', description: 'As of date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trial balance generated successfully' })
  async generateTrialBalance(
    @Query('asOfDate') asOfDate: string,
    @GetTenant() tenantId: string
  ) {
    const date = new Date(asOfDate);
    return this.accountingService.generateTrialBalance(date, tenantId);
  }

  @Get('reports/balance-sheet')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Generate balance sheet' })
  @ApiQuery({ name: 'asOfDate', description: 'As of date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Balance sheet generated successfully' })
  async generateBalanceSheet(
    @Query('asOfDate') asOfDate: string,
    @GetTenant() tenantId: string
  ) {
    const date = new Date(asOfDate);
    return this.accountingService.generateBalanceSheet(date, tenantId);
  }

  @Get('reports/income-statement')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Generate income statement' })
  @ApiQuery({ name: 'periodStart', description: 'Period start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'periodEnd', description: 'Period end date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Income statement generated successfully' })
  async generateIncomeStatement(
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
    @GetTenant() tenantId: string
  ) {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    return this.accountingService.generateIncomeStatement(startDate, endDate, tenantId);
  }

  // ============================================================================
  // FINANCIAL STATEMENTS STORAGE
  // ============================================================================

  @Post('financial-statements')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Create financial statement' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Financial statement created successfully' })
  async createFinancialStatement(
    @Body() createFinancialStatementDto: CreateFinancialStatementDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.createFinancialStatement(createFinancialStatementDto, tenantId);
  }

  @Get('financial-statements')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get financial statements' })
  @ApiQuery({ name: 'statementType', required: false, description: 'Filter by statement type' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Filter by as of date' })
  @ApiQuery({ name: 'periodStart', required: false, description: 'Filter by period start' })
  @ApiQuery({ name: 'periodEnd', required: false, description: 'Filter by period end' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Financial statements retrieved successfully' })
  async getFinancialStatements(
    @GetTenant() tenantId: string,
    @Query('statementType') statementType?: string,
    @Query('asOfDate') asOfDate?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string
  ) {
    const filters: any = {};
    if (statementType) filters.statementType = statementType;
    if (asOfDate) filters.asOfDate = new Date(asOfDate);
    if (periodStart) filters.periodStart = new Date(periodStart);
    if (periodEnd) filters.periodEnd = new Date(periodEnd);

    return this.accountingService.getFinancialStatements(tenantId, filters);
  }

  // ============================================================================
  // BANK RECONCILIATION
  // ============================================================================

  @Post('bank-reconciliations')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Create bank reconciliation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Bank reconciliation created successfully' })
  async createBankReconciliation(
    @Body() createBankReconciliationDto: CreateBankReconciliationDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.createBankReconciliation(createBankReconciliationDto, tenantId);
  }

  @Get('bank-reconciliations')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get bank reconciliations' })
  @ApiQuery({ name: 'bankAccountCode', required: false, description: 'Filter by bank account code' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'statementDate', required: false, description: 'Filter by statement date' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Bank reconciliations retrieved successfully' })
  async getBankReconciliations(
    @GetTenant() tenantId: string,
    @Query('bankAccountCode') bankAccountCode?: string,
    @Query('status') status?: string,
    @Query('statementDate') statementDate?: string
  ) {
    const filters: any = {};
    if (bankAccountCode) filters.bankAccountCode = bankAccountCode;
    if (status) filters.status = status;
    if (statementDate) filters.statementDate = new Date(statementDate);

    return this.accountingService.getBankReconciliations(tenantId, filters);
  }

  // ============================================================================
  // TAX CALCULATIONS
  // ============================================================================

  @Post('tax-calculations')
  @Roles(Permission.BANKING_ACCOUNTING_WRITE)
  @ApiOperation({ summary: 'Create tax calculation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tax calculation created successfully' })
  async createTaxCalculation(
    @Body() createTaxCalculationDto: CreateTaxCalculationDto,
    @GetTenant() tenantId: string
  ) {
    return this.accountingService.createTaxCalculation(createTaxCalculationDto, tenantId);
  }

  @Get('tax-calculations')
  @Roles(Permission.BANKING_ACCOUNTING_READ)
  @ApiOperation({ summary: 'Get tax calculations' })
  @ApiQuery({ name: 'taxYear', required: false, description: 'Filter by tax year' })
  @ApiQuery({ name: 'jurisdiction', required: false, description: 'Filter by jurisdiction' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tax calculations retrieved successfully' })
  async getTaxCalculations(
    @GetTenant() tenantId: string,
    @Query('taxYear') taxYear?: number,
    @Query('jurisdiction') jurisdiction?: string
  ) {
    const filters: any = {};
    if (taxYear) filters.taxYear = taxYear;
    if (jurisdiction) filters.jurisdiction = jurisdiction;

    return this.accountingService.getTaxCalculations(tenantId, filters);
  }
}