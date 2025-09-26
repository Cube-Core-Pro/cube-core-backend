// path: src/scm/controllers/supplier.controller.ts
// purpose: Supplier CRUD operations with structured validation
// dependencies: @nestjs/common, class-validator, swagger

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { SupplierResponseDto } from '../dto/supplier-response.dto';
import { ValidationErrorResponseDto } from '../../common/dto/validation-error-response.dto';

@ApiTags('suppliers')
@Controller('scm/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @Roles('admin', 'scm_manager', 'scm_user')
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ 
    status: 201, 
    description: 'Supplier created successfully',
    type: SupplierResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    type: ValidationErrorResponseDto 
  })
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @GetUser() user: any,
  ): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.supplierService.create(user.tenantId, createSupplierDto);
      return {
        success: true,
        data: supplier,
        message: 'Supplier created successfully',
      };
    } catch (error) {
      if (error.message === 'Supplier code already exists') {
        throw new HttpException({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'code',
              message: 'Supplier code already exists',
              code: 'DUPLICATE_VALUE',
            }
          ],
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Get()
  @Roles('admin', 'scm_manager', 'scm_user', 'scm_viewer')
  @ApiOperation({ summary: 'Get all suppliers with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async findAll(
    @GetUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      category,
    };

    const result = await this.supplierService.findAll(user.tenantId, options);
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
  @Roles('admin', 'scm_manager', 'scm_user', 'scm_viewer')
  @ApiOperation({ summary: 'Get supplier statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@GetUser() user: any) {
    const stats = await this.supplierService.getSupplierStats(user.tenantId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @Roles('admin', 'scm_manager', 'scm_user', 'scm_viewer')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Supplier retrieved successfully',
    type: SupplierResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.supplierService.findOne(user.tenantId, id);
    return {
      success: true,
      data: supplier,
    };
  }

  @Patch(':id')
  @Roles('admin', 'scm_manager', 'scm_user')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ 
    status: 200, 
    description: 'Supplier updated successfully',
    type: SupplierResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error',
    type: ValidationErrorResponseDto 
  })
  async update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @GetUser() user: any,
  ): Promise<SupplierResponseDto> {
    try {
      const supplier = await this.supplierService.update(user.tenantId, id, updateSupplierDto);
      return {
        success: true,
        data: supplier,
        message: 'Supplier updated successfully',
      };
    } catch (error) {
      if (error.message === 'Supplier code already exists') {
        throw new HttpException({
          success: false,
          message: 'Validation failed',
          errors: [
            {
              field: 'code',
              message: 'Supplier code already exists',
              code: 'DUPLICATE_VALUE',
            }
          ],
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles('admin', 'scm_manager')
  @ApiOperation({ summary: 'Delete supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete supplier with dependencies' })
  async remove(
    @Param('id') id: string,
    @GetUser() user: any,
  ) {
    try {
      await this.supplierService.remove(user.tenantId, id);
      return {
        success: true,
        message: 'Supplier deleted successfully',
      };
    } catch (error) {
      if (error.message === 'Cannot delete supplier with existing purchase orders') {
        throw new HttpException({
          success: false,
          message: 'Cannot delete supplier with existing purchase orders',
          code: 'HAS_DEPENDENCIES',
        }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }
}
