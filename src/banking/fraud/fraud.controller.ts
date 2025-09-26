// path: src/banking/fraud/fraud.controller.ts
// purpose: Fraud Detection Controller - REST API endpoints for fraud management
// dependencies: NestJS, FraudService, DTOs, Guards, Swagger

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
  ParseUUIDPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { FraudService, FraudAnalysisResult, TransactionContext } from './fraud.service';
import { CreateFraudAlertDto, UpdateFraudAlertDto, CreateFraudRuleDto, UpdateFraudRuleDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetTenant } from '../../auth/decorators/get-tenant.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Permission } from '../../auth/enums/permission.enum';

@ApiTags('Banking - Fraud Detection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banking/fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  // ============================================================================
  // FRAUD ANALYSIS
  // ============================================================================

  @Post('analyze')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Analyze transaction for fraud' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud analysis completed' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid transaction data' })
  async analyzeTransaction(
    @Body() transactionContext: TransactionContext,
    @GetTenant() tenantId: string
  ): Promise<FraudAnalysisResult> {
    return this.fraudService.analyzeTransaction(transactionContext, tenantId);
  }

  // ============================================================================
  // FRAUD ALERTS
  // ============================================================================

  @Post('alerts')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Create a fraud alert' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Fraud alert created successfully' })
  async createFraudAlert(
    @Body() createFraudAlertDto: CreateFraudAlertDto,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.createFraudAlert(createFraudAlertDto, tenantId);
  }

  @Get('alerts')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get fraud alerts' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'riskLevel', required: false, description: 'Filter by risk level' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by account ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud alerts retrieved successfully' })
  async getFraudAlerts(
    @GetTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('customerId') customerId?: string,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (riskLevel) filters.riskLevel = riskLevel;
    if (customerId) filters.customerId = customerId;
    if (accountId) filters.accountId = accountId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.fraudService.getFraudAlerts(tenantId, filters);
  }

  @Get('alerts/:id')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get fraud alert by ID' })
  @ApiParam({ name: 'id', description: 'Fraud alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud alert retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fraud alert not found' })
  async getFraudAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.getFraudAlert(id, tenantId);
  }

  @Patch('alerts/:id')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Update fraud alert' })
  @ApiParam({ name: 'id', description: 'Fraud alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud alert updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fraud alert not found' })
  async updateFraudAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFraudAlertDto: UpdateFraudAlertDto,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.updateFraudAlert(id, updateFraudAlertDto, tenantId);
  }

  @Post('alerts/:id/review')
  @Roles(Permission.BANKING_FRAUD_APPROVE)
  @ApiOperation({ summary: 'Review fraud alert' })
  @ApiParam({ name: 'id', description: 'Fraud alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud alert reviewed successfully' })
  async reviewFraudAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewData: {
      status: 'APPROVED' | 'REJECTED' | 'FALSE_POSITIVE';
      reviewNotes?: string;
    },
    @GetTenant() tenantId: string,
    @GetUser() user: any
  ) {
    return this.fraudService.reviewFraudAlert(id, {
      ...reviewData,
      reviewedBy: user.id
    }, tenantId);
  }

  // ============================================================================
  // FRAUD RULES
  // ============================================================================

  @Post('rules')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Create a fraud rule' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Fraud rule created successfully' })
  async createFraudRule(
    @Body() createFraudRuleDto: CreateFraudRuleDto,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.createFraudRule(createFraudRuleDto, tenantId);
  }

  @Get('rules')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get fraud rules' })
  @ApiQuery({ name: 'activeOnly', required: false, description: 'Get only active rules' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud rules retrieved successfully' })
  async getFraudRules(
    @GetTenant() tenantId: string,
    @Query('activeOnly') activeOnly?: boolean
  ) {
    return this.fraudService.getFraudRules(tenantId, activeOnly);
  }

  @Get('rules/:id')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get fraud rule by ID' })
  @ApiParam({ name: 'id', description: 'Fraud rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud rule retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fraud rule not found' })
  async getFraudRule(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.getFraudRule(id, tenantId);
  }

  @Patch('rules/:id')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Update fraud rule' })
  @ApiParam({ name: 'id', description: 'Fraud rule ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud rule updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fraud rule not found' })
  async updateFraudRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFraudRuleDto: UpdateFraudRuleDto,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.updateFraudRule(id, updateFraudRuleDto, tenantId);
  }

  @Delete('rules/:id')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Delete fraud rule' })
  @ApiParam({ name: 'id', description: 'Fraud rule ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Fraud rule deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fraud rule not found' })
  async deleteFraudRule(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    await this.fraudService.deleteFraudRule(id, tenantId);
  }

  // ============================================================================
  // TRUSTED DEVICES
  // ============================================================================

  @Post('devices/register')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Register trusted device' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Trusted device registered successfully' })
  async registerTrustedDevice(
    @Body() deviceData: {
      customerId: string;
      deviceFingerprint: string;
      deviceInfo?: any;
    },
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.registerTrustedDevice(
      deviceData.customerId,
      {
        deviceFingerprint: deviceData.deviceFingerprint,
        deviceInfo: deviceData.deviceInfo
      },
      tenantId
    );
  }

  @Get('devices/:customerId')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get trusted devices for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trusted devices retrieved successfully' })
  async getTrustedDevices(
    @Param('customerId') customerId: string,
    @GetTenant() tenantId: string
  ) {
    return this.fraudService.getTrustedDevices(customerId, tenantId);
  }

  @Delete('devices/:id')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Revoke trusted device' })
  @ApiParam({ name: 'id', description: 'Trusted device ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Trusted device revoked successfully' })
  async revokeTrustedDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    await this.fraudService.revokeTrustedDevice(id, tenantId);
  }

  // ============================================================================
  // FRAUD STATISTICS
  // ============================================================================

  @Get('statistics')
  @Roles(Permission.BANKING_FRAUD_READ)
  @ApiOperation({ summary: 'Get fraud statistics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for statistics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fraud statistics retrieved successfully' })
  async getFraudStatistics(
    @GetTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.fraudService.getFraudStatistics(tenantId, start, end);
  }

  @Post('statistics/generate/:date')
  @Roles(Permission.BANKING_FRAUD_WRITE)
  @ApiOperation({ summary: 'Generate daily fraud statistics' })
  @ApiParam({ name: 'date', description: 'Date for statistics (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Daily fraud statistics generated successfully' })
  async generateDailyStatistics(
    @Param('date') date: string,
    @GetTenant() tenantId: string
  ) {
    const targetDate = new Date(date);
    return this.fraudService.generateDailyFraudStatistics(targetDate, tenantId);
  }
}