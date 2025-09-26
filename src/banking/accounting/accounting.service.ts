// path: src/banking/accounting/accounting.service.ts
// purpose: Banking Accounting Service - Financial accounting and journal management
// dependencies: Prisma, NestJS, accounting standards (GAAP/IFRS), financial reporting

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  CreateAccountDto, 
  UpdateAccountDto, 
  CreateJournalEntryDto, 
  UpdateJournalEntryDto,
  CreateFinancialStatementDto,
  CreateBankReconciliationDto,
  CreateTaxCalculationDto,
  JournalEntryStatus
} from './dto';
import { chart_of_accounts, journal_entries, journal_entry_lines } from '@prisma/client';

type JournalEntryWithLines = journal_entries & {
  journal_entry_lines: journal_entry_lines[];
};

export interface ChartOfAccountsStructure {
  assets: chart_of_accounts[];
  liabilities: chart_of_accounts[];
  equity: chart_of_accounts[];
  revenue: chart_of_accounts[];
  expenses: chart_of_accounts[];
}

export interface TrialBalance {
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    debitBalance: number;
    creditBalance: number;
    balance: number;
  }>;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface BalanceSheet {
  asOfDate: Date;
  assets: {
    currentAssets: Array<{ code: string; name: string; amount: number }>;
    nonCurrentAssets: Array<{ code: string; name: string; amount: number }>;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: Array<{ code: string; name: string; amount: number }>;
    nonCurrentLiabilities: Array<{ code: string; name: string; amount: number }>;
    totalLiabilities: number;
  };
  equity: {
    equityAccounts: Array<{ code: string; name: string; amount: number }>;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

export interface IncomeStatement {
  periodStart: Date;
  periodEnd: Date;
  revenue: {
    revenueAccounts: Array<{ code: string; name: string; amount: number }>;
    totalRevenue: number;
  };
  expenses: {
    expenseAccounts: Array<{ code: string; name: string; amount: number }>;
    totalExpenses: number;
  };
  grossProfit: number;
  netIncome: number;
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // CHART OF ACCOUNTS MANAGEMENT
  // ============================================================================

  async createAccount(createAccountDto: CreateAccountDto, tenantId: string): Promise<chart_of_accounts> {
    // Check if account code already exists
    const existingAccount = await this.prisma.chart_of_accounts.findFirst({
      where: {
        accountCode: createAccountDto.code,
        tenantId
      }
    });

    if (existingAccount) {
      throw new BadRequestException(`Account with code ${createAccountDto.code} already exists`);
    }

    // Validate parent account if specified
    if (createAccountDto.parentCode) {
      const parentAccount = await this.prisma.chart_of_accounts.findFirst({
        where: {
          accountCode: createAccountDto.parentCode,
          tenantId
        }
      });

      if (!parentAccount) {
        throw new BadRequestException(`Parent account with code ${createAccountDto.parentCode} not found`);
      }
    }

    return this.prisma.chart_of_accounts.create({
      data: {
        id: randomUUID(),
        accountCode: createAccountDto.code,
        accountName: createAccountDto.name,
        description: createAccountDto.description,
        accountType: createAccountDto.type,
        parentAccountId: createAccountDto.parentCode ? (await this.getAccountByCode(createAccountDto.parentCode, tenantId)).id : null,
        isActive: createAccountDto.isActive ?? true,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async getAccounts(tenantId: string, filters?: {
    type?: string;
    parentCode?: string;
    isActive?: boolean;
  }): Promise<chart_of_accounts[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.type) where.accountType = filters.type;
      if (filters.parentCode) {
        const parentAccount = await this.getAccountByCode(filters.parentCode, tenantId);
        where.parentAccountId = parentAccount.id;
      }
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
    }

    return this.prisma.chart_of_accounts.findMany({
      where,
      orderBy: { accountCode: 'asc' }
    });
  }

  async getAccount(id: string, tenantId: string): Promise<chart_of_accounts> {
    const account = await this.prisma.chart_of_accounts.findFirst({
      where: { id, tenantId }
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async getAccountByCode(code: string, tenantId: string): Promise<chart_of_accounts> {
    const account = await this.prisma.chart_of_accounts.findFirst({
      where: { accountCode: code, tenantId }
    });

    if (!account) {
      throw new NotFoundException(`Account with code ${code} not found`);
    }

    return account;
  }

  async updateAccount(id: string, updateAccountDto: UpdateAccountDto, tenantId: string): Promise<chart_of_accounts> {
    const account = await this.getAccount(id, tenantId);

    // If updating code, check for duplicates
    if (updateAccountDto.code && updateAccountDto.code !== account.accountCode) {
      const existingAccount = await this.prisma.chart_of_accounts.findFirst({
        where: {
          accountCode: updateAccountDto.code,
          tenantId,
          id: { not: id }
        }
      });

      if (existingAccount) {
        throw new BadRequestException(`Account with code ${updateAccountDto.code} already exists`);
      }
    }

    return this.prisma.chart_of_accounts.update({
      where: { id: account.id },
      data: updateAccountDto
    });
  }

  async deleteAccount(id: string, tenantId: string): Promise<void> {
    const account = await this.getAccount(id, tenantId);

    // Check if account has child accounts
    const childAccounts = await this.prisma.chart_of_accounts.findMany({
      where: {
        parentAccountId: account.id,
        tenantId
      }
    });

    if (childAccounts.length > 0) {
      throw new BadRequestException('Cannot delete account with child accounts');
    }

    // Check if account has journal entries
    const journalEntries = await this.prisma.journal_entry_lines.findFirst({
      where: {
        accountId: account.id,
        journal_entries: {
          tenantId
        }
      }
    });

    if (journalEntries) {
      throw new BadRequestException('Cannot delete account with journal entries');
    }

    await this.prisma.chart_of_accounts.delete({
      where: { id: account.id }
    });
  }

  async getChartOfAccounts(tenantId: string): Promise<ChartOfAccountsStructure> {
    const accounts = await this.getAccounts(tenantId, { isActive: true });

    return {
      assets: accounts.filter(a => a.accountType === 'ASSET'),
      liabilities: accounts.filter(a => a.accountType === 'LIABILITY'),
      equity: accounts.filter(a => a.accountType === 'EQUITY'),
      revenue: accounts.filter(a => a.accountType === 'REVENUE'),
      expenses: accounts.filter(a => a.accountType === 'EXPENSE')
    };
  }

  // ============================================================================
  // JOURNAL ENTRIES MANAGEMENT
  // ============================================================================

  async createJournalEntry(createJournalEntryDto: CreateJournalEntryDto, tenantId: string): Promise<JournalEntryWithLines> {
    // Generate entry number if not provided
    if (!createJournalEntryDto.entryNumber) {
      createJournalEntryDto.entryNumber = await this.generateJournalEntryNumber(tenantId);
    }

    // Validate that debits equal credits
    const totalDebits = createJournalEntryDto.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredits = createJournalEntryDto.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for small rounding differences
      throw new BadRequestException('Total debits must equal total credits');
    }

    // Validate that all accounts exist
    for (const line of createJournalEntryDto.lines) {
      await this.getAccountByCode(line.accountCode, tenantId);
    }

    // First create the journal entry
    const journalEntry = await this.prisma.journal_entries.create({
      data: {
        id: randomUUID(),
        entryNumber: createJournalEntryDto.entryNumber,
        date: createJournalEntryDto.date,
        description: createJournalEntryDto.description,
        reference: createJournalEntryDto.reference,
        status: createJournalEntryDto.status || 'DRAFT',
        totalDebit: totalDebits,
        totalCredit: totalCredits,
        createdById: createJournalEntryDto.createdBy,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Then create the journal entry lines
    const lines = await Promise.all(createJournalEntryDto.lines.map(async line => {
      const account = await this.getAccountByCode(line.accountCode, tenantId);
      return this.prisma.journal_entry_lines.create({
        data: {
          id: randomUUID(),
          journalEntryId: journalEntry.id,
          accountId: account.id,
          description: line.description,
          debitAmount: line.debitAmount || 0,
          creditAmount: line.creditAmount || 0,
        }
      });
    }));

    // Return the journal entry with lines
    return {
      ...journalEntry,
      journal_entry_lines: lines
    } as JournalEntryWithLines;
  }

  async getJournalEntries(tenantId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    accountCode?: string;
  }): Promise<JournalEntryWithLines[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.startDate || filters.endDate) {
        where.date = {};
        if (filters.startDate) where.date.gte = filters.startDate;
        if (filters.endDate) where.date.lte = filters.endDate;
      }
      if (filters.accountCode) {
        where.lines = {
          some: {
            accountCode: filters.accountCode
          }
        };
      }
    }

    return this.prisma.journal_entries.findMany({
      where,
      include: {
        journal_entry_lines: true
      },
      orderBy: { date: 'desc' }
    });
  }

  async getJournalEntry(id: string, tenantId: string): Promise<JournalEntryWithLines> {
    const entry = await this.prisma.journal_entries.findFirst({
      where: { id, tenantId },
      include: {
        journal_entry_lines: true
      }
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry as JournalEntryWithLines;
  }

  async updateJournalEntry(id: string, updateJournalEntryDto: UpdateJournalEntryDto, tenantId: string): Promise<JournalEntryWithLines> {
    const entry = await this.getJournalEntry(id, tenantId);

    // Cannot update posted entries
    if (entry.status === 'POSTED') {
      throw new BadRequestException('Cannot update posted journal entries');
    }

    const updated = await this.prisma.journal_entries.update({
      where: { id: entry.id },
      data: updateJournalEntryDto,
      include: {
        journal_entry_lines: true
      }
    });
    
    return updated as JournalEntryWithLines;
  }

  async postJournalEntry(id: string, postedBy: string, tenantId: string): Promise<JournalEntryWithLines> {
    const entry = await this.getJournalEntry(id, tenantId);

    if (entry.status === 'POSTED') {
      throw new BadRequestException('Journal entry is already posted');
    }

    // Update account balances
    for (const line of entry.journal_entry_lines) {
      const account = await this.prisma.chart_of_accounts.findUnique({ where: { id: line.accountId } });
      await this.updateAccountBalance(account.accountCode, Number(line.debitAmount), Number(line.creditAmount), tenantId);
    }

    const updated = await this.prisma.journal_entries.update({
      where: { id: entry.id },
      data: {
        status: 'POSTED',
        approvedById: postedBy,
        approvedAt: new Date()
      },
      include: {
        journal_entry_lines: true
      }
    });
    
    return updated as JournalEntryWithLines;
  }

  async reverseJournalEntry(id: string, reversedBy: string, tenantId: string): Promise<JournalEntryWithLines> {
    const originalEntry = await this.getJournalEntry(id, tenantId);

    if (originalEntry.status !== 'POSTED') {
      throw new BadRequestException('Can only reverse posted journal entries');
    }

    // Create reversing entry
    const reversingLines = await Promise.all(originalEntry.journal_entry_lines.map(async line => {
      const account = await this.prisma.chart_of_accounts.findUnique({ where: { id: line.accountId } });
      return {
        accountCode: account.accountCode,
        description: `Reversal of ${line.description}`,
        debitAmount: Number(line.creditAmount), // Swap debits and credits
        creditAmount: Number(line.debitAmount)
      };
    }));

    const reversingEntry = await this.createJournalEntry({
      entryNumber: await this.generateJournalEntryNumber(tenantId),
      date: new Date(),
      description: `Reversal of ${originalEntry.description}`,
      reference: `REV-${originalEntry.entryNumber}`,
      status: JournalEntryStatus.DRAFT,
      createdBy: reversedBy,
      lines: reversingLines
    }, tenantId);

    // Post the reversing entry
    await this.postJournalEntry(reversingEntry.id, reversedBy, tenantId);

    return reversingEntry;
  }

  private async generateJournalEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE${year}`;
    
    const lastEntry = await this.prisma.journal_entries.findFirst({
      where: {
        tenantId,
        entryNumber: {
          startsWith: prefix
        }
      },
      orderBy: { entryNumber: 'desc' }
    });

    let nextNumber = 1;
    if (lastEntry) {
      const lastNumber = parseInt(lastEntry.entryNumber.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
  }

  private async updateAccountBalance(accountCode: string, debitAmount: number, creditAmount: number, tenantId: string): Promise<void> {
    const account = await this.getAccountByCode(accountCode, tenantId);
    
    let _balanceChange = 0;
    
    // Calculate balance change based on account type
    switch (account.accountType) {
      case 'ASSET':
      case 'EXPENSE':
        _balanceChange = debitAmount - creditAmount;
        break;
      case 'LIABILITY':
      case 'EQUITY':
      case 'REVENUE':
        _balanceChange = creditAmount - debitAmount;
        break;
    }

    // Note: Balance is calculated dynamically from journal entries
    // No need to update a balance field as it doesn't exist in the schema
  }

  // ============================================================================
  // FINANCIAL REPORTING
  // ============================================================================

  async generateTrialBalance(asOfDate: Date, tenantId: string): Promise<TrialBalance> {
    // Get all accounts with their balances as of the specified date
    const accounts = await this.prisma.chart_of_accounts.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' }
    });

    const trialBalanceAccounts = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      // Calculate balance as of date by summing journal entry lines
      const lines = await this.prisma.journal_entry_lines.findMany({
        where: {
          accountId: account.id,
          journal_entries: {
            tenantId,
            date: { lte: asOfDate },
            status: 'POSTED'
          }
        }
      });

      const totalDebitsForAccount = lines.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
      const totalCreditsForAccount = lines.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);

      let balance = 0;
      let debitBalance = 0;
      let creditBalance = 0;

      // Calculate normal balance based on account type
      switch (account.accountType) {
        case 'ASSET':
        case 'EXPENSE':
          balance = totalDebitsForAccount - totalCreditsForAccount;
          if (balance >= 0) {
            debitBalance = balance;
          } else {
            creditBalance = Math.abs(balance);
          }
          break;
        case 'LIABILITY':
        case 'EQUITY':
        case 'REVENUE':
          balance = totalCreditsForAccount - totalDebitsForAccount;
          if (balance >= 0) {
            creditBalance = balance;
          } else {
            debitBalance = Math.abs(balance);
          }
          break;
      }

      if (debitBalance !== 0 || creditBalance !== 0) {
        trialBalanceAccounts.push({
          code: account.accountCode,
          name: account.accountName,
          type: account.accountType,
          debitBalance,
          creditBalance,
          balance: debitBalance - creditBalance
        });

        totalDebits += debitBalance;
        totalCredits += creditBalance;
      }
    }

    return {
      accounts: trialBalanceAccounts,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    };
  }

  async generateBalanceSheet(asOfDate: Date, tenantId: string): Promise<BalanceSheet> {
    const trialBalance = await this.generateTrialBalance(asOfDate, tenantId);
    
    const assets = trialBalance.accounts.filter(a => a.type === 'ASSET');
    const liabilities = trialBalance.accounts.filter(a => a.type === 'LIABILITY');
    const equity = trialBalance.accounts.filter(a => a.type === 'EQUITY');

    // Separate current and non-current (this would be enhanced with account classifications)
    const currentAssets = assets.filter(a => a.code.startsWith('1')); // Simplified classification
    const nonCurrentAssets = assets.filter(a => !a.code.startsWith('1'));
    const currentLiabilities = liabilities.filter(a => a.code.startsWith('2'));
    const nonCurrentLiabilities = liabilities.filter(a => !a.code.startsWith('2'));

    const totalAssets = assets.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalEquity = equity.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      asOfDate,
      assets: {
        currentAssets: currentAssets.map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) })),
        nonCurrentAssets: nonCurrentAssets.map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) })),
        totalAssets
      },
      liabilities: {
        currentLiabilities: currentLiabilities.map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) })),
        nonCurrentLiabilities: nonCurrentLiabilities.map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) })),
        totalLiabilities
      },
      equity: {
        equityAccounts: equity.map(a => ({ code: a.code, name: a.name, amount: Math.abs(a.balance) })),
        totalEquity
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity
    };
  }

  async generateIncomeStatement(periodStart: Date, periodEnd: Date, tenantId: string): Promise<IncomeStatement> {
    // Get revenue and expense accounts for the period
    const revenueAccounts = await this.getAccountBalancesForPeriod('REVENUE', periodStart, periodEnd, tenantId);
    const expenseAccounts = await this.getAccountBalancesForPeriod('EXPENSE', periodStart, periodEnd, tenantId);

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.amount, 0);

    return {
      periodStart,
      periodEnd,
      revenue: {
        revenueAccounts,
        totalRevenue
      },
      expenses: {
        expenseAccounts,
        totalExpenses
      },
      grossProfit: totalRevenue, // Simplified - would need COGS calculation
      netIncome: totalRevenue - totalExpenses
    };
  }

  private async getAccountBalancesForPeriod(
    accountType: string, 
    periodStart: Date, 
    periodEnd: Date, 
    tenantId: string
  ): Promise<Array<{ code: string; name: string; amount: number }>> {
    const accounts = await this.prisma.chart_of_accounts.findMany({
      where: { tenantId, accountType: accountType, isActive: true }
    });

    const accountBalances = [];

    for (const account of accounts) {
      const lines = await this.prisma.journal_entry_lines.findMany({
        where: {
          accountId: account.id,
          journal_entries: {
            tenantId,
            date: { gte: periodStart, lte: periodEnd },
            status: 'POSTED'
          }
        }
      });

      const totalDebits = lines.reduce((sum, line) => sum + line.debitAmount.toNumber(), 0);
      const totalCredits = lines.reduce((sum, line) => sum + line.creditAmount.toNumber(), 0);

      let amount = 0;
      if (accountType === 'REVENUE') {
        amount = totalCredits - totalDebits;
      } else if (accountType === 'EXPENSE') {
        amount = totalDebits - totalCredits;
      }

      if (amount !== 0) {
        accountBalances.push({
          code: account.accountCode,
          name: account.accountName,
          amount: Math.abs(amount)
        });
      }
    }

    return accountBalances;
  }

  // ============================================================================
  // FINANCIAL STATEMENTS STORAGE
  // ============================================================================

  async createFinancialStatement(_createFinancialStatementDto: CreateFinancialStatementDto, _tenantId: string): Promise<any> {
    // TODO: Implement when financial_statements model is added to schema
    throw new Error('Financial statement storage not implemented - model not found in schema');
  }

  async getFinancialStatements(tenantId: string, filters?: {
    statementType?: string;
    asOfDate?: Date;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<any[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.statementType) where.statementType = filters.statementType;
      if (filters.asOfDate) where.asOfDate = filters.asOfDate;
      if (filters.periodStart) where.periodStart = filters.periodStart;
      if (filters.periodEnd) where.periodEnd = filters.periodEnd;
    }

    // TODO: Implement when financial_statements model is added to schema
    throw new Error('Financial statement retrieval not implemented - model not found in schema');
  }

  // ============================================================================
  // BANK RECONCILIATION
  // ============================================================================

  async createBankReconciliation(_createBankReconciliationDto: CreateBankReconciliationDto, _tenantId: string): Promise<any> {
    // TODO: Implement when bank_reconciliations model is added to schema
    throw new Error('Bank reconciliation storage not implemented - model not found in schema');
  }

  async getBankReconciliations(tenantId: string, filters?: {
    bankAccountCode?: string;
    status?: string;
    statementDate?: Date;
  }): Promise<any[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.bankAccountCode) where.bankAccountCode = filters.bankAccountCode;
      if (filters.status) where.status = filters.status;
      if (filters.statementDate) where.statementDate = filters.statementDate;
    }

    // TODO: Implement when bank_reconciliations model is added to schema
    throw new Error('Bank reconciliation retrieval not implemented - model not found in schema');
  }

  // ============================================================================
  // TAX CALCULATIONS
  // ============================================================================

  async createTaxCalculation(_createTaxCalculationDto: CreateTaxCalculationDto, _tenantId: string): Promise<any> {
    // TODO: Implement when tax_calculations model is added to schema
    throw new Error('Tax calculation storage not implemented - model not found in schema');
  }

  async getTaxCalculations(tenantId: string, filters?: {
    taxYear?: number;
    jurisdiction?: string;
  }): Promise<any[]> {
    const where: any = { tenantId };

    if (filters) {
      if (filters.taxYear) where.taxYear = filters.taxYear;
      if (filters.jurisdiction) where.jurisdiction = filters.jurisdiction;
    }

    // TODO: Implement when tax_calculations model is added to schema
    throw new Error('Tax calculation retrieval not implemented - model not found in schema');
  }
}
