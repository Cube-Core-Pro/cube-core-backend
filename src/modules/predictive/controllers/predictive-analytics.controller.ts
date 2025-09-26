import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PredictiveAnalyticsService } from '../services/predictive-analytics.service';

@ApiTags('Predictive Analytics')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('predictive')
export class PredictiveAnalyticsController {
  constructor(
    private readonly predictiveService: PredictiveAnalyticsService,
  ) {}

  @Get('user-behavior/:userId')
  @ApiOperation({ summary: 'Predict user behavior patterns' })
  @ApiResponse({
    status: 200,
    description: 'User behavior prediction generated successfully',
  })
  async predictUserBehavior(@Param('userId') userId: string) {
    try {
      const prediction = await this.predictiveService.predictUserBehavior(userId);
      
      return {
        status: 'success',
        data: prediction,
        message: 'User behavior prediction generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate user behavior prediction',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('business-metrics/:organizationId')
  @ApiOperation({ summary: 'Predict business metrics and trends' })
  @ApiResponse({
    status: 200,
    description: 'Business metrics prediction generated successfully',
  })
  async predictBusinessMetrics(@Param('organizationId') organizationId: string) {
    try {
      const prediction = await this.predictiveService.predictBusinessMetrics(organizationId);
      
      return {
        status: 'success',
        data: prediction,
        message: 'Business metrics prediction generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate business metrics prediction',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('market-trends')
  @ApiOperation({ summary: 'Predict market trends and opportunities' })
  @ApiResponse({
    status: 200,
    description: 'Market trends prediction generated successfully',
  })
  async predictMarketTrends(@Query('industry') industry: string = 'technology') {
    try {
      const prediction = await this.predictiveService.predictMarketTrends(industry);
      
      return {
        status: 'success',
        data: prediction,
        message: 'Market trends prediction generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate market trends prediction',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('train-model')
  @ApiOperation({ summary: 'Train a new predictive model' })
  @ApiResponse({
    status: 201,
    description: 'Predictive model trained successfully',
  })
  async trainModel(
    @Body() trainingRequest: {
      name: string;
      type: 'REGRESSION' | 'CLASSIFICATION' | 'TIME_SERIES' | 'CLUSTERING';
      features: string[];
      targetVariable: string;
      trainingData: any[];
    }
  ) {
    try {
      const { trainingData, ...modelConfig } = trainingRequest;
      const model = await this.predictiveService.trainPredictiveModel(
        modelConfig,
        trainingData
      );
      
      return {
        status: 'success',
        data: model,
        message: 'Predictive model trained successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to train predictive model',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-prediction')
  @ApiOperation({ summary: 'Generate prediction using trained model' })
  @ApiResponse({
    status: 200,
    description: 'Prediction generated successfully',
  })
  async generatePrediction(
    @Body() predictionRequest: {
      modelId: string;
      inputData: any;
      userId: string;
    }
  ) {
    try {
      const { modelId, inputData, userId } = predictionRequest;
      const prediction = await this.predictiveService.generatePrediction(
        modelId,
        inputData,
        userId
      );
      
      return {
        status: 'success',
        data: prediction,
        message: 'Prediction generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate prediction',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('model-accuracy/:modelId')
  @ApiOperation({ summary: 'Analyze prediction model accuracy' })
  @ApiResponse({
    status: 200,
    description: 'Model accuracy analysis completed successfully',
  })
  async analyzeModelAccuracy(@Param('modelId') modelId: string) {
    try {
      const analysis = await this.predictiveService.analyzePredictionAccuracy(modelId);
      
      return {
        status: 'success',
        data: analysis,
        message: 'Model accuracy analysis completed successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to analyze model accuracy',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('comprehensive-forecast/:userId')
  @ApiOperation({ summary: 'Generate comprehensive forecast for user' })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive forecast generated successfully',
  })
  async generateComprehensiveForecast(
    @Param('userId') userId: string,
    @Query('timeframe') timeframe: string = '30d'
  ) {
    try {
      // Generar múltiples predicciones para un análisis completo
      const [userBehavior, businessMetrics, marketTrends] = await Promise.all([
        this.predictiveService.predictUserBehavior(userId),
        this.predictiveService.predictBusinessMetrics('default-org'),
        this.predictiveService.predictMarketTrends('technology')
      ]);

      const comprehensiveForecast = {
        userId,
        timeframe,
        forecasts: {
          userBehavior,
          businessMetrics,
          marketTrends
        },
        insights: this.generateInsights(userBehavior, businessMetrics, marketTrends),
        recommendations: this.generateRecommendations(userBehavior, businessMetrics),
        generatedAt: new Date()
      };
      
      return {
        status: 'success',
        data: comprehensiveForecast,
        message: 'Comprehensive forecast generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate comprehensive forecast',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('risk-assessment/:organizationId')
  @ApiOperation({ summary: 'Generate risk assessment and mitigation strategies' })
  @ApiResponse({
    status: 200,
    description: 'Risk assessment completed successfully',
  })
  async generateRiskAssessment(@Param('organizationId') organizationId: string) {
    try {
      const businessMetrics = await this.predictiveService.predictBusinessMetrics(organizationId);
      
      const riskAssessment = {
        organizationId,
        overallRiskScore: this.calculateOverallRisk(businessMetrics.predictions.riskFactors),
        riskCategories: {
          operational: businessMetrics.predictions.riskFactors.filter(r => 
            r.factor.includes('infrastructure') || r.factor.includes('capacity')
          ),
          financial: businessMetrics.predictions.riskFactors.filter(r => 
            r.factor.includes('cost') || r.factor.includes('budget')
          ),
          technical: businessMetrics.predictions.riskFactors.filter(r => 
            r.factor.includes('security') || r.factor.includes('vulnerability')
          ),
          human: businessMetrics.predictions.riskFactors.filter(r => 
            r.factor.includes('personnel') || r.factor.includes('departure')
          )
        },
        mitigationPlan: this.generateMitigationPlan(businessMetrics.predictions.riskFactors),
        monitoringRecommendations: this.generateMonitoringRecommendations(),
        generatedAt: new Date()
      };
      
      return {
        status: 'success',
        data: riskAssessment,
        message: 'Risk assessment completed successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to generate risk assessment',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Métodos auxiliares privados
  private generateInsights(userBehavior: any, businessMetrics: any, marketTrends: any): string[] {
    const insights: string[] = [];

    // Insights basados en comportamiento del usuario
    if (userBehavior.predictions.churnRisk.risk === 'HIGH') {
      insights.push('High churn risk detected - immediate retention strategies recommended');
    }

    if (userBehavior.predictions.productivityTrend.trend === 'INCREASING') {
      insights.push('User productivity is trending upward - consider advanced feature adoption');
    }

    // Insights basados en métricas de negocio
    if (businessMetrics.predictions.userGrowth.nextMonth > 30) {
      insights.push('Rapid user growth expected - scale infrastructure proactively');
    }

    // Insights basados en tendencias de mercado
    const aiTech = marketTrends.predictions.technologyAdoption.find(t => 
      t.technology.includes('Artificial Intelligence')
    );
    if (aiTech && aiTech.adoptionRate > 0.8) {
      insights.push('AI adoption is accelerating - prioritize AI feature development');
    }

    return insights;
  }

  private generateRecommendations(userBehavior: any, businessMetrics: any): string[] {
    const recommendations: string[] = [];

    // Recomendaciones basadas en comportamiento
    if (userBehavior.predictions.churnRisk.risk !== 'LOW') {
      recommendations.push('Implement personalized engagement campaigns');
      recommendations.push('Provide additional training and support resources');
    }

    // Recomendaciones basadas en crecimiento
    if (businessMetrics.predictions.userGrowth.nextQuarter > 100) {
      recommendations.push('Invest in scalable infrastructure solutions');
      recommendations.push('Expand customer support team capacity');
    }

    // Recomendaciones generales
    recommendations.push('Monitor key performance indicators daily');
    recommendations.push('Conduct regular user feedback sessions');

    return recommendations;
  }

  private calculateOverallRisk(riskFactors: any[]): number {
    if (!riskFactors || riskFactors.length === 0) return 0;

    const weightedRisk = riskFactors.reduce((total, risk) => {
      const impactWeight = risk.impact === 'HIGH' ? 3 : risk.impact === 'MEDIUM' ? 2 : 1;
      return total + (risk.probability * impactWeight);
    }, 0);

    return Math.min(weightedRisk / riskFactors.length, 1);
  }

  private generateMitigationPlan(riskFactors: any[]): any[] {
    return riskFactors.map(risk => ({
      riskFactor: risk.factor,
      priority: risk.impact === 'HIGH' ? 'URGENT' : risk.impact === 'MEDIUM' ? 'HIGH' : 'MEDIUM',
      timeline: risk.impact === 'HIGH' ? '1-2 weeks' : '1-3 months',
      resources: this.estimateResourcesNeeded(risk),
      mitigation: risk.mitigation,
      successMetrics: this.defineSuccessMetrics(risk)
    }));
  }

  private generateMonitoringRecommendations(): string[] {
    return [
      'Set up automated alerts for critical system metrics',
      'Implement real-time dashboard monitoring',
      'Schedule weekly risk assessment reviews',
      'Establish escalation procedures for high-risk events',
      'Create backup and recovery testing schedules'
    ];
  }

  private estimateResourcesNeeded(risk: any): string[] {
    const resources: string[] = [];
    
    if (risk.factor.includes('infrastructure')) {
      resources.push('DevOps engineer', 'Cloud architect');
    }
    if (risk.factor.includes('security')) {
      resources.push('Security specialist', 'Compliance officer');
    }
    if (risk.factor.includes('personnel')) {
      resources.push('HR manager', 'Team lead');
    }
    
    return resources.length > 0 ? resources : ['Project manager', 'Technical lead'];
  }

  private defineSuccessMetrics(risk: any): string[] {
    const metrics: string[] = [];
    
    if (risk.factor.includes('infrastructure')) {
      metrics.push('System uptime > 99.9%', 'Response time < 200ms');
    }
    if (risk.factor.includes('security')) {
      metrics.push('Zero security incidents', 'All vulnerabilities patched within 24h');
    }
    if (risk.factor.includes('personnel')) {
      metrics.push('Employee retention > 95%', 'Knowledge transfer completion');
    }
    
    return metrics.length > 0 ? metrics : ['Risk probability reduced by 50%'];
  }
}