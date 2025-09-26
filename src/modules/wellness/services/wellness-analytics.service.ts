import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// ==========================
// Interfaces - Analytics
// ==========================

export interface WellnessAnalyticsOverview {
  orgId: string;
  timeframe: string; // e.g., '7d' | '30d' | '90d' | 'YTD'
  generatedAt: Date;
  summary: AnalyticsSummary;
  roi: ROIReport;
  trends: PopulationHealthTrend[];
  riskPredictions: RiskPrediction;
  engagement: EngagementOverview;
  dashboards: DashboardData;
}

export interface AnalyticsSummary {
  wellnessScore: number; // 0-100
  populationCoverage: number; // % of employees engaged
  programCount: number;
  activePrograms: number;
  avgParticipationRate: number; // %
  healthcareCostChangePct: number; // % vs baseline
  absenteeismChangePct: number; // % vs baseline
  productivityUpliftPct: number; // %
}

export interface ROIReport {
  programId?: string;
  timeframe: string;
  baseline: ROIBaseline;
  costs: ProgramCosts;
  savings: ProgramSavings;
  roiAbsolute: number; // USD
  roiPercentage: number; // %
  breakEvenDate?: Date;
  assumptions: string[];
  sensitivityAnalysis: SensitivityScenario[];
}

export interface ROIBaseline {
  healthcareCostsAnnual: number; // USD
  absenteeismDaysPerEmployee: number;
  presenteeismLossPct: number; // % of productivity
  turnoverRatePct: number; // %
  employeeCount: number;
}

export interface ProgramCosts {
  directCosts: number; // program fees, vendors
  incentives: number;
  communication: number;
  adminOverhead: number;
  total: number;
}

export interface ProgramSavings {
  reducedHealthcareCosts: number;
  absenteeismSavings: number;
  presenteeismSavings: number;
  turnoverSavings: number;
  otherSavings: number;
  total: number;
}

export interface SensitivityScenario {
  name: string; // 'Conservative' | 'Base' | 'Optimistic'
  roiPercentage: number;
  keyDrivers: string[];
}

export interface PopulationHealthTrend {
  metric: string; // e.g., 'BMI', 'BloodPressure', 'StressLevel'
  description: string;
  series: TrendPoint[];
  direction: 'up' | 'down' | 'flat';
  significance: 'low' | 'medium' | 'high';
  segments: SegmentTrend[];
}

export interface TrendPoint {
  date: Date;
  value: number;
  baseline?: number;
}

export interface SegmentTrend {
  segment: string; // e.g., 'Engineering', 'Sales', 'High Risk Cohort'
  currentValue: number;
  changePct: number;
}

export interface RiskPrediction {
  model: RiskModelInfo;
  populationRiskScore: number; // 0-100
  atRiskCohorts: AtRiskCohort[];
  featureImportances: FeatureImportance[];
  recommendedInterventions: RecommendedIntervention[];
}

export interface RiskModelInfo {
  type: 'chronic_conditions' | 'mental_health' | 'burnout' | 'musculoskeletal' | 'custom';
  version: string;
  trainedAt: Date;
  algorithm: 'xgboost' | 'random_forest' | 'logistic_regression' | 'neural_network' | 'ensemble';
}

export interface AtRiskCohort {
  name: string;
  size: number;
  avgRiskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  drivers: string[];
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0-1
}

export interface RecommendedIntervention {
  name: string;
  expectedImpactPct: number;
  targetCohort: string;
  timelineWeeks: number;
  resources: string[];
}

export interface EngagementOverview {
  dau: number;
  mau: number;
  participationRatePct: number;
  completionRatePct: number;
  avgSessionsPerUser: number;
}

export interface DashboardData {
  widgets: DashboardWidget[];
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'trend' | 'bar' | 'pie' | 'table';
  title: string;
  value?: number | string;
  unit?: string;
  trend?: number; // -100 to 100 (percentage change)
  chartData?: ChartData;
  meta?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ExecutiveReport {
  orgId: string;
  period: string; // e.g., 'Q3-2025'
  generatedAt: Date;
  title: string;
  keyInsights: string[];
  kpis: ExecutiveKPI[];
  recommendations: ExecutiveRecommendation[];
  appendix: Record<string, any>;
}

export interface ExecutiveKPI {
  name: string;
  value: number;
  unit: string;
  changePct: number;
  direction: 'up' | 'down' | 'flat';
}

export interface ExecutiveRecommendation {
  item: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rationale: string;
  expectedOutcome: string;
  timeframeWeeks: number;
}

export interface MLAnalysisResult {
  model: RiskModelInfo;
  performance: MLPerformance;
  insights: string[];
  limitations: string[];
}

export interface MLPerformance {
  auc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

@Injectable()
export class WellnessAnalyticsService {
  private readonly logger = new Logger(WellnessAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene una vista general analítica de bienestar para la organización
   */
  async getAnalyticsOverview(orgId: string, timeframe: string = '30d'): Promise<WellnessAnalyticsOverview> {
    try {
      this.logger.log(`Generating analytics overview for org ${orgId} (${timeframe})`);

      const roi = this.generateMockROIReport(timeframe);
      const trends = this.generateMockTrends();
      const risk = this.generateMockRiskPrediction();
      const engagement = this.generateMockEngagement();
      const dashboards = this.generateMockDashboard();

      const summary: AnalyticsSummary = {
        wellnessScore: 70 + Math.random() * 20,
        populationCoverage: 68 + Math.random() * 20,
        programCount: 8,
        activePrograms: 5,
        avgParticipationRate: 62 + Math.random() * 18,
        healthcareCostChangePct: -5 + Math.random() * 3,
        absenteeismChangePct: -8 + Math.random() * 4,
        productivityUpliftPct: 3 + Math.random() * 4,
      };

      return {
        orgId,
        timeframe,
        generatedAt: new Date(),
        summary,
        roi,
        trends,
        riskPredictions: risk,
        engagement,
        dashboards,
      };
    } catch (error) {
      this.logger.error(`Error generating analytics overview:`, error);
      throw error;
    }
  }

  /**
   * Calcula el ROI de un programa de wellness específico
   */
  async calculateProgramROI(programId: string, timeframe: string = 'YTD'): Promise<ROIReport> {
    try {
      this.logger.log(`Calculating ROI for program ${programId} (${timeframe})`);
      const report = this.generateMockROIReport(timeframe);
      report.programId = programId;
      return report;
    } catch (error) {
      this.logger.error(`Error calculating program ROI:`, error);
      throw error;
    }
  }

  /**
   * Obtiene tendencias de salud poblacional para una métrica
   */
  async getPopulationHealthTrends(orgId: string, metric: string = 'BMI', timeframe: string = '90d'): Promise<PopulationHealthTrend[]> {
    try {
      this.logger.log(`Getting population health trends for ${orgId} metric=${metric} timeframe=${timeframe}`);
      const trends = this.generateMockTrends(metric);
      return trends;
    } catch (error) {
      this.logger.error(`Error getting population health trends:`, error);
      throw error;
    }
  }

  /**
   * Predice riesgos de bienestar y recomienda intervenciones
   */
  async predictWellnessRisks(orgId: string): Promise<RiskPrediction> {
    try {
      this.logger.log(`Predicting wellness risks for org ${orgId}`);
      return this.generateMockRiskPrediction();
    } catch (error) {
      this.logger.error(`Error predicting wellness risks:`, error);
      throw error;
    }
  }

  /**
   * Genera un reporte ejecutivo para liderazgo
   */
  async generateExecutiveReport(orgId: string, period: string = 'Q3-2025'): Promise<ExecutiveReport> {
    try {
      this.logger.log(`Generating executive report for org ${orgId} period ${period}`);
      return this.generateMockExecutiveReport(orgId, period);
    } catch (error) {
      this.logger.error(`Error generating executive report:`, error);
      throw error;
    }
  }

  /**
   * Entrega datos listos para dashboards interactivos
   */
  async getDashboardData(orgId: string): Promise<DashboardData> {
    try {
      this.logger.log(`Getting dashboard data for org ${orgId}`);
      return this.generateMockDashboard();
    } catch (error) {
      this.logger.error(`Error getting dashboard data:`, error);
      throw error;
    }
  }

  /**
   * Ejecuta análisis predictivo con un modelo ML (mock)
   */
  async runPredictiveAnalysis(orgId: string, modelType: RiskModelInfo['type'] = 'burnout'): Promise<MLAnalysisResult> {
    try {
      this.logger.log(`Running predictive analysis for org ${orgId} with model ${modelType}`);
      const model: RiskModelInfo = {
        type: modelType,
        version: '1.0.0',
        trainedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        algorithm: 'xgboost',
      };
      const performance: MLPerformance = {
        auc: 0.86 + Math.random() * 0.05,
        accuracy: 0.78 + Math.random() * 0.05,
        precision: 0.75 + Math.random() * 0.08,
        recall: 0.72 + Math.random() * 0.08,
        f1: 0.74 + Math.random() * 0.06,
      };
      const insights = [
        'After-hours email activity is a strong predictor of burnout risk',
        'Low participation in wellness programs correlates with higher absenteeism',
        'Managers with >6 direct reports show increased stress indicators',
      ];
      const limitations = [
        'Training data biased towards office roles',
        'Limited ground truth labels for mental health outcomes',
      ];
      return { model, performance, insights, limitations };
    } catch (error) {
      this.logger.error(`Error running predictive analysis:`, error);
      throw error;
    }
  }

  // ==========================
  // Private mock generators
  // ==========================

  private generateMockROIReport(timeframe: string): ROIReport {
    const baseline: ROIBaseline = {
      healthcareCostsAnnual: 2_500_000,
      absenteeismDaysPerEmployee: 6.2,
      presenteeismLossPct: 7.5,
      turnoverRatePct: 15,
      employeeCount: 1200,
    };
    const costs: ProgramCosts = {
      directCosts: 180_000,
      incentives: 75_000,
      communication: 25_000,
      adminOverhead: 40_000,
      total: 320_000,
    };
    const savings: ProgramSavings = {
      reducedHealthcareCosts: 260_000,
      absenteeismSavings: 140_000,
      presenteeismSavings: 180_000,
      turnoverSavings: 90_000,
      otherSavings: 25_000,
      total: 695_000,
    };
    const roiAbsolute = savings.total - costs.total;
    const roiPercentage = (roiAbsolute / costs.total) * 100;
    return {
      timeframe,
      baseline,
      costs,
      savings,
      roiAbsolute,
      roiPercentage,
      breakEvenDate: new Date(Date.now() - 45 * 24 * 3600 * 1000),
      assumptions: [
        'Absenteeism reduction of 1.2 days per employee',
        'Healthcare cost trend adjusted for inflation (3%)',
      ],
      sensitivityAnalysis: [
        { name: 'Conservative', roiPercentage: roiPercentage - 35, keyDrivers: ['Lower participation', 'Reduced cost savings'] },
        { name: 'Base', roiPercentage, keyDrivers: ['Baseline assumptions'] },
        { name: 'Optimistic', roiPercentage: roiPercentage + 28, keyDrivers: ['Higher engagement', 'Better clinical outcomes'] },
      ],
    };
  }

  private generateMockTrends(metric: string = 'BMI'): PopulationHealthTrend[] {
    const buildSeries = (): TrendPoint[] => Array.from({ length: 12 }).map((_, i) => ({
      date: new Date(Date.now() - (11 - i) * 30 * 24 * 3600 * 1000),
      value: 60 + Math.random() * 20 - 10,
      baseline: 60,
    }));

    return [
      {
        metric,
        description: `Trend for ${metric}`,
        series: buildSeries(),
        direction: Math.random() > 0.6 ? 'up' : Math.random() > 0.5 ? 'down' : 'flat',
        significance: 'medium',
        segments: [
          { segment: 'Engineering', currentValue: 58, changePct: -3.2 },
          { segment: 'Sales', currentValue: 63, changePct: -1.1 },
          { segment: 'Operations', currentValue: 61, changePct: -2.4 },
        ],
      },
    ];
  }

  private generateMockRiskPrediction(): RiskPrediction {
    return {
      model: {
        type: 'burnout',
        version: '1.0.0',
        trainedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        algorithm: 'ensemble',
      },
      populationRiskScore: 42 + Math.random() * 15,
      atRiskCohorts: [
        { name: 'Customer Support', size: 120, avgRiskScore: 62, riskLevel: 'high', drivers: ['High call volumes', 'After-hours tickets'] },
        { name: 'New Managers (<1y)', size: 45, avgRiskScore: 59, riskLevel: 'medium', drivers: ['Role transition stress'] },
      ],
      featureImportances: [
        { feature: 'after_hours_emails', importance: 0.23 },
        { feature: 'meeting_hours', importance: 0.19 },
        { feature: 'sleep_quality', importance: 0.17 },
        { feature: 'program_participation', importance: 0.11 },
      ],
      recommendedInterventions: [
        { name: 'Meeting-free blocks', expectedImpactPct: 6, targetCohort: 'Engineering', timelineWeeks: 8, resources: ['Calendar policy', 'Manager training'] },
        { name: 'Stress management workshops', expectedImpactPct: 8, targetCohort: 'Customer Support', timelineWeeks: 6, resources: ['External facilitator'] },
      ],
    };
  }

  private generateMockEngagement(): EngagementOverview {
    return {
      dau: 320,
      mau: 1280,
      participationRatePct: 68,
      completionRatePct: 74,
      avgSessionsPerUser: 4.6,
    };
  }

  private generateMockDashboard(): DashboardData {
    return {
      widgets: [
        { id: 'kpi_roi', type: 'kpi', title: 'ROI %', value: 117, unit: '%', trend: 7.2 },
        { id: 'kpi_absenteeism', type: 'kpi', title: 'Absenteeism Δ', value: -6.1, unit: '%', trend: 1.1 },
        {
          id: 'trend_participation',
          type: 'trend',
          title: 'Participation Trend',
          chartData: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{ label: 'Participation %', data: [55, 58, 60, 63, 66, 68], color: '#2E86AB' }],
          },
        },
        {
          id: 'bar_cost_savings',
          type: 'bar',
          title: 'Cost Savings Breakdown',
          chartData: {
            labels: ['Healthcare', 'Absenteeism', 'Presenteeism', 'Turnover', 'Other'],
            datasets: [{ label: 'USD (k)', data: [260, 140, 180, 90, 25], color: '#27AE60' }],
          },
        },
      ],
    };
  }

  private generateMockExecutiveReport(orgId: string, period: string): ExecutiveReport {
    return {
      orgId,
      period,
      generatedAt: new Date(),
      title: `Executive Wellness Report - ${period}`,
      keyInsights: [
        'Wellness program ROI continues positive trend, reaching 117% this period',
        'Absenteeism decreased by 6.1% compared to last quarter',
        'Burnout risk concentrated in Customer Support cohort',
      ],
      kpis: [
        { name: 'Participation Rate', value: 68, unit: '%', changePct: 3.2, direction: 'up' },
        { name: 'Healthcare Cost Δ', value: -5.1, unit: '%', changePct: -0.6, direction: 'down' },
        { name: 'Productivity Uplift', value: 4.2, unit: '%', changePct: 0.5, direction: 'up' },
      ],
      recommendations: [
        { item: 'Expand stress management workshops to high-risk cohorts', priority: 'high', rationale: 'Projected 8% reduction in stress indicators', expectedOutcome: 'Lower burnout risk and absenteeism', timeframeWeeks: 8 },
        { item: 'Introduce meeting-free focus blocks', priority: 'medium', rationale: 'Improves cognitive load metrics', expectedOutcome: 'Higher productivity and job satisfaction', timeframeWeeks: 6 },
      ],
      appendix: {
        methodology: 'ROI calculated using baseline-adjusted savings across healthcare, absenteeism, presenteeism, and turnover, minus program costs.',
        dataSources: ['HRIS', 'Claims data', 'LMS', 'Engagement platform'],
      },
    };
  }
}
