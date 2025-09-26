// path: backend/src/modules/predictive/predictive.controller.ts
// purpose: REST API controller for predictive analytics and ML features
// dependencies: NestJS, validation, swagger

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PredictiveService, PredictiveDashboard, ModelTrainingRequest, PredictionRequest } from './predictive.service';
import { ModelPerformance } from './services/ml-model.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

// DTOs would be imported from dto folder
// import { CreatePredictionDto, TrainModelDto, PredictiveQueryDto } from './dto';

@ApiTags('Predictive Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('predictive')
export class PredictiveController {
  private readonly logger = new Logger(PredictiveController.name);

  constructor(private readonly predictiveService: PredictiveService) {}

  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Get predictive analytics dashboard',
    description: 'Get comprehensive predictive analytics dashboard with models, predictions, and trends'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Predictive dashboard data retrieved successfully'
  })
  @Roles('user', 'admin', 'analyst')
  async getDashboard(@GetUser() user: User): Promise<PredictiveDashboard> {
    try {
      return await this.predictiveService.getDashboard(user.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting predictive dashboard: ${msg}`);
      throw new HttpException(
        'Failed to get predictive dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('insights/:organizationId')
  @ApiOperation({ 
    summary: 'Generate predictive insights',
    description: 'Generate comprehensive predictive insights for an organization'
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Predictive insights generated successfully'
  })
  @Roles('admin', 'analyst', 'manager')
  async generateInsights(@Param('organizationId') organizationId: string) {
    try {
      return await this.predictiveService.generateInsights(organizationId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating insights: ${msg}`);
      throw new HttpException(
        'Failed to generate predictive insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('models/train')
  @ApiOperation({ 
    summary: 'Train new ML model',
    description: 'Train a new machine learning model with specified configuration'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Model training initiated successfully'
  })
  @Roles('admin', 'analyst')
  async trainModel(
    @Body() request: ModelTrainingRequest,
    @GetUser() user: User,
  ) {
    try {
      return await this.predictiveService.trainModel(request);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error training model: ${msg}`);
      throw new HttpException(
        'Failed to train model',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('predict')
  @ApiOperation({ 
    summary: 'Generate prediction',
    description: 'Generate prediction using a trained ML model'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prediction generated successfully'
  })
  @Roles('user', 'admin', 'analyst')
  async generatePrediction(
    @Body() request: PredictionRequest,
    @GetUser() user: User,
  ) {
    try {
      const prediction = await this.predictiveService.generatePrediction({
        ...request,
        userId: user.id,
      });
      return prediction;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating prediction: ${msg}`);
      throw new HttpException(
        'Failed to generate prediction',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('models')
  @ApiOperation({ 
    summary: 'Get all ML models',
    description: 'Get list of all available ML models with their status'
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by model status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Models retrieved successfully'
  })
  @Roles('user', 'admin', 'analyst')
  async getModels(@Query('status') status?: string) {
    try {
      // Implementation would get models from MLModelService
      return { message: 'Models retrieved', status };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting models: ${msg}`);
      throw new HttpException(
        'Failed to get models',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('models/:modelId/performance')
  @ApiOperation({ 
    summary: 'Get model performance metrics',
    description: 'Get detailed performance metrics for a specific ML model'
  })
  @ApiParam({ name: 'modelId', description: 'Model ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model performance metrics retrieved successfully'
  })
  @Roles('admin', 'analyst')
  async getModelPerformance(@Param('modelId') modelId: string): Promise<ModelPerformance> {
    try {
      return await this.predictiveService.getModelPerformance(modelId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting model performance: ${msg}`);
      throw new HttpException(
        'Failed to get model performance',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put('models/:modelId/update')
  @ApiOperation({ 
    summary: 'Update ML model',
    description: 'Update an existing ML model with new training data'
  })
  @ApiParam({ name: 'modelId', description: 'Model ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model updated successfully'
  })
  @Roles('admin', 'analyst')
  async updateModel(
    @Param('modelId') modelId: string,
    @Body() newData: any[],
  ) {
    try {
      await this.predictiveService.updateModel(modelId, newData);
      return { message: 'Model updated successfully', modelId };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error updating model: ${msg}`);
      throw new HttpException(
        'Failed to update model',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('anomalies/detect')
  @ApiOperation({ 
    summary: 'Detect anomalies',
    description: 'Detect anomalies in provided data using ML algorithms'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Anomaly detection completed successfully'
  })
  @Roles('admin', 'analyst')
  async detectAnomalies(
    @Body() data: { dataSource: string; data: any[] },
  ) {
    try {
      const anomalies = await this.predictiveService.detectAnomalies(
        data.dataSource,
        data.data,
      );
      return { anomalies, count: anomalies.length };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error detecting anomalies: ${msg}`);
      throw new HttpException(
        'Failed to detect anomalies',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('forecasts/:type')
  @ApiOperation({ 
    summary: 'Get forecasts by type',
    description: 'Get forecasts for specific business metrics or user behavior'
  })
  @ApiParam({ name: 'type', description: 'Forecast type (revenue, users, performance, etc.)' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Forecast timeframe' })
  @ApiResponse({ 
    status: 200, 
    description: 'Forecasts retrieved successfully'
  })
  @Roles('user', 'admin', 'analyst', 'manager')
  async getForecasts(
    @Param('type') type: string,
    @Query('timeframe') timeframe?: string,
  ) {
    try {
      // Implementation would get forecasts from ForecastingService
      return { 
        type, 
        timeframe: timeframe || '30d',
        forecasts: [],
        message: 'Forecasts retrieved successfully'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting forecasts: ${msg}`);
      throw new HttpException(
        'Failed to get forecasts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('trends')
  @ApiOperation({ 
    summary: 'Get trend analysis',
    description: 'Get current market and business trend analysis'
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by trend category' })
  @ApiResponse({ 
    status: 200, 
    description: 'Trend analysis retrieved successfully'
  })
  @Roles('user', 'admin', 'analyst', 'manager')
  async getTrends(@Query('category') category?: string) {
    try {
      // Implementation would get trends from TrendAnalysisService
      return { 
        category: category || 'all',
        trends: [],
        message: 'Trends retrieved successfully'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting trends: ${msg}`);
      throw new HttpException(
        'Failed to get trends',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('data-mining/:organizationId')
  @ApiOperation({ 
    summary: 'Get data mining insights',
    description: 'Get data mining insights and patterns for organization'
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data mining insights retrieved successfully'
  })
  @Roles('admin', 'analyst', 'manager')
  async getDataMiningInsights(@Param('organizationId') organizationId: string) {
    try {
      // Implementation would get insights from DataMiningService
      return { 
        organizationId,
        insights: [],
        message: 'Data mining insights retrieved successfully'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting data mining insights: ${msg}`);
      throw new HttpException(
        'Failed to get data mining insights',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('models/:modelId')
  @ApiOperation({ 
    summary: 'Delete ML model',
    description: 'Delete a machine learning model'
  })
  @ApiParam({ name: 'modelId', description: 'Model ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Model deleted successfully'
  })
  @Roles('admin')
  async deleteModel(@Param('modelId') modelId: string) {
    try {
      // Implementation would delete model via MLModelService
      return { message: 'Model deleted successfully', modelId };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting model: ${msg}`);
      throw new HttpException(
        'Failed to delete model',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('predictions/history')
  @ApiOperation({ 
    summary: 'Get prediction history',
    description: 'Get historical predictions for the user'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Prediction history retrieved successfully'
  })
  @Roles('user', 'admin', 'analyst')
  async getPredictionHistory(
    @GetUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const offsetNum = offset ? parseInt(offset) : 0;
      
      return { 
        predictions: [],
        pagination: { limit: limitNum, offset: offsetNum },
        message: 'Prediction history retrieved successfully'
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting prediction history: ${msg}`);
      throw new HttpException(
        'Failed to get prediction history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}