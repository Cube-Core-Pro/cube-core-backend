// path: backend/src/fortune-500-premium/fortune-500-premium.controller.ts
// purpose: Fortune 500 Premium Features Controller - Executive-grade functionality
// dependencies: NestJS, Swagger, Fortune500PremiumService

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Fortune500PremiumService } from './fortune-500-premium.service';

@ApiTags('Fortune 500 Premium')
@Controller('fortune-500-premium')
export class Fortune500PremiumController {
  private readonly logger = new Logger(Fortune500PremiumController.name);

  constructor(
    private readonly fortune500Service: Fortune500PremiumService,
  ) {}

  @Get('executive-suite')
  @ApiOperation({ 
    summary: 'Get Executive Suite Dashboard',
    description: 'Comprehensive C-level executive dashboard with real-time KPIs and strategic insights'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Executive suite dashboard retrieved successfully' 
  })
  async getExecutiveSuite() {
    try {
      this.logger.log('Fetching Fortune 500 Executive Suite dashboard');
      const dashboard = await this.fortune500Service.getExecutiveSuite();
      
      return {
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
        message: 'Executive suite dashboard retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching executive suite dashboard', error);
      throw new HttpException(
        'Failed to retrieve executive suite dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('board-governance')
  @ApiOperation({ 
    summary: 'Get Board Governance Metrics',
    description: 'Board-level governance metrics, compliance status, and regulatory reporting'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Board governance metrics retrieved successfully' 
  })
  async getBoardGovernance() {
    try {
      this.logger.log('Fetching board governance metrics');
      const governance = await this.fortune500Service.getBoardGovernance();
      
      return {
        success: true,
        data: governance,
        timestamp: new Date().toISOString(),
        message: 'Board governance metrics retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching board governance metrics', error);
      throw new HttpException(
        'Failed to retrieve board governance metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('strategic-planning')
  @ApiOperation({ 
    summary: 'Get Strategic Planning Dashboard',
    description: 'Long-term strategic planning with scenario modeling and competitive analysis'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Strategic planning dashboard retrieved successfully' 
  })
  async getStrategicPlanning() {
    try {
      this.logger.log('Fetching strategic planning dashboard');
      const planning = await this.fortune500Service.getStrategicPlanning();
      
      return {
        success: true,
        data: planning,
        timestamp: new Date().toISOString(),
        message: 'Strategic planning dashboard retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching strategic planning dashboard', error);
      throw new HttpException(
        'Failed to retrieve strategic planning dashboard',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('enterprise-risk')
  @ApiOperation({ 
    summary: 'Get Enterprise Risk Management',
    description: 'Comprehensive enterprise risk assessment and mitigation strategies'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Enterprise risk management data retrieved successfully' 
  })
  async getEnterpriseRisk() {
    try {
      this.logger.log('Fetching enterprise risk management data');
      const risk = await this.fortune500Service.getEnterpriseRisk();
      
      return {
        success: true,
        data: risk,
        timestamp: new Date().toISOString(),
        message: 'Enterprise risk management data retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching enterprise risk data', error);
      throw new HttpException(
        'Failed to retrieve enterprise risk data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('global-operations')
  @ApiOperation({ 
    summary: 'Get Global Operations Overview',
    description: 'Multi-region operational metrics and performance indicators'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Global operations overview retrieved successfully' 
  })
  async getGlobalOperations() {
    try {
      this.logger.log('Fetching global operations overview');
      const operations = await this.fortune500Service.getGlobalOperations();
      
      return {
        success: true,
        data: operations,
        timestamp: new Date().toISOString(),
        message: 'Global operations overview retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error fetching global operations overview', error);
      throw new HttpException(
        'Failed to retrieve global operations overview',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}