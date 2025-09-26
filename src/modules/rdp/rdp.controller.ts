// path: backend/src/modules/rdp/rdp.controller.ts
// purpose: Remote Desktop Protocol (RDP) controller for managing remote sessions with Fortune 500-grade standards
// dependencies: NestJS, Swagger, Auth Guards, DTO validation

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
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RdpService } from './rdp.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  ConnectSessionDto,
  CreateVdiDto,
  VdiQueryDto,
  EnableSessionRecordingDto,
  DisableSessionRecordingDto,
  SetSessionWatermarkDto,
  SetSessionPermissionsDto,
  GetOptimalVdiDto,
  ScaleVdiPoolDto,
  GetSessionAnalyticsDto,
  GenerateSessionReportDto,
} from './dto/rdp.dto';

@ApiTags('remote-desktop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rdp')
export class RdpController {
  constructor(private readonly rdpService: RdpService) {}

  // Session Management
  @Get('sessions')
  @ApiOperation({ summary: 'Get all remote sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getSessions(@Request() req, @Query() query: SessionQueryDto) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.getSessions(userId, tenantId, query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async getSession(@Request() req, @Param('id') id: string) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.getSessionById(id, userId, tenantId);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create new remote session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Request() req, @Body() createSessionDto: CreateSessionDto) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.createSession(userId, tenantId, createSessionDto);
  }

  @Put('sessions/:id')
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @Request() req,
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.updateSession(id, userId, tenantId, updateSessionDto);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(@Request() req, @Param('id') id: string) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.deleteSession(id, userId, tenantId);
  }

  // Connection Management
  @Post('sessions/:id/connect')
  @ApiOperation({ summary: 'Connect to remote session' })
  @ApiResponse({ status: 200, description: 'Connected to session successfully' })
  async connectToSession(
    @Request() req,
    @Param('id') id: string,
    @Body() _connectDto: ConnectSessionDto,
  ) {
    const { userId, tenantId } = this.requireContext(req);
    await this.rdpService.updateSessionActivity(id);
    return this.rdpService.getSessionById(id, userId, tenantId);
  }

  @Post('sessions/:id/disconnect')
  @ApiOperation({ summary: 'Disconnect from remote session' })
  @ApiResponse({ status: 200, description: 'Disconnected from session successfully' })
  async disconnectFromSession(@Request() req, @Param('id') id: string) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.disconnectSession(id, userId, tenantId);
  }

  // VDI Management
  @Get('vdi')
  @ApiOperation({ summary: 'Get VDI instances' })
  @ApiResponse({ status: 200, description: 'VDI instances retrieved successfully' })
  async getVdiInstances(@Request() req, @Query() query: VdiQueryDto) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.getVdiInstances(userId, tenantId, query);
  }

  @Post('vdi')
  @ApiOperation({ summary: 'Create VDI instance' })
  @ApiResponse({ status: 201, description: 'VDI instance created successfully' })
  async createVdiInstance(@Request() req, @Body() createVdiDto: CreateVdiDto) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.createVdiInstance(userId, tenantId, createVdiDto);
  }

  // Monitoring and Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get RDP analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Request() req) {
    const { userId, tenantId } = this.requireContext(req);
    return this.rdpService.getAnalytics(userId, tenantId);
  }

  // Advanced endpoints without explicit routes for now (can be exposed later)
  // getSessionPerformanceMetrics, enable/disable recording, watermarks, permissions, scaling, reports

  private requireContext(req: any): { userId: string; tenantId: string } {
    const userId = req?.user?.id ?? req?.user?.userId;
    const tenantId = req?.user?.tenantId ?? req?.user?.tenant?.id ?? req?.headers?.['x-tenant-id'];

    if (!userId || !tenantId) {
      throw new BadRequestException('User or tenant context is missing');
    }

    return { userId: String(userId), tenantId: String(tenantId) };
  }
}