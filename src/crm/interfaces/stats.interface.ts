// path: backend/src/crm/interfaces/stats.interface.ts
// purpose: TypeScript interfaces for CRM statistics
// dependencies: none

export interface CustomerStats {
  total: number;
  active: number;
  prospects: number;
  business: number;
  individual: number;
  newThisMonth: number;
  activePercentage: number;
  conversionRate: number;
}

export interface LeadStats {
  total: number;
  new: number;
  qualified: number;
  closedWon: number;
  closedLost: number;
  newThisMonth: number;
  totalEstimatedValue: number;
  conversionRate: number;
  qualificationRate: number;
}

export interface OpportunityStats {
  total: number;
  open: number;
  won: number;
  lost: number;
  totalValue: number;
  averageValue: number;
  winRate: number;
}

export interface ContactStats {
  total: number;
  active: number;
  newThisMonth: number;
}

export interface CrmDashboardStats {
  customers: CustomerStats;
  leads: LeadStats;
  opportunities: OpportunityStats;
  contacts: ContactStats;
  summary: {
    totalCustomers: number;
    totalLeads: number;
    totalOpportunities: number;
    totalContacts: number;
    conversionRate: number;
    customerGrowth: number;
    leadGrowth: number;
  };
  timestamp: string;
}

export interface SalesPipeline {
  stages: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  totalValue: number;
  conversionRate: number;
}

export interface PerformanceMetrics {
  period: string;
  customerAcquisition: number;
  leadGeneration: number;
  conversionRate: number;
  customerRetention: number;
  averageDealSize: number;
  salesVelocity: number;
  customerLifetimeValue: number;
}