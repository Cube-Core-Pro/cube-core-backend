// path: backend/src/remote-desktop-access/controllers/session.controller.ts
// purpose: Controller for remote desktop session management
// dependencies: @nestjs/common, @nestjs/swagger, guards, services

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SessionService } from '../services/session.service';
import { CreateSessionDto, SessionType, SessionStatus } from '../dto/create-session.dto';

@ApiTags('Remote Desktop Access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rdp/sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Create a new remote desktop session',
    description: 'Create a new remote desktop or VDI session'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Session created successfully' 
  })
  async create(
    @Body() createSessionDto: CreateSessionDto,
    @Request() req: any
  ) {
    return this.sessionService.create(
      createSessionDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get all sessions',
    description: 'Retrieve all remote desktop sessions for the user'
  })
  @ApiQuery({ name: 'status', required: false, enum: SessionStatus })
  @ApiQuery({ name: 'type', required: false, enum: SessionType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('status') status?: SessionStatus,
    @Query('type') type?: SessionType,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.sessionService.findAll(
      req.user.tenantId,
      req.user.id,
      status,
      type,
      limit,
      offset
    );
  }

  @Get('active')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Get active sessions',
    description: 'Get all active sessions for tenant (admin only)'
  })
  async getActiveSessions(@Request() req: any) {
    return this.sessionService.getActiveSessions(req.user.tenantId);
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.sessionService.findOne(id, req.user.tenantId, req.user.id);
  }

  @Post(':id/connect')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Connect to session',
    description: 'Get connection details for a session'
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async connect(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.sessionService.connect(id, req.user.tenantId, req.user.id);
  }

  @Post(':id/disconnect')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Disconnect from session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async disconnect(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.sessionService.disconnect(id, req.user.tenantId, req.user.id);
    return { message: 'Disconnected successfully' };
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Terminate session',
    description: 'Terminate and cleanup session resources'
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async terminate(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.sessionService.terminate(id, req.user.tenantId, req.user.id);
    return { message: 'Session terminated successfully' };
  }

  @Patch(':id/extend')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Extend session duration',
    description: 'Extend the session duration'
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async extend(
    @Param('id') id: string,
    @Body() body: { additionalMinutes: number },
    @Request() req: any
  ) {
    await this.sessionService.extendSession(
      id,
      body.additionalMinutes,
      req.user.tenantId,
      req.user.id
    );
    return { message: 'Session extended successfully' };
  }

  @Post(':id/share')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Share session',
    description: 'Share session with other users'
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async share(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any
  ) {
    await this.sessionService.shareSession(
      id,
      body.userIds,
      req.user.tenantId,
      req.user.id
    );
    return { message: 'Session shared successfully' };
  }

  @Get(':id/recording')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get session recording',
    description: 'Get recording URL for a session'
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  async getRecording(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.sessionService.getSessionRecording(
      id,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get('stats')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get session statistics',
    description: 'Get session statistics for the user'
  })
  async getStats(@Request() req: any) {
    return this.sessionService.getStats(req.user.tenantId, req.user.id);
  }
}