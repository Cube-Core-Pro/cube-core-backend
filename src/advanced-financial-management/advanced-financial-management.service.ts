import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Fortune500FinancialManagementConfig } from '../types/fortune500-types';

export interface FinancialDashboard {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  ebitda: number;
  cashFlow: number;
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  returnOnAssets: number;
  returnOnEquity: number;
}

export interface BudgetAnalysis {
  budgetId: string;
  department: string;
  period: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'under_budget' | 'on_budget' | 'over_budget';
  forecast: number;
  remainingBudget: number;
  burnRate: number;
}

export interface CashFlowForecast {
  forecastId: string;
  period: string;
  openingBalance: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  closingBalance: number;
  confidence: number;
  scenarios: CashFlowScenario[];
}

export interface CashFlowScenario {
  name: 'optimistic' | 'realistic' | 'pessimistic';
  probability: number;
  netCashFlow: number;
  closingBalance: number;
  keyAssumptions: string[];
}

export interface FinancialRatio {
  name: string;
  value: number;
  benchmark: number;
  industry: number;
  trend: 'improving' | 'stable' | 'declining';
  category: 'liquidity' | 'profitability' | 'efficiency' | 'leverage';
  interpretation: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  monitoringMetrics: string[];
}

export interface RiskFactor {
  type: 'credit' | 'market' | 'operational' | 'liquidity' | 'regulatory';
  description: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  riskValue: number;
  mitigation: string;
}

export interface InvestmentAnalysis {
  investmentId: string;
  name: string;
  type: 'capex' | 'acquisition' | 'r_and_d' | 'marketing' | 'technology';
  amount: number;
  expectedReturn: number;
  paybackPeriod: number;
  npv: number;
  irr: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'proposed' | 'approved' | 'in_progress' | 'completed';
  businessCase: string;
}

export interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number;
  lastAudit: Date;
  nextAudit: Date;
  findings: ComplianceFinding[];
  remediation: string[];
}

export interface ComplianceFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  requirement: string;
  status: 'open' | 'in_progress' | 'resolved';
  dueDate: Date;
  assignedTo: string;
}

@Injectable()
export class AdvancedFinancialManagementService {
  private readonly logger = new Logger(AdvancedFinancialManagementService.name);
  private readonly fortune500Config: Fortune500FinancialManagementConfig;

  constructor(private prisma: PrismaService) {
    // Fortune 500 Configuration
    this.fortune500Config = {
      enterpriseFinancialManagement: true,
      advancedFinancialReporting: true,
      budgetingAndForecasting: true,
      cashFlowManagement: true,
      investmentManagement: true
};}

  // Fortune 500 Premium: Executive Financial Intelligence
  async getExecutiveFinancialIntelligence() {
    try {
      this.logger.log('Generating Fortune 500 executive financial intelligence');

      const intelligence = {
        // Strategic Financial Metrics
        strategicMetrics: {
          totalRevenue: 2847000000, // $2.847B
          revenueGrowth: 12.4,
          grossMargin: 68.5,
          operatingMargin: 24.3,
          netMargin: 18.7,
          ebitda: 847000000,
          freeCashFlow: 623000000,
          returnOnEquity: 23.8,
          returnOnAssets: 14.2
        },

        // Fortune 500 Financial Benchmarking
        benchmarking: {
          industryComparison: {
            revenueGrowth: { company: 12.4, industry: 8.7, percentile: 78 },
            profitability: { company: 24.3, industry: 18.9, percentile: 82 },
            efficiency: { company: 87.3, industry: 74.2, percentile: 91 },
            liquidity: { company: 2.8, industry: 2.1, percentile: 76 }
          },
          fortune500Ranking: {
            revenueRank: 247,
            profitabilityRank: 156,
            growthRank: 89,
            overallRank: 178
          }
        },

        // Advanced Financial Forecasting
        advancedForecasting: {
          revenueProjections: {
            q1_2024: { conservative: 720000000, base: 780000000, optimistic: 850000000 },
            q2_2024: { conservative: 740000000, base: 810000000, optimistic: 890000000 },
            q3_2024: { conservative: 760000000, base: 830000000, optimistic: 920000000 },
            q4_2024: { conservative: 780000000, base: 860000000, optimistic: 950000000 }
          },
          cashFlowProjections: {
            operatingCashFlow: { q1: 180000000, q2: 195000000, q3: 210000000, q4: 225000000 },
            freeCashFlow: { q1: 145000000, q2: 160000000, q3: 175000000, q4: 190000000 },
            capitalExpenditures: { q1: 35000000, q2: 35000000, q3: 35000000, q4: 35000000 }
          }
        },

        // Risk Analytics
        riskAnalytics: {
          financialRiskScore: 2.3, // Scale 1-5
          keyRisks: [
            { risk: 'Currency Exposure', impact: 'Medium', probability: 'High', mitigation: 87 },
            { risk: 'Interest Rate Risk', impact: 'Low', probability: 'Medium', mitigation: 94 },
            { risk: 'Credit Risk', impact: 'Medium', probability: 'Low', mitigation: 91 },
            { risk: 'Liquidity Risk', impact: 'High', probability: 'Low', mitigation: 96 }
          ],
          stressTestResults: {
            recession: { revenueImpact: -15.2, profitabilityImpact: -23.7, survivalMonths: 18 },
            marketCrash: { revenueImpact: -8.9, profitabilityImpact: -12.4, survivalMonths: 24 },
            supplyChainDisruption: { revenueImpact: -12.1, profitabilityImpact: -18.9, survivalMonths: 21 }
          }
        }
      };

      return intelligence;
    } catch (error) {
      this.logger.error('Error generating executive financial intelligence', error);
      throw error;
    }
  }

  // Fortune 500 Premium: Treasury Management Intelligence
  async getTreasuryManagementIntelligence() {
    try {
      this.logger.log('Generating Fortune 500 treasury management intelligence');

      const treasuryIntelligence = {
        // Cash Management
        cashManagement: {
          totalCash: 847000000,
          cashEquivalents: 234000000,
          shortTermInvestments: 156000000,
          optimalCashLevel: 650000000,
          excessCash: 197000000,
          cashBurnRate: 23400000, // monthly
          daysOfCashRemaining: 36.2
        },

        // Investment Portfolio
        investmentPortfolio: {
          totalInvestments: 1240000000,
          portfolioAllocation: {
            fixedIncome: { amount: 620000000, percentage: 50.0, yield: 4.2 },
            equities: { amount: 372000000, percentage: 30.0, yield: 8.7 },
            alternatives: { amount: 186000000, percentage: 15.0, yield: 12.3 },
            cash: { amount: 62000000, percentage: 5.0, yield: 2.1 }
          },
          performanceMetrics: {
            totalReturn: 7.8,
            sharpeRatio: 1.34,
            volatility: 12.7,
            maxDrawdown: -8.9
          }
        },

        // Debt Management
        debtManagement: {
          totalDebt: 1560000000,
          debtStructure: {
            shortTerm: { amount: 234000000, percentage: 15.0, avgRate: 3.2 },
            longTerm: { amount: 1326000000, percentage: 85.0, avgRate: 4.8 }
          },
          debtMetrics: {
            debtToEquity: 0.67,
            interestCoverage: 12.4,
            debtServiceCoverage: 3.8,
            creditRating: 'A+'
          },
          refinancingSchedule: [
            { maturity: '2024-06-15', amount: 150000000, currentRate: 4.2, marketRate: 3.8 },
            { maturity: '2024-12-01', amount: 200000000, currentRate: 5.1, marketRate: 4.3 }
          ]
        },

        // Foreign Exchange Management
        fxManagement: {
          exposures: [
            { currency: 'EUR', exposure: 234000000, hedgeRatio: 87.3, unrealizedGainLoss: 12400000 },
            { currency: 'GBP', exposure: 156000000, hedgeRatio: 92.1, unrealizedGainLoss: -3200000 },
            { currency: 'JPY', exposure: 89000000, hedgeRatio: 78.9, unrealizedGainLoss: 5600000 }
          ],
          hedgingStrategies: {
            forwards: { notional: 340000000, avgMaturity: 6.2 },
            options: { notional: 180000000, avgDelta: 0.67 },
            swaps: { notional: 120000000, avgDuration: 2.8 }
          }
        }
      };

      return treasuryIntelligence;
    } catch (error) {
      this.logger.error('Error generating treasury management intelligence', error);
      throw error;
    }
  }

  health(): Fortune500FinancialManagementConfig {


    return this.fortune500Config;


  }

  // ==================== FINANCIAL DASHBOARD ====================

  async getFinancialDashboard(tenantId: string, period?: string): Promise<FinancialDashboard> {
    try {
      this.logger.log(`Generating financial dashboard for tenant: ${tenantId}, period: ${period}`);

      // Mock financial data - In production, this would query actual financial data
      const dashboard: FinancialDashboard = {
        totalRevenue: 125000000,    // $125M
        totalExpenses: 98000000,    // $98M
        netIncome: 27000000,        // $27M
        grossMargin: 40.2,          // 40.2%
        operatingMargin: 28.5,      // 28.5%
        netMargin: 21.6,            // 21.6%
        ebitda: 35000000,           // $35M
        cashFlow: 32000000,         // $32M
        workingCapital: 15000000,   // $15M
        currentRatio: 2.1,
        quickRatio: 1.8,
        debtToEquity: 0.45,
        returnOnAssets: 12.5,       // 12.5%
        returnOnEquity: 18.7        // 18.7%
      };

      return dashboard;
    } catch (error) {
      this.logger.error(`Error generating financial dashboard: ${error.message}`);
      throw error;
    }
  }

  // ==================== BUDGET MANAGEMENT ====================

  async getBudgetAnalysis(tenantId: string, period?: string): Promise<BudgetAnalysis[]> {
    try {
      this.logger.log(`Fetching budget analysis for tenant: ${tenantId}, period: ${period}`);

      return [
        {
          budgetId: 'budget-001',
          department: 'Sales & Marketing',
          period: 'Q4 2025',
          budgetAmount: 5000000,
          actualAmount: 4750000,
          variance: -250000,
          variancePercentage: -5.0,
          status: 'under_budget',
          forecast: 4900000,
          remainingBudget: 250000,
          burnRate: 1583333 // per month
        },
        {
          budgetId: 'budget-002',
          department: 'R&D',
          period: 'Q4 2025',
          budgetAmount: 8000000,
          actualAmount: 8400000,
          variance: 400000,
          variancePercentage: 5.0,
          status: 'over_budget',
          forecast: 8600000,
          remainingBudget: -400000,
          burnRate: 2800000
        },
        {
          budgetId: 'budget-003',
          department: 'Operations',
          period: 'Q4 2025',
          budgetAmount: 12000000,
          actualAmount: 11950000,
          variance: -50000,
          variancePercentage: -0.4,
          status: 'on_budget',
          forecast: 12000000,
          remainingBudget: 50000,
          burnRate: 3983333
        }
      ];
    } catch (error) {
      this.logger.error(`Error fetching budget analysis: ${error.message}`);
      throw error;
    }
  }

  async createBudget(tenantId: string, budgetData: any): Promise<any> {
    try {
      this.logger.log(`Creating budget for tenant: ${tenantId}`);

      const newBudget = {
        budgetId: `budget-${Date.now()}`,
        ...budgetData,
        createdAt: new Date(),
        status: 'draft',
        approvalStatus: 'pending'
      };

      // In production, save to database
      return newBudget;
    } catch (error) {
      this.logger.error(`Error creating budget: ${error.message}`);
      throw error;
    }
  }

  // ==================== CASH FLOW MANAGEMENT ====================

  async getCashFlowForecast(tenantId: string, months: number = 12): Promise<CashFlowForecast[]> {
    try {
      this.logger.log(`Generating cash flow forecast for tenant: ${tenantId}, months: ${months}`);

      const forecasts = [];
      let openingBalance = 25000000; // $25M starting balance

      for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        
        // Mock cash flow calculations
        const operatingCashFlow = 8000000 + (Math.random() * 2000000 - 1000000);
        const investingCashFlow = -2000000 + (Math.random() * 1000000 - 500000);
        const financingCashFlow = -1000000 + (Math.random() * 500000 - 250000);
        const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;
        const closingBalance = openingBalance + netCashFlow;

        forecasts.push({
          forecastId: `cf-${date.getFullYear()}-${date.getMonth() + 1}`,
          period: date.toISOString().substring(0, 7),
          openingBalance,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          netCashFlow,
          closingBalance,
          confidence: Math.max(95 - (i * 3), 60),
          scenarios: [
            {
              name: 'optimistic',
              probability: 0.2,
              netCashFlow: netCashFlow * 1.2,
              closingBalance: openingBalance + (netCashFlow * 1.2),
              keyAssumptions: ['Strong sales growth', 'Delayed capex']
            },
            {
              name: 'realistic',
              probability: 0.6,
              netCashFlow,
              closingBalance,
              keyAssumptions: ['Current trends continue', 'Normal operations']
            },
            {
              name: 'pessimistic',
              probability: 0.2,
              netCashFlow: netCashFlow * 0.8,
              closingBalance: openingBalance + (netCashFlow * 0.8),
              keyAssumptions: ['Economic downturn', 'Customer delays']
            }
          ]
        });

        openingBalance = closingBalance;
      }

      return forecasts;
    } catch (error) {
      this.logger.error(`Error generating cash flow forecast: ${error.message}`);
      throw error;
    }
  }

  // ==================== FINANCIAL RATIOS & ANALYSIS ====================

  async getFinancialRatios(tenantId: string): Promise<FinancialRatio[]> {
    try {
      this.logger.log(`Calculating financial ratios for tenant: ${tenantId}`);

      return [
        {
          name: 'Current Ratio',
          value: 2.1,
          benchmark: 2.0,
          industry: 1.8,
          trend: 'improving',
          category: 'liquidity',
          interpretation: 'Strong liquidity position, well above industry average'
        },
        {
          name: 'Quick Ratio',
          value: 1.8,
          benchmark: 1.5,
          industry: 1.3,
          trend: 'stable',
          category: 'liquidity',
          interpretation: 'Excellent short-term liquidity without relying on inventory'
        },
        {
          name: 'Gross Profit Margin',
          value: 40.2,
          benchmark: 35.0,
          industry: 32.5,
          trend: 'improving',
          category: 'profitability',
          interpretation: 'Superior profitability compared to industry peers'
        },
        {
          name: 'Return on Assets',
          value: 12.5,
          benchmark: 10.0,
          industry: 8.7,
          trend: 'improving',
          category: 'efficiency',
          interpretation: 'Efficient use of assets to generate profits'
        },
        {
          name: 'Debt-to-Equity',
          value: 0.45,
          benchmark: 0.50,
          industry: 0.65,
          trend: 'stable',
          category: 'leverage',
          interpretation: 'Conservative debt levels, lower financial risk'
        }
      ];
    } catch (error) {
      this.logger.error(`Error calculating financial ratios: ${error.message}`);
      throw error;
    }
  }

  // ==================== RISK ASSESSMENT ====================

  async getRiskAssessment(tenantId: string): Promise<RiskAssessment> {
    try {
      this.logger.log(`Performing risk assessment for tenant: ${tenantId}`);

      return {
        overallRisk: 'medium',
        riskScore: 65,
        riskFactors: [
          {
            type: 'market',
            description: 'Economic uncertainty affecting customer spending',
            impact: 'high',
            probability: 0.3,
            riskValue: 2100000,
            mitigation: 'Diversify customer base and geographic markets'
          },
          {
            type: 'credit',
            description: 'Concentration risk with top 5 customers',
            impact: 'medium',
            probability: 0.2,
            riskValue: 1500000,
            mitigation: 'Implement stricter credit policies and monitoring'
          },
          {
            type: 'operational',
            description: 'Supply chain disruption risks',
            impact: 'medium',
            probability: 0.25,
            riskValue: 1800000,
            mitigation: 'Develop alternative supplier relationships'
          },
          {
            type: 'liquidity',
            description: 'Seasonal cash flow variations',
            impact: 'low',
            probability: 0.4,
            riskValue: 800000,
            mitigation: 'Establish revolving credit facility'
          }
        ],
        mitigationStrategies: [
          'Maintain minimum cash reserves of $20M',
          'Diversify revenue streams across industries',
          'Implement early warning systems for key metrics',
          'Regular stress testing of financial scenarios'
        ],
        monitoringMetrics: [
          'Days Sales Outstanding (DSO)',
          'Customer concentration ratio',
          'Cash conversion cycle',
          'Debt service coverage ratio'
        ]
      };
    } catch (error) {
      this.logger.error(`Error performing risk assessment: ${error.message}`);
      throw error;
    }
  }

  // ==================== INVESTMENT ANALYSIS ====================

  async getInvestmentAnalysis(tenantId: string): Promise<InvestmentAnalysis[]> {
    try {
      this.logger.log(`Fetching investment analysis for tenant: ${tenantId}`);

      return [
        {
          investmentId: 'inv-001',
          name: 'AI Platform Development',
          type: 'technology',
          amount: 15000000,
          expectedReturn: 25000000,
          paybackPeriod: 2.8, // years
          npv: 8500000,
          irr: 28.5, // %
          riskLevel: 'medium',
          status: 'approved',
          businessCase: 'Develop next-generation AI platform to capture emerging market opportunities'
        },
        {
          investmentId: 'inv-002',
          name: 'European Market Expansion',
          type: 'marketing',
          amount: 8000000,
          expectedReturn: 18000000,
          paybackPeriod: 3.2,
          npv: 4200000,
          irr: 22.1,
          riskLevel: 'high',
          status: 'proposed',
          businessCase: 'Establish operations in key European markets to drive international growth'
        },
        {
          investmentId: 'inv-003',
          name: 'Manufacturing Automation',
          type: 'capex',
          amount: 12000000,
          expectedReturn: 20000000,
          paybackPeriod: 4.1,
          npv: 3800000,
          irr: 18.7,
          riskLevel: 'low',
          status: 'in_progress',
          businessCase: 'Automate production lines to reduce costs and improve quality'
        }
      ];
    } catch (error) {
      this.logger.error(`Error fetching investment analysis: ${error.message}`);
      throw error;
    }
  }

  async evaluateInvestment(tenantId: string, investmentData: any): Promise<any> {
    try {
      this.logger.log(`Evaluating investment for tenant: ${tenantId}`);

      // Mock investment evaluation calculations
      const { amount, expectedCashFlows, discountRate = 0.1 } = investmentData;
      
      // Calculate NPV
      let npv = -amount;
      expectedCashFlows.forEach((cashFlow: number, year: number) => {
        npv += cashFlow / Math.pow(1 + discountRate, year + 1);
      });

      // Calculate IRR (simplified approximation)
      const totalCashFlow = expectedCashFlows.reduce((sum: number, cf: number) => sum + cf, 0);
      const irr = ((totalCashFlow / amount) ** (1 / expectedCashFlows.length) - 1) * 100;

      // Calculate payback period
      let cumulativeCashFlow = -amount;
      let paybackPeriod = 0;
      for (let i = 0; i < expectedCashFlows.length; i++) {
        cumulativeCashFlow += expectedCashFlows[i];
        if (cumulativeCashFlow >= 0) {
          paybackPeriod = i + 1;
          break;
        }
      }

      return {
        evaluationId: `eval-${Date.now()}`,
        npv: Math.round(npv),
        irr: Math.round(irr * 100) / 100,
        paybackPeriod,
        recommendation: npv > 0 ? 'approve' : 'reject',
        riskAssessment: this.assessInvestmentRisk(investmentData),
        sensitivityAnalysis: this.performSensitivityAnalysis(investmentData)
      };
    } catch (error) {
      this.logger.error(`Error evaluating investment: ${error.message}`);
      throw error;
    }
  }

  private assessInvestmentRisk(investmentData: any): any {
    // Mock risk assessment
    return {
      overallRisk: 'medium',
      riskFactors: [
        'Market acceptance uncertainty',
        'Technology implementation challenges',
        'Competitive response'
      ],
      mitigationStrategies: [
        'Phased implementation approach',
        'Market research validation',
        'Contingency planning'
      ]
    };
  }

  private performSensitivityAnalysis(investmentData: any): any {
    // Mock sensitivity analysis
    return {
      scenarios: [
        { name: 'Best Case', npvChange: '+25%', irrChange: '+5%' },
        { name: 'Base Case', npvChange: '0%', irrChange: '0%' },
        { name: 'Worst Case', npvChange: '-30%', irrChange: '-7%' }
      ],
      keyVariables: [
        'Revenue growth rate',
        'Cost inflation',
        'Market penetration'
      ]
    };
  }

  // ==================== COMPLIANCE MANAGEMENT ====================

  async getComplianceStatus(tenantId: string): Promise<ComplianceStatus[]> {
    try {
      this.logger.log(`Fetching compliance status for tenant: ${tenantId}`);

      return [
        {
          framework: 'SOX (Sarbanes-Oxley)',
          status: 'compliant',
          score: 96.5,
          lastAudit: new Date('2025-08-15'),
          nextAudit: new Date('2026-08-15'),
          findings: [],
          remediation: []
        },
        {
          framework: 'GAAP (Generally Accepted Accounting Principles)',
          status: 'compliant',
          score: 98.2,
          lastAudit: new Date('2025-09-01'),
          nextAudit: new Date('2026-09-01'),
          findings: [],
          remediation: []
        },
        {
          framework: 'IFRS (International Financial Reporting Standards)',
          status: 'partial',
          score: 87.3,
          lastAudit: new Date('2025-07-20'),
          nextAudit: new Date('2025-10-20'),
          findings: [
            {
              id: 'finding-001',
              severity: 'medium',
              description: 'Revenue recognition timing discrepancies',
              requirement: 'IFRS 15 - Revenue from Contracts',
              status: 'in_progress',
              dueDate: new Date('2025-10-15'),
              assignedTo: 'finance-team'
            }
          ],
          remediation: [
            'Update revenue recognition policies',
            'Implement automated controls',
            'Staff training on IFRS 15'
          ]
        }
      ];
    } catch (error) {
      this.logger.error(`Error fetching compliance status: ${error.message}`);
      throw error;
    }
  }

  // ==================== TREASURY MANAGEMENT ====================

  async getTreasuryDashboard(tenantId: string): Promise<any> {
    try {
      this.logger.log(`Fetching treasury dashboard for tenant: ${tenantId}`);

      return {
        cashPosition: {
          totalCash: 45000000,
          operatingCash: 25000000,
          investmentCash: 15000000,
          restrictedCash: 5000000,
          cashEquivalents: 8000000
        },
        bankingRelationships: [
          {
            bank: 'JPMorgan Chase',
            accountType: 'Operating',
            balance: 15000000,
            creditLine: 50000000,
            utilization: 0,
            relationship: 'primary'
          },
          {
            bank: 'Bank of America',
            accountType: 'Investment',
            balance: 12000000,
            creditLine: 25000000,
            utilization: 0,
            relationship: 'secondary'
          }
        ],
        investments: [
          {
            type: 'Money Market',
            amount: 8000000,
            yield: 4.2,
            maturity: '30 days',
            risk: 'low'
          },
          {
            type: 'Corporate Bonds',
            amount: 5000000,
            yield: 5.8,
            maturity: '2 years',
            risk: 'medium'
          }
        ],
        foreignExchange: {
          exposures: [
            { currency: 'EUR', amount: 2500000, hedged: 80 },
            { currency: 'GBP', amount: 1800000, hedged: 75 },
            { currency: 'JPY', amount: 1200000, hedged: 60 }
          ],
          hedgingStrategy: 'Natural hedging with forward contracts'
        },
        riskMetrics: {
          var: 850000, // Value at Risk
          stressTestResult: 'Pass',
          liquidityRatio: 2.3,
          concentrationRisk: 'Low'
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching treasury dashboard: ${error.message}`);
      throw error;
    }
  }

  // ==================== FINANCIAL PLANNING & ANALYSIS ====================

  async getFinancialPlan(tenantId: string, years: number = 5): Promise<any> {
    try {
      this.logger.log(`Generating financial plan for tenant: ${tenantId}, years: ${years}`);

      const plan = [];
      let baseRevenue = 125000000; // Current year revenue

      for (let year = 1; year <= years; year++) {
        const growthRate = 0.15 - (year * 0.01); // Decreasing growth rate
        const revenue = Math.round(baseRevenue * (1 + growthRate));
        const expenses = Math.round(revenue * 0.78); // 78% expense ratio
        const netIncome = revenue - expenses;

        plan.push({
          year: new Date().getFullYear() + year,
          revenue,
          expenses,
          netIncome,
          growthRate: growthRate * 100,
          margin: ((netIncome / revenue) * 100).toFixed(1)
        });

        baseRevenue = revenue;
      }

      return {
        planId: `plan-${Date.now()}`,
        generatedAt: new Date(),
        planningHorizon: `${years} years`,
        keyAssumptions: [
          'Market growth rate: 12-15% annually',
          'Expense ratio improvement: 1% per year',
          'No major economic disruptions',
          'Successful product launches'
        ],
        scenarios: {
          optimistic: plan.map(p => ({ ...p, revenue: p.revenue * 1.2, netIncome: p.netIncome * 1.4 })),
          base: plan,
          pessimistic: plan.map(p => ({ ...p, revenue: p.revenue * 0.8, netIncome: p.netIncome * 0.6 }))
        },
        strategicInitiatives: [
          {
            name: 'Digital Transformation',
            investment: 25000000,
            expectedReturn: 45000000,
            timeline: '3 years'
          },
          {
            name: 'Market Expansion',
            investment: 15000000,
            expectedReturn: 35000000,
            timeline: '2 years'
          }
        ]
      };
    } catch (error) {
      this.logger.error(`Error generating financial plan: ${error.message}`);
      throw error;
    }
  }
}