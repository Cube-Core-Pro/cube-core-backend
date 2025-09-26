// path: src/pos/controllers/pos-transaction.controller.ts
// purpose: POS Transaction endpoints for sales processing and payment handling
// dependencies: @nestjs/common, @nestjs/swagger, PosTransactionService, AuthGuard

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  
  Request,
  
  
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { PosTransactionService } from '../services/pos-transaction.service';
import { CreateTransactionDto, TransactionType, TransactionStatus } from '../dto';

@ApiTags('POS - Transactions')
@ApiBearerAuth()
@Controller('pos/transactions')
export class PosTransactionController {
  constructor(private readonly transactionService: PosTransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async create(@Request() req: any, @Body() createTransactionDto: CreateTransactionDto) {
    const tenantId = req.user?.tenantId;
    const cashierId = req.user?.id;
    return this.transactionService.create(tenantId, cashierId, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus, description: 'Transaction status' })
  @ApiQuery({ name: 'type', required: false, enum: TransactionType, description: 'Transaction type' })
  @ApiQuery({ name: 'cashierId', required: false, type: String, description: 'Cashier ID' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Customer ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('cashierId') cashierId?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.tenantId;
    return this.transactionService.findAll(tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
      cashierId,
      customerId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('daily-sales')
  @ApiOperation({ summary: 'Get daily sales statistics' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date (ISO string), defaults to today' })
  @ApiResponse({ status: 200, description: 'Daily sales statistics retrieved successfully' })
  async getDailySales(@Request() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId;
    const targetDate = date ? new Date(date) : undefined;
    return this.transactionService.getDailySales(tenantId, targetDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    return this.transactionService.findOne(tenantId, id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Add payment to transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Payment added successfully' })
  @ApiResponse({ status: 400, description: 'Transaction already completed' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async addPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() paymentData: {
      method: string;
      amount: number;
      reference?: string;
      metadata?: any;
    },
  ) {
    const tenantId = req.user?.tenantId;
    return this.transactionService.addPayment(tenantId, id, paymentData);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void/cancel transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction voided successfully' })
  @ApiResponse({ status: 400, description: 'Transaction already cancelled' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async voidTransaction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() voidData: { reason?: string },
  ) {
    const tenantId = req.user?.tenantId;
    return this.transactionService.voidTransaction(tenantId, id, voidData.reason);
  }
}