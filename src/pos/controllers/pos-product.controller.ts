// path: src/pos/controllers/pos-product.controller.ts
// purpose: POS Product endpoints for CRUD operations and inventory management
// dependencies: @nestjs/common, @nestjs/swagger, PosProductService, AuthGuard

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PosProductService } from '../services/pos-product.service';
import { CreateProductDto, UpdateProductDto } from '../dto';

@ApiTags('POS - Products')
@ApiBearerAuth()
@Controller('pos/products')
export class PosProductController {
  constructor(private readonly productService: PosProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Product with SKU already exists' })
  async create(@Request() req: any, @Body() createProductDto: CreateProductDto) {
    const tenantId = req.user?.tenantId;
    return this.productService.create(tenantId, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Product category' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const tenantId = req.user?.tenantId;
    return this.productService.findAll(tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      category,
      isActive,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    return this.productService.getCategories(tenantId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get products with low stock levels' })
  @ApiResponse({ status: 200, description: 'Low stock products retrieved successfully' })
  async getLowStockProducts(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    return this.productService.getLowStockProducts(tenantId);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: 'Get product by SKU' })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySku(@Request() req: any, @Param('sku') sku: string) {
    const tenantId = req.user?.tenantId;
    return this.productService.findBySku(tenantId, sku);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiParam({ name: 'barcode', description: 'Product barcode' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findByBarcode(@Request() req: any, @Param('barcode') barcode: string) {
    const tenantId = req.user?.tenantId;
    return this.productService.findByBarcode(tenantId, barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.productService.findOne(tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'SKU or barcode already exists' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const tenantId = req.user?.tenantId;
    return this.productService.update(tenantId, id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete product with existing transactions' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    await this.productService.remove(tenantId, id);
  }

  @Post(':id/stock')
  @ApiOperation({ summary: 'Update product stock' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Request() req: any,
    @Param('id') id: string,
    @Body() stockData: {
      quantity: number;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      reason?: string;
      reference?: string;
    },
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    return this.productService.updateStock(
      tenantId,
      id,
      stockData.quantity,
      stockData.type,
      stockData.reason,
      userId,
      stockData.reference,
    );
  }
}