// path: src/banking/compliance/compliance.controller.ts
// purpose: Banking Compliance Controller - REST API endpoints for compliance management
// dependencies: NestJS, ComplianceService, DTOs, Guards, Swagger

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
import { ComplianceService } from './compliance.service';
import { 
  CreateKycProfileDto, 
  UpdateKycProfileDto, 
  CreateKycCheckDto, 
  CreateAmlAlertDto, 
  UpdateAmlAlertDto,
  CreateComplianceDocumentDto,
  CreateRegulatoryReportDto
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetTenant } from '../../auth/decorators/get-tenant.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Permission } from '../../auth/enums/permission.enum';

@ApiTags('Banking - Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('banking/compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ============================================================================
  // KYC PROFILES
  // ============================================================================

  @Post('kyc/profiles')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Create KYC profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'KYC profile created successfully' })
  async createKycProfile(
    @Body() createKycProfileDto: CreateKycProfileDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.createKycProfile(createKycProfileDto, tenantId);
  }

  @Get('kyc/profiles')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get KYC profiles' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'riskLevel', required: false, description: 'Filter by risk level' })
  @ApiQuery({ name: 'customerType', required: false, description: 'Filter by customer type' })
  @ApiQuery({ name: 'jurisdiction', required: false, description: 'Filter by jurisdiction' })
  @ApiQuery({ name: 'reviewDue', required: false, description: 'Filter profiles due for review' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC profiles retrieved successfully' })
  async getKycProfiles(
    @GetTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('customerType') customerType?: string,
    @Query('jurisdiction') jurisdiction?: string,
    @Query('reviewDue') reviewDue?: boolean
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (riskLevel) filters.riskLevel = riskLevel;
    if (customerType) filters.customerType = customerType;
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (reviewDue !== undefined) filters.reviewDue = reviewDue;

    return this.complianceService.getKycProfiles(tenantId, filters);
  }

  @Get('kyc/profiles/:id')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get KYC profile by ID' })
  @ApiParam({ name: 'id', description: 'KYC profile ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC profile retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'KYC profile not found' })
  async getKycProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getKycProfile(id, tenantId);
  }

  @Get('kyc/profiles/customer/:customerId')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get KYC profile by customer ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC profile retrieved successfully' })
  async getKycProfileByCustomer(
    @Param('customerId') customerId: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getKycProfileByCustomer(customerId, tenantId);
  }

  @Patch('kyc/profiles/:id')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Update KYC profile' })
  @ApiParam({ name: 'id', description: 'KYC profile ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC profile updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'KYC profile not found' })
  async updateKycProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateKycProfileDto: UpdateKycProfileDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.updateKycProfile(id, updateKycProfileDto, tenantId);
  }

  @Delete('kyc/profiles/:id')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Delete KYC profile' })
  @ApiParam({ name: 'id', description: 'KYC profile ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'KYC profile deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'KYC profile not found' })
  async deleteKycProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    await this.complianceService.deleteKycProfile(id, tenantId);
  }

  // ============================================================================
  // KYC CHECKS
  // ============================================================================

  @Post('kyc/checks')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Create KYC check' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'KYC check created successfully' })
  async createKycCheck(
    @Body() createKycCheckDto: CreateKycCheckDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.createKycCheck(createKycCheckDto, tenantId);
  }

  @Get('kyc/checks/:profileId')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get KYC checks for profile' })
  @ApiParam({ name: 'profileId', description: 'KYC profile ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC checks retrieved successfully' })
  async getKycChecks(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getKycChecks(profileId, tenantId);
  }

  @Post('kyc/checks/:profileId/perform/:checkType')
  @Roles(Permission.BANKING_COMPLIANCE_KYC_MANAGE)
  @ApiOperation({ summary: 'Perform KYC check' })
  @ApiParam({ name: 'profileId', description: 'KYC profile ID' })
  @ApiParam({ name: 'checkType', description: 'Type of check to perform' })
  @ApiResponse({ status: HttpStatus.OK, description: 'KYC check performed successfully' })
  async performKycCheck(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('checkType') checkType: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.performKycCheck(profileId, checkType, tenantId);
  }

  @Post('kyc/profiles/:id/assess')
  @Roles(Permission.BANKING_COMPLIANCE_KYC_MANAGE)
  @ApiOperation({ summary: 'Perform compliance assessment' })
  @ApiParam({ name: 'id', description: 'KYC profile ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance assessment completed successfully' })
  async performComplianceAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.performComplianceAssessment(id, tenantId);
  }

  // ============================================================================
  // AML ALERTS
  // ============================================================================

  @Post('aml/alerts')
  @Roles(Permission.BANKING_COMPLIANCE_AML_MANAGE)
  @ApiOperation({ summary: 'Create AML alert' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'AML alert created successfully' })
  async createAmlAlert(
    @Body() createAmlAlertDto: CreateAmlAlertDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.createAmlAlert(createAmlAlertDto, tenantId);
  }

  @Get('aml/alerts')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get AML alerts' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'alertType', required: false, description: 'Filter by alert type' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AML alerts retrieved successfully' })
  async getAmlAlerts(
    @GetTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('alertType') alertType?: string,
    @Query('customerId') customerId?: string,
    @Query('assignedTo') assignedTo?: string
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (alertType) filters.alertType = alertType;
    if (customerId) filters.customerId = customerId;
    if (assignedTo) filters.assignedTo = assignedTo;

    return this.complianceService.getAmlAlerts(tenantId, filters);
  }

  @Get('aml/alerts/:id')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get AML alert by ID' })
  @ApiParam({ name: 'id', description: 'AML alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AML alert retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'AML alert not found' })
  async getAmlAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getAmlAlert(id, tenantId);
  }

  @Patch('aml/alerts/:id')
  @Roles(Permission.BANKING_COMPLIANCE_AML_MANAGE)
  @ApiOperation({ summary: 'Update AML alert' })
  @ApiParam({ name: 'id', description: 'AML alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AML alert updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'AML alert not found' })
  async updateAmlAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAmlAlertDto: UpdateAmlAlertDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.updateAmlAlert(id, updateAmlAlertDto, tenantId);
  }

  @Post('aml/alerts/:id/resolve')
  @Roles(Permission.BANKING_COMPLIANCE_AML_MANAGE)
  @ApiOperation({ summary: 'Resolve AML alert' })
  @ApiParam({ name: 'id', description: 'AML alert ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AML alert resolved successfully' })
  async resolveAmlAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resolutionData: { resolution: string },
    @GetTenant() tenantId: string,
    @GetUser() user: any
  ) {
    return this.complianceService.resolveAmlAlert(id, resolutionData.resolution, user.id, tenantId);
  }

  // ============================================================================
  // COMPLIANCE DOCUMENTS
  // ============================================================================

  @Post('documents')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Create compliance document' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Compliance document created successfully' })
  async createComplianceDocument(
    @Body() createComplianceDocumentDto: CreateComplianceDocumentDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.createComplianceDocument(createComplianceDocumentDto, tenantId);
  }

  @Get('documents/:customerId')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get compliance documents for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance documents retrieved successfully' })
  async getComplianceDocuments(
    @Param('customerId') customerId: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getComplianceDocuments(customerId, tenantId);
  }

  @Get('documents/single/:id')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get compliance document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance document retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Compliance document not found' })
  async getComplianceDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getComplianceDocument(id, tenantId);
  }

  @Post('documents/:id/verify')
  @Roles(Permission.BANKING_COMPLIANCE_WRITE)
  @ApiOperation({ summary: 'Verify compliance document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance document verified successfully' })
  async verifyComplianceDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string,
    @GetUser() user: any
  ) {
    return this.complianceService.verifyComplianceDocument(id, user.id, tenantId);
  }

  // ============================================================================
  // REGULATORY REPORTS
  // ============================================================================

  @Post('reports')
  @Roles(Permission.BANKING_COMPLIANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Create regulatory report' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Regulatory report created successfully' })
  async createRegulatoryReport(
    @Body() createRegulatoryReportDto: CreateRegulatoryReportDto,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.createRegulatoryReport(createRegulatoryReportDto, tenantId);
  }

  @Get('reports')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get regulatory reports' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Filter by report type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'reportPeriod', required: false, description: 'Filter by report period' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regulatory reports retrieved successfully' })
  async getRegulatoryReports(
    @GetTenant() tenantId: string,
    @Query('reportType') reportType?: string,
    @Query('status') status?: string,
    @Query('reportPeriod') reportPeriod?: string
  ) {
    const filters: any = {};
    if (reportType) filters.reportType = reportType;
    if (status) filters.status = status;
    if (reportPeriod) filters.reportPeriod = reportPeriod;

    return this.complianceService.getRegulatoryReports(tenantId, filters);
  }

  @Get('reports/:id')
  @Roles(Permission.BANKING_COMPLIANCE_READ)
  @ApiOperation({ summary: 'Get regulatory report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regulatory report retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Regulatory report not found' })
  async getRegulatoryReport(
    @Param('id', ParseUUIDPipe) id: string,
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.getRegulatoryReport(id, tenantId);
  }

  @Post('reports/:id/submit')
  @Roles(Permission.BANKING_COMPLIANCE_REPORTS_GENERATE)
  @ApiOperation({ summary: 'Submit regulatory report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Regulatory report submitted successfully' })
  async submitRegulatoryReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() submissionData: { submittedTo: string },
    @GetTenant() tenantId: string
  ) {
    return this.complianceService.submitRegulatoryReport(id, submissionData.submittedTo, tenantId);
  }
}