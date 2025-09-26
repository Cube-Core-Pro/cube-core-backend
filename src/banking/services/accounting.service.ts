// path: src/banking/services/accounting.service.ts
// purpose: Professional Accounting Service - GAAP/IFRS compliant, automated journal entries, financial reporting
// dependencies: ConfigService, Prisma, Redis, financial calculation libraries, tax APIs

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// TODO: Add Redis injection when Redis module is properly configured
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import Redis from 'ioredis';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

export interface ChartOfAccounts {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  accountSubType: string;
  parentAccount?: string;
  isActive: boolean;
  normalBalance: 'DEBIT' | 'CREDIT';
  description: string;
  taxCode?: string;
  departmentCode?: string;
  createdDate: Date;
  lastModified: Date;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  postingDate: Date;
  description: string;
  reference: string;
  source: 'MANUAL' | 'AUTOMATED' | 'IMPORT' | 'SYSTEM';
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  totalDebit: number;
  totalCredit: number;
  currency: string;
  exchangeRate?: number;
  lineItems: JournalLineItem[];
  createdBy: string;
  approvedBy?: string;
  reversalEntry?: string;
  attachments: string[];
  tags: string[];
}

export interface JournalLineItem {
  lineNumber: number;
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  currency: string;
  exchangeRate?: number;
  baseCurrencyAmount: number;
  taxCode?: string;
  departmentCode?: string;
  projectCode?: string;
  customerId?: string;
  vendorId?: string;
  invoiceId?: string;
}

export interface TrialBalance {
  asOfDate: Date;
  currency: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  generatedDate: Date;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  beginningBalance: number;
  debitMovements: number;
  creditMovements: number;
  endingBalance: number;
}

export interface FinancialStatement {
  statementType: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'EQUITY_STATEMENT';
  asOfDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  currency: string;
  reportingStandard: 'GAAP' | 'IFRS';
  data: any;
  generatedDate: Date;
  generatedBy: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountCode: string;
  statementDate: Date;
  statementBalance: number;
  bookBalance: number;
  reconciledBalance: number;
  outstandingDeposits: ReconciliationItem[];
  outstandingChecks: ReconciliationItem[];
  bankAdjustments: ReconciliationItem[];
  bookAdjustments: ReconciliationItem[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEWED';
  reconciledBy: string;
  reviewedBy?: string;
  notes: string[];
}

export interface ReconciliationItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  reference: string;
  cleared: boolean;
  clearedDate?: Date;
}

export interface TaxCalculation {
  jurisdiction: string;
  taxType: 'INCOME' | 'SALES' | 'VAT' | 'PAYROLL' | 'PROPERTY';
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  exemptAmount?: number;
  deductions?: number;
  credits?: number;
  calculationDate: Date;
  taxPeriod: {
    startDate: Date;
    endDate: Date;
  };
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);
  private readonly baseCurrency: string;
  private readonly reportingStandard: 'GAAP' | 'IFRS';
  
  // TODO: Remove when Redis is properly configured
  private readonly tempStorage = new Map<string, any>();
  
  // Helper methods to simulate Redis operations
  private async tempGet(key: string): Promise<string | null> {
    return this.tempStorage.get(key) || null;
  }
  
  private async tempSet(key: string, value: string): Promise<void> {
    this.tempStorage.set(key, value);
  }
  
  private async tempSetex(key: string, seconds: number, value: string): Promise<void> {
    this.tempStorage.set(key, value);
    // Note: TTL not implemented in temp storage
  }

  constructor(
    private readonly cfg: ConfigService,
    // TODO: Add Redis injection when Redis module is properly configured
    // @InjectRedis() private readonly redis: Redis,
    @InjectQueue('accounting') private readonly accountingQueue: Queue,
  ) {
    this.baseCurrency = this.cfg.get('BASE_CURRENCY', 'USD');
    this.reportingStandard = this.cfg.get('REPORTING_STANDARD', 'GAAP') as 'GAAP' | 'IFRS';
  }

  // ============================================================================
  // CHART OF ACCOUNTS MANAGEMENT
  // ============================================================================

  async createAccount(accountData: Partial<ChartOfAccounts>): Promise<ChartOfAccounts> {
    try {
      const account: ChartOfAccounts = {
        accountCode: accountData.accountCode || this.generateAccountCode(accountData.accountType!),
        accountName: accountData.accountName!,
        accountType: accountData.accountType!,
        accountSubType: accountData.accountSubType!,
        parentAccount: accountData.parentAccount,
        isActive: accountData.isActive ?? true,
        normalBalance: this.getNormalBalance(accountData.accountType!),
        description: accountData.description || '',
        taxCode: accountData.taxCode,
        departmentCode: accountData.departmentCode,
        createdDate: new Date(),
        lastModified: new Date()
      };

      // TODO: Replace with Redis when properly configured
      // Store account
      const key = `accounting:account:${account.accountCode}`;
      this.tempStorage.set(key, JSON.stringify(account));

      // Add to accounts index
      const allAccounts = this.tempStorage.get('accounting:accounts:all') || new Set();
      allAccounts.add(account.accountCode);
      this.tempStorage.set('accounting:accounts:all', allAccounts);
      
      const typeAccounts = this.tempStorage.get(`accounting:accounts:${account.accountType}`) || new Set();
      typeAccounts.add(account.accountCode);
      this.tempStorage.set(`accounting:accounts:${account.accountType}`, typeAccounts);

      this.logger.log(`Created account ${account.accountCode}: ${account.accountName}`);
      return account;
    } catch (error) {
      this.logger.error(`Error creating account: ${error.message}`);
      throw error;
    }
  }

  async getAccount(accountCode: string): Promise<ChartOfAccounts | null> {
    try {
      // TODO: Replace with Redis when properly configured
      const key = `accounting:account:${accountCode}`;
      const data = this.tempStorage.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting account: ${error.message}`);
      return null;
    }
  }

  async getChartOfAccounts(): Promise<ChartOfAccounts[]> {
    try {
      // TODO: Replace with Redis when properly configured
      const accountCodes = Array.from(this.tempStorage.get('accounting:accounts:all') || new Set());
      const accounts: ChartOfAccounts[] = [];

      for (const code of accountCodes) {
        const account = await this.getAccount(code as string);
        if (account && account.isActive) {
          accounts.push(account);
        }
      }

      return accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    } catch (error) {
      this.logger.error(`Error getting chart of accounts: ${error.message}`);
      return [];
    }
  }

  private generateAccountCode(accountType: string): string {
    const prefixes = {
      'ASSET': '1',
      'LIABILITY': '2',
      'EQUITY': '3',
      'REVENUE': '4',
      'EXPENSE': '5'
    };
    
    const prefix = prefixes[accountType] || '9';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }

  private getNormalBalance(accountType: string): 'DEBIT' | 'CREDIT' {
    const debitAccounts = ['ASSET', 'EXPENSE'];
    return debitAccounts.includes(accountType) ? 'DEBIT' : 'CREDIT';
  }

  // ============================================================================
  // JOURNAL ENTRIES
  // ============================================================================

  async createJournalEntry(entryData: Partial<JournalEntry>): Promise<JournalEntry> {
    try {
      // Validate entry
      this.validateJournalEntry(entryData);

      const entry: JournalEntry = {
        id: `je_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entryNumber: entryData.entryNumber || this.generateEntryNumber(),
        entryDate: entryData.entryDate || new Date(),
        postingDate: entryData.postingDate || new Date(),
        description: entryData.description!,
        reference: entryData.reference || '',
        source: entryData.source || 'MANUAL',
        status: 'DRAFT',
        totalDebit: 0,
        totalCredit: 0,
        currency: entryData.currency || this.baseCurrency,
        exchangeRate: entryData.exchangeRate || 1,
        lineItems: entryData.lineItems || [],
        createdBy: entryData.createdBy!,
        attachments: entryData.attachments || [],
        tags: entryData.tags || []
      };

      // Calculate totals
      entry.totalDebit = entry.lineItems.reduce((sum, item) => sum + item.debitAmount, 0);
      entry.totalCredit = entry.lineItems.reduce((sum, item) => sum + item.creditAmount, 0);

      // Validate balanced entry
      if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
        throw new Error('Journal entry is not balanced');
      }

      // TODO: Replace with Redis when properly configured
      // Store entry
      const key = `accounting:journal:${entry.id}`;
      this.tempStorage.set(key, JSON.stringify(entry));

      // Add to entries index
      const allEntries = this.tempStorage.get('accounting:journal:all') || [];
      allEntries.push({ score: Date.now(), value: entry.id });
      this.tempStorage.set('accounting:journal:all', allEntries);

      this.logger.log(`Created journal entry ${entry.entryNumber}`);
      return entry;
    } catch (error) {
      this.logger.error(`Error creating journal entry: ${error.message}`);
      throw error;
    }
  }

  async postJournalEntry(entryId: string, approvedBy: string): Promise<void> {
    try {
      const entry = await this.getJournalEntry(entryId);
      if (!entry) throw new Error('Journal entry not found');

      if (entry.status !== 'DRAFT') {
        throw new Error('Only draft entries can be posted');
      }

      // Update entry status
      entry.status = 'POSTED';
      entry.approvedBy = approvedBy;

      // TODO: Replace with Redis when properly configured
      // Store updated entry
      const key = `accounting:journal:${entry.id}`;
      await this.tempSetex(key, 86400 * 365 * 7, JSON.stringify(entry));

      // Update account balances
      await this.updateAccountBalances(entry);

      // Queue for financial statement updates
      await this.accountingQueue.add('update-financial-statements', {
        entryId: entry.id,
        entryDate: entry.entryDate
      });

      this.logger.log(`Posted journal entry ${entry.entryNumber}`);
    } catch (error) {
      this.logger.error(`Error posting journal entry: ${error.message}`);
      throw error;
    }
  }

  async getJournalEntry(entryId: string): Promise<JournalEntry | null> {
    try {
      const key = `accounting:journal:${entryId}`;
      const data = await this.tempGet(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Error getting journal entry: ${error.message}`);
      return null;
    }
  }

  private validateJournalEntry(entryData: Partial<JournalEntry>): void {
    if (!entryData.description) {
      throw new Error('Journal entry description is required');
    }

    if (!entryData.lineItems || entryData.lineItems.length < 2) {
      throw new Error('Journal entry must have at least 2 line items');
    }

    if (!entryData.createdBy) {
      throw new Error('Created by is required');
    }

    // Validate line items
    for (const item of entryData.lineItems) {
      if (!item.accountCode) {
        throw new Error('Account code is required for all line items');
      }

      if (item.debitAmount < 0 || item.creditAmount < 0) {
        throw new Error('Debit and credit amounts must be positive');
      }

      if (item.debitAmount > 0 && item.creditAmount > 0) {
        throw new Error('Line item cannot have both debit and credit amounts');
      }

      if (item.debitAmount === 0 && item.creditAmount === 0) {
        throw new Error('Line item must have either debit or credit amount');
      }
    }
  }

  private generateEntryNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `JE${year}${month}${timestamp}`;
  }

  private async updateAccountBalances(entry: JournalEntry): Promise<void> {
    try {
      for (const lineItem of entry.lineItems) {
        const balanceKey = `accounting:balance:${lineItem.accountCode}`;
        const currentBalance = parseFloat(await this.tempGet(balanceKey) || '0');
        
        // Determine balance change based on account normal balance
        const account = await this.getAccount(lineItem.accountCode);
        if (!account) continue;

        let balanceChange = 0;
        if (account.normalBalance === 'DEBIT') {
          balanceChange = lineItem.debitAmount - lineItem.creditAmount;
        } else {
          balanceChange = lineItem.creditAmount - lineItem.debitAmount;
        }

        const newBalance = currentBalance + balanceChange;
        await this.tempSet(balanceKey, newBalance.toString());
      }
    } catch (error) {
      this.logger.error(`Error updating account balances: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // FINANCIAL STATEMENTS
  // ============================================================================

  async generateTrialBalance(asOfDate: Date): Promise<TrialBalance> {
    try {
      const accounts = await this.getChartOfAccounts();
      const trialBalanceAccounts: TrialBalanceAccount[] = [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of accounts) {
        const balance = await this.getAccountBalance(account.accountCode, asOfDate);
        const movements = await this.getAccountMovements(account.accountCode, asOfDate);

        const tbAccount: TrialBalanceAccount = {
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          beginningBalance: movements.beginningBalance,
          debitMovements: movements.totalDebits,
          creditMovements: movements.totalCredits,
          endingBalance: balance
        };

        trialBalanceAccounts.push(tbAccount);

        if (account.normalBalance === 'DEBIT' && balance > 0) {
          totalDebits += balance;
        } else if (account.normalBalance === 'CREDIT' && balance > 0) {
          totalCredits += balance;
        }
      }

      const trialBalance: TrialBalance = {
        asOfDate,
        currency: this.baseCurrency,
        accounts: trialBalanceAccounts,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        generatedDate: new Date()
      };

      return trialBalance;
    } catch (error) {
      this.logger.error(`Error generating trial balance: ${error.message}`);
      throw error;
    }
  }

  async generateBalanceSheet(asOfDate: Date): Promise<FinancialStatement> {
    try {
      const _accounts = await this.getChartOfAccounts();
      const assets = await this.getAccountsByType('ASSET', asOfDate);
      const liabilities = await this.getAccountsByType('LIABILITY', asOfDate);
      const equity = await this.getAccountsByType('EQUITY', asOfDate);

      const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
      const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

      const balanceSheet: FinancialStatement = {
        statementType: 'BALANCE_SHEET',
        asOfDate,
        currency: this.baseCurrency,
        reportingStandard: this.reportingStandard,
        data: {
          assets: {
            accounts: assets,
            total: totalAssets
          },
          liabilities: {
            accounts: liabilities,
            total: totalLiabilities
          },
          equity: {
            accounts: equity,
            total: totalEquity
          },
          balanceCheck: {
            assetsTotal: totalAssets,
            liabilitiesAndEquityTotal: totalLiabilities + totalEquity,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
          }
        },
        generatedDate: new Date(),
        generatedBy: 'system'
      };

      return balanceSheet;
    } catch (error) {
      this.logger.error(`Error generating balance sheet: ${error.message}`);
      throw error;
    }
  }

  async generateIncomeStatement(
    periodStart: Date,
    periodEnd: Date
  ): Promise<FinancialStatement> {
    try {
      const revenue = await this.getAccountsByType('REVENUE', periodEnd, periodStart);
      const expenses = await this.getAccountsByType('EXPENSE', periodEnd, periodStart);

      const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
      const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
      const netIncome = totalRevenue - totalExpenses;

      const incomeStatement: FinancialStatement = {
        statementType: 'INCOME_STATEMENT',
        asOfDate: periodEnd,
        periodStart,
        periodEnd,
        currency: this.baseCurrency,
        reportingStandard: this.reportingStandard,
        data: {
          revenue: {
            accounts: revenue,
            total: totalRevenue
          },
          expenses: {
            accounts: expenses,
            total: totalExpenses
          },
          netIncome,
          margins: {
            grossMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
            netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
          }
        },
        generatedDate: new Date(),
        generatedBy: 'system'
      };

      return incomeStatement;
    } catch (error) {
      this.logger.error(`Error generating income statement: ${error.message}`);
      throw error;
    }
  }

  private async getAccountBalance(accountCode: string, _asOfDate?: Date): Promise<number> {
    try {
      const balanceKey = `accounting:balance:${accountCode}`;
      const balance = await this.tempGet(balanceKey);
      return balance ? parseFloat(balance) : 0;
    } catch (error) {
      this.logger.error(`Error getting account balance: ${error.message}`);
      return 0;
    }
  }

  private async getAccountMovements(_accountCode: string, _asOfDate: Date): Promise<any> {
    // This would typically query the database for account movements
    // For now, return mock data
    return {
      beginningBalance: 0,
      totalDebits: 0,
      totalCredits: 0
    };
  }

  private async getAccountsByType(
    accountType: string,
    asOfDate: Date,
    _periodStart?: Date
  ): Promise<any[]> {
    try {
      // TODO: Replace with Redis when properly configured
      const accountCodes = Array.from(this.tempStorage.get(`accounting:accounts:${accountType}`) || new Set());
      const accounts = [];

      for (const code of accountCodes) {
        const account = await this.getAccount(code as string);
        if (account && account.isActive) {
          const balance = await this.getAccountBalance(code as string, asOfDate);
          accounts.push({
            accountCode: code,
            accountName: account.accountName,
            balance: Math.abs(balance) // Always show positive for financial statements
          });
        }
      }

      return accounts;
    } catch (error) {
      this.logger.error(`Error getting accounts by type: ${error.message}`);
      return [];
    }
  }

  // ============================================================================
  // BANK RECONCILIATION
  // ============================================================================

  async createBankReconciliation(
    bankAccountCode: string,
    statementDate: Date,
    statementBalance: number,
    reconciledBy: string
  ): Promise<BankReconciliation> {
    try {
      const bookBalance = await this.getAccountBalance(bankAccountCode, statementDate);

      const reconciliation: BankReconciliation = {
        id: `recon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        bankAccountCode,
        statementDate,
        statementBalance,
        bookBalance,
        reconciledBalance: bookBalance,
        outstandingDeposits: [],
        outstandingChecks: [],
        bankAdjustments: [],
        bookAdjustments: [],
        status: 'IN_PROGRESS',
        reconciledBy,
        notes: []
      };

      // Store reconciliation
      const key = `accounting:reconciliation:${reconciliation.id}`;
      await this.tempSetex(key, 86400 * 365, JSON.stringify(reconciliation));

      this.logger.log(`Created bank reconciliation ${reconciliation.id}`);
      return reconciliation;
    } catch (error) {
      this.logger.error(`Error creating bank reconciliation: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // TAX CALCULATIONS
  // ============================================================================

  async calculateIncomeTax(
    taxableIncome: number,
    jurisdiction: string,
    taxYear: number
  ): Promise<TaxCalculation> {
    try {
      // Mock tax calculation - in production, use actual tax tables/APIs
      const taxRates = {
        'US': 0.21, // Corporate tax rate
        'CA': 0.26,
        'UK': 0.19,
        'DE': 0.30
      };

      const taxRate = taxRates[jurisdiction] || 0.25;
      const taxAmount = taxableIncome * taxRate;

      const calculation: TaxCalculation = {
        jurisdiction,
        taxType: 'INCOME',
        taxableAmount: taxableIncome,
        taxRate,
        taxAmount,
        calculationDate: new Date(),
        taxPeriod: {
          startDate: new Date(taxYear, 0, 1),
          endDate: new Date(taxYear, 11, 31)
        }
      };

      return calculation;
    } catch (error) {
      this.logger.error(`Error calculating income tax: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // AUTOMATED ENTRIES
  // ============================================================================

  async createBankingTransactionEntry(
    transactionId: string,
    transactionData: any
  ): Promise<JournalEntry> {
    try {
      const lineItems: JournalLineItem[] = [];

      // Determine accounts based on transaction type
      if (transactionData.type === 'DEPOSIT') {
        lineItems.push({
          lineNumber: 1,
          accountCode: '1001', // Cash account
          accountName: 'Cash - Operating Account',
          description: `Deposit - ${transactionData.description}`,
          debitAmount: transactionData.amount,
          creditAmount: 0,
          currency: transactionData.currency,
          baseCurrencyAmount: transactionData.amount,
          customerId: transactionData.customerId
        });

        lineItems.push({
          lineNumber: 2,
          accountCode: '4001', // Revenue account
          accountName: 'Service Revenue',
          description: `Revenue - ${transactionData.description}`,
          debitAmount: 0,
          creditAmount: transactionData.amount,
          currency: transactionData.currency,
          baseCurrencyAmount: transactionData.amount,
          customerId: transactionData.customerId
        });
      } else if (transactionData.type === 'WITHDRAWAL') {
        lineItems.push({
          lineNumber: 1,
          accountCode: '5001', // Expense account
          accountName: 'Operating Expenses',
          description: `Expense - ${transactionData.description}`,
          debitAmount: transactionData.amount,
          creditAmount: 0,
          currency: transactionData.currency,
          baseCurrencyAmount: transactionData.amount,
          customerId: transactionData.customerId
        });

        lineItems.push({
          lineNumber: 2,
          accountCode: '1001', // Cash account
          accountName: 'Cash - Operating Account',
          description: `Payment - ${transactionData.description}`,
          debitAmount: 0,
          creditAmount: transactionData.amount,
          currency: transactionData.currency,
          baseCurrencyAmount: transactionData.amount,
          customerId: transactionData.customerId
        });
      }

      const entry = await this.createJournalEntry({
        description: `Banking Transaction - ${transactionData.description}`,
        reference: transactionId,
        source: 'AUTOMATED',
        currency: transactionData.currency,
        lineItems,
        createdBy: 'system',
        tags: ['banking', 'automated']
      });

      // Auto-post automated entries
      await this.postJournalEntry(entry.id, 'system');

      return entry;
    } catch (error) {
      this.logger.error(`Error creating banking transaction entry: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  async getAccountingDashboard(): Promise<any> {
    try {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const yearStart = new Date(today.getFullYear(), 0, 1);

      const [
        trialBalance,
        monthlyIncome,
        yearlyIncome
      ] = await Promise.all([
        this.generateTrialBalance(today),
        this.generateIncomeStatement(monthStart, today),
        this.generateIncomeStatement(yearStart, today)
      ]);

      return {
        trialBalance: {
          isBalanced: trialBalance.isBalanced,
          totalDebits: trialBalance.totalDebits,
          totalCredits: trialBalance.totalCredits,
          accountCount: trialBalance.accounts.length
        },
        monthlyPerformance: {
          revenue: monthlyIncome.data.revenue.total,
          expenses: monthlyIncome.data.expenses.total,
          netIncome: monthlyIncome.data.netIncome,
          netMargin: monthlyIncome.data.margins.netMargin
        },
        yearlyPerformance: {
          revenue: yearlyIncome.data.revenue.total,
          expenses: yearlyIncome.data.expenses.total,
          netIncome: yearlyIncome.data.netIncome,
          netMargin: yearlyIncome.data.margins.netMargin
        },
        recentEntries: await this.getRecentJournalEntries(10),
        pendingReconciliations: await this.getPendingReconciliations()
      };
    } catch (error) {
      this.logger.error(`Error getting accounting dashboard: ${error.message}`);
      throw error;
    }
  }

  private async getRecentJournalEntries(limit: number): Promise<any[]> {
    try {
      // TODO: Replace with Redis when properly configured
      const allEntries = this.tempStorage.get('accounting:journal:all') || [];
      const sortedEntries = allEntries.sort((a: any, b: any) => b.score - a.score);
      const entryIds = sortedEntries.slice(0, limit).map((item: any) => item.value);
      const entries = [];

      for (const entryId of entryIds) {
        const entry = await this.getJournalEntry(entryId);
        if (entry) {
          entries.push({
            id: entry.id,
            entryNumber: entry.entryNumber,
            entryDate: entry.entryDate,
            description: entry.description,
            totalDebit: entry.totalDebit,
            status: entry.status
          });
        }
      }

      return entries;
    } catch (error) {
      this.logger.error(`Error getting recent journal entries: ${error.message}`);
      return [];
    }
  }

  private async getPendingReconciliations(): Promise<any[]> {
    // This would query for pending reconciliations
    // For now, return empty array
    return [];
  }
}