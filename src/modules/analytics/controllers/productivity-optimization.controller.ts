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
// import { GetUser } from '../../auth/decorators/get-user.decorator';
import { ProductivityOptimizationService } from '../services/productivity-optimization.service';

@ApiTags('Productivity Optimization')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('productivity')
export class ProductivityOptimizationController {
  constructor(
    private readonly productivityService: ProductivityOptimizationService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get user productivity metrics' })
  @ApiResponse({
    status: 200,
    description: 'Productivity metrics retrieved successfully',
  })
  async getUserProductivityMetrics(
    @Query('userId') userId: string,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    try {
      const metrics = await this.productivityService.analyzeUserProductivity(
        userId,
        timeframe,
      );

      return {
        success: true,
        data: metrics,
        message: 'Productivity metrics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve productivity metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate comprehensive productivity report' })
  @ApiResponse({
    status: 200,
    description: 'Productivity report generated successfully',
  })
  async generateProductivityReport(
    @Query('userId') userId: string,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    try {
      const report = await this.productivityService.generateProductivityReport(
        userId,
        timeframe,
      );

      return {
        success: true,
        data: report,
        message: 'Productivity report generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate productivity report',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time productivity metrics' })
  @ApiResponse({
    status: 200,
    description: 'Real-time productivity metrics retrieved successfully',
  })
  async getRealTimeMetrics(@Query('userId') userId: string) {
    try {
      const metrics = await this.productivityService.getRealTimeProductivityMetrics(
        userId,
      );

      return {
        success: true,
        data: metrics,
        message: 'Real-time productivity metrics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve real-time metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('alerts/configure')
  @ApiOperation({ summary: 'Configure productivity alerts' })
  @ApiResponse({
    status: 200,
    description: 'Productivity alerts configured successfully',
  })
  async configureAlerts(
    @Query('userId') userId: string,
    @Body() alertConfig: any,
  ) {
    try {
      await this.productivityService.configureProductivityAlerts(
        userId,
        alertConfig,
      );

      return {
        success: true,
        message: 'Productivity alerts configured successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to configure productivity alerts',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:targetUserId/metrics')
  @ApiOperation({ summary: 'Get productivity metrics for specific user (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User productivity metrics retrieved successfully',
  })
  async getSpecificUserMetrics(
    @Query('requesterId') requesterId: string,
    @Param('targetUserId') targetUserId: string,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    try {
      // En una implementación real, aquí se verificarían los permisos de administrador
      
      const metrics = await this.productivityService.analyzeUserProductivity(
        targetUserId,
        timeframe,
      );

      return {
        success: true,
        data: metrics,
        message: 'User productivity metrics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve user productivity metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('team/metrics')
  @ApiOperation({ summary: 'Get team productivity metrics' })
  @ApiResponse({
    status: 200,
    description: 'Team productivity metrics retrieved successfully',
  })
  async getTeamMetrics(
    @Query('userId') userId: string,
    @Query('teamId') teamId?: string,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    try {
      // Mock team metrics - en producción se calcularían métricas agregadas del equipo
      const teamMetrics = {
        teamId: teamId || 'default-team',
        overallProductivity: 78.5,
        memberCount: 8,
        topPerformers: [
          { userId: 'user1', name: 'Alice Johnson', score: 92 },
          { userId: 'user2', name: 'Bob Smith', score: 88 },
          { userId: 'user3', name: 'Carol Davis', score: 85 },
        ],
        teamCollaboration: {
          communicationEfficiency: 82,
          knowledgeSharing: 75,
          conflictResolution: 90,
          teamSynergy: 78,
        },
        commonChallenges: [
          'Meeting overload affecting individual productivity',
          'Tool fragmentation causing context switching',
          'Uneven workload distribution',
        ],
        recommendations: [
          'Implement team-wide focus blocks',
          'Standardize communication tools',
          'Improve task delegation processes',
        ],
        trends: {
          lastWeek: 76.2,
          lastMonth: 74.8,
          trend: 'improving',
        },
      };

      return {
        success: true,
        data: teamMetrics,
        message: 'Team productivity metrics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve team productivity metrics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('insights/ai')
  @ApiOperation({ summary: 'Get AI-powered productivity insights' })
  @ApiResponse({
    status: 200,
    description: 'AI productivity insights retrieved successfully',
  })
  async getAIInsights(
    @Query('userId') userId: string,
    @Query('focus') focus?: string, // 'efficiency', 'collaboration', 'wellness', etc.
  ) {
    try {
      // Mock AI insights - en producción se usarían modelos de ML
      const insights = {
        personalizedInsights: [
          {
            category: 'Time Management',
            insight: 'Your productivity peaks between 9-11 AM. Consider scheduling your most important tasks during this window.',
            confidence: 0.87,
            actionable: true,
            impact: 'high',
          },
          {
            category: 'Focus Optimization',
            insight: 'You lose an average of 23 minutes of focus time after each interruption. Enabling focus mode could save you 2.5 hours per day.',
            confidence: 0.92,
            actionable: true,
            impact: 'high',
          },
          {
            category: 'Tool Efficiency',
            insight: 'You switch between applications 47 times per hour. Consolidating similar tasks could reduce this by 60%.',
            confidence: 0.78,
            actionable: true,
            impact: 'medium',
          },
        ],
        predictiveAnalysis: {
          nextWeekProductivity: 82,
          confidence: 0.75,
          keyFactors: [
            'Reduced meeting load',
            'Improved sleep pattern',
            'Better task prioritization',
          ],
          risks: [
            'Upcoming project deadline may increase stress',
            'Team member vacation may increase workload',
          ],
        },
        benchmarkComparison: {
          vsIndustryAverage: '+12%',
          vsTopPerformers: '-8%',
          improvementPotential: '15-20%',
          keyGaps: [
            'Automation utilization',
            'Deep work consistency',
            'Energy management',
          ],
        },
        smartRecommendations: [
          {
            title: 'Implement Pomodoro Technique',
            description: 'Based on your attention patterns, 25-minute focused work sessions could improve your efficiency by 18%.',
            priority: 'high',
            estimatedImpact: 18,
            timeToImplement: '1 day',
          },
          {
            title: 'Optimize Meeting Schedule',
            description: 'Batching meetings on specific days could increase your deep work time by 40%.',
            priority: 'medium',
            estimatedImpact: 25,
            timeToImplement: '1 week',
          },
        ],
      };

      return {
        success: true,
        data: insights,
        message: 'AI productivity insights retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve AI insights',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('goals/set')
  @ApiOperation({ summary: 'Set productivity goals' })
  @ApiResponse({
    status: 200,
    description: 'Productivity goals set successfully',
  })
  async setProductivityGoals(
    @Query('userId') userId: string,
    @Body() goals: any,
  ) {
    try {
      // Mock goal setting - en producción se guardarían en la base de datos
      const processedGoals = {
        userId,
        goals: goals.goals || [],
        targetDate: goals.targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        status: 'active',
        progress: goals.goals?.map((goal: any) => ({
          goalId: goal.id,
          currentValue: 0,
          targetValue: goal.target,
          progress: 0,
        })) || [],
      };

      return {
        success: true,
        data: processedGoals,
        message: 'Productivity goals set successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to set productivity goals',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('goals/progress')
  @ApiOperation({ summary: 'Get productivity goals progress' })
  @ApiResponse({
    status: 200,
    description: 'Goals progress retrieved successfully',
  })
  async getGoalsProgress(@Query('userId') userId: string) {
    try {
      // Mock goals progress
      const progress = {
        activeGoals: [
          {
            id: 'goal1',
            title: 'Increase focus time to 6 hours/day',
            target: 6,
            current: 4.5,
            progress: 75,
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            status: 'on_track',
          },
          {
            id: 'goal2',
            title: 'Reduce meeting time by 25%',
            target: 25,
            current: 18,
            progress: 72,
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
            status: 'on_track',
          },
          {
            id: 'goal3',
            title: 'Complete 95% of planned tasks',
            target: 95,
            current: 87,
            progress: 92,
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            status: 'at_risk',
          },
        ],
        overallProgress: 80,
        completedGoals: 3,
        totalGoals: 6,
        streak: 12, // días consecutivos cumpliendo objetivos
      };

      return {
        success: true,
        data: progress,
        message: 'Goals progress retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve goals progress',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}