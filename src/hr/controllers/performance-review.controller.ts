// path: src/hr/controllers/performance-review.controller.ts
// purpose: Performance review CRUD operations with structured validation
// dependencies: @nestjs/common, class-validator, swagger

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { PerformanceReviewService } from '../services/performance-review.service';
import { CreatePerformanceReviewDto } from '../dto/create-performance-review.dto';
import { UpdatePerformanceReviewDto } from '../dto/update-performance-review.dto';
import { PerformanceReviewResponseDto } from '../dto/performance-review-response.dto';
import { ValidationErrorResponseDto } from '../../common/dto/validation-error-response.dto';

@ApiTags('performance-reviews')
@Controller('hr/performance-reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceReviewController {
  constructor(private readonly performanceReviewService: PerformanceReviewService) {}

  @Post()
  @Roles('admin', 'hr_manager', 'hr_user', 'manager')
  @ApiOperation({ summary: 'Create a new performance review' })
  @ApiResponse({ 
    status: 201, 
    description: 'Performance review created successfully',
    type: PerformanceReviewResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    type: ValidationErrorResponseDto 
  })
  async create(
    @Body() createReviewDto: CreatePerformanceReviewDto,
    @GetUser() user: any,
  ): Promise<PerformanceReviewResponseDto> {
    try {
      const review = await this.performanceReviewService.create(user.tenantId, createReviewDto);
      return {
        success: true,
        data: review,
        message: 'Performance review created successfully',
      };
    } catch (error) {
      if (error.message === 'Employee not found') {
        throw new HttpException({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'employeeId',
              message: 'Employee not found',
              code: 'NOT_FOUND',
            }
          ],
        }, HttpStatus.BAD_REQUEST);
      }
      if (error.message === 'Reviewer not found') {
        throw new HttpException({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'reviewerId',
              message: 'Reviewer not found',
              code: 'NOT_FOUND',
            }
          ],
        }, HttpStatus.BAD_REQUEST);
      }
      if (error.message === 'Performance review already exists for this period') {
        throw new HttpException({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'period',
              message: 'Performance review already exists for this period',
              code: 'DUPLICATE_VALUE',
            }
          ],
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get()
  @Roles('admin', 'hr_manager', 'hr_user', 'hr_viewer', 'manager', 'employee')
  @ApiOperation({ summary: 'Get all performance reviews with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Performance reviews retrieved successfully' })
  async findAll(
    @GetUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('reviewerId') reviewerId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      employeeId,
      reviewerId,
      status,
      type,
    };

    const result = await this.performanceReviewService.findAll(user.tenantId, options);
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('stats')
  @Roles('admin', 'hr_manager', 'hr_user', 'hr_viewer', 'manager')
  @ApiOperation({ summary: 'Get performance review statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@GetUser() user: any) {
    const stats = await this.performanceReviewService.getReviewStats(user.tenantId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('upcoming')
  @Roles('admin', 'hr_manager', 'hr_user', 'hr_viewer', 'manager')
  @ApiOperation({ summary: 'Get upcoming performance reviews' })
  @ApiResponse({ status: 200, description: 'Upcoming reviews retrieved successfully' })
  async getUpcoming(
    @GetUser() user: any,
    @Query('days') days?: string,
  ) {
    const daysAhead = days ? parseInt(days, 10) : 30;
    const upcomingReviews = await this.performanceReviewService.getUpcomingReviews(user.tenantId, daysAhead);
    return {
      success: true,
      data: upcomingReviews,
    };
  }

  @Get(':id')
  @Roles('admin', 'hr_manager', 'hr_user', 'hr_viewer', 'manager', 'employee')
  @ApiOperation({ summary: 'Get performance review by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance review retrieved successfully',
    type: PerformanceReviewResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Performance review not found' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<PerformanceReviewResponseDto> {
    const review = await this.performanceReviewService.findOne(user.tenantId, id);
    return {
      success: true,
      data: review,
    };
  }

  @Patch(':id')
  @Roles('admin', 'hr_manager', 'hr_user', 'manager')
  @ApiOperation({ summary: 'Update performance review' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance review updated successfully',
    type: PerformanceReviewResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    type: ValidationErrorResponseDto 
  })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdatePerformanceReviewDto,
    @GetUser() user: any,
  ): Promise<PerformanceReviewResponseDto> {
    const review = await this.performanceReviewService.update(user.tenantId, id, updateReviewDto);
    return {
      success: true,
      data: review,
      message: 'Performance review updated successfully',
    };
  }

  @Patch(':id/complete')
  @Roles('admin', 'hr_manager', 'hr_user', 'manager')
  @ApiOperation({ summary: 'Mark performance review as completed' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance review completed successfully',
    type: PerformanceReviewResponseDto 
  })
  async complete(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<PerformanceReviewResponseDto> {
    try {
      const review = await this.performanceReviewService.complete(user.tenantId, id);
      return {
        success: true,
        data: review,
        message: 'Performance review completed successfully',
      };
    } catch (error) {
      if (error.message === 'Review is already completed') {
        throw new HttpException({
          success: false,
          message: 'Review is already completed',
          code: 'INVALID_STATE',
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Patch(':id/approve')
  @Roles('admin', 'hr_manager', 'manager')
  @ApiOperation({ summary: 'Approve performance review' })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance review approved successfully',
    type: PerformanceReviewResponseDto 
  })
  async approve(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<PerformanceReviewResponseDto> {
    try {
      const review = await this.performanceReviewService.approve(user.tenantId, id);
      return {
        success: true,
        data: review,
        message: 'Performance review approved successfully',
      };
    } catch (error) {
      if (error.message === 'Only completed reviews can be approved') {
        throw new HttpException({
          success: false,
          message: 'Only completed reviews can be approved',
          code: 'INVALID_STATE',
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}