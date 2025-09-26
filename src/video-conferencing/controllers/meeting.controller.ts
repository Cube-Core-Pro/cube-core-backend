// path: backend/src/video-conferencing/controllers/meeting.controller.ts
// purpose: Controller for video conference meeting management
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
import { VideoConferencingService } from '../../modules/video-conferencing/video-conferencing.service';
import { 
  CreateMeetingDto, 
  UpdateMeetingDto, 
  JoinMeetingDto, 
  CreateBreakoutRoomDto, 
  StartRecordingDto 
} from '../../modules/video-conferencing/dto';

enum MeetingType {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
  WEBINAR = 'webinar'
}

enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

@ApiTags('Video Conferencing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('video/meetings')
export class MeetingController {
  constructor(private readonly videoConferencingService: VideoConferencingService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Create a new meeting',
    description: 'Create a new video conference meeting'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Meeting created successfully' 
  })
  async create(
    @Body() createMeetingDto: CreateMeetingDto,
    @Request() req: any
  ) {
    return this.videoConferencingService.createMeeting(
      req.user.id,
      req.user.tenantId,
      createMeetingDto
    );
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get all meetings',
    description: 'Retrieve all meetings for the user'
  })
  @ApiQuery({ name: 'status', required: false, enum: MeetingStatus })
  @ApiQuery({ name: 'type', required: false, enum: MeetingType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('status') status?: MeetingStatus,
    @Query('type') type?: MeetingType,
    @Query('limit') limit?: number,
    @Query('page') page?: number
  ) {
    const query = { status, type, limit, page };
    return this.videoConferencingService.getMeetings(
      req.user.id,
      req.user.tenantId,
      query
    );
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get meeting by ID' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.videoConferencingService.getMeeting(
      req.user.id,
      req.user.tenantId,
      id
    );
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Update meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async update(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Request() req: any
  ) {
    return this.videoConferencingService.updateMeeting(
      req.user.id,
      req.user.tenantId,
      id,
      updateMeetingDto
    );
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Delete meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async delete(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.deleteMeeting(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Meeting deleted successfully' };
  }

  @Post(':id/join')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Join meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async join(
    @Param('id') id: string,
    @Body() joinMeetingDto: JoinMeetingDto,
    @Request() req: any
  ) {
    return this.videoConferencingService.joinMeeting(
      req.user.id,
      req.user.tenantId,
      id,
      joinMeetingDto
    );
  }

  @Post(':id/leave')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Leave meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async leave(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.leaveMeeting(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Left meeting successfully' };
  }

  @Post(':id/recording/start')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Start recording' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async startRecording(
    @Param('id') id: string,
    @Body() startRecordingDto: StartRecordingDto,
    @Request() req: any
  ) {
    return this.videoConferencingService.startRecording(
      req.user.id,
      req.user.tenantId,
      id,
      startRecordingDto
    );
  }

  @Post(':id/recording/stop')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Stop recording' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async stopRecording(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.videoConferencingService.stopRecording(
      req.user.id,
      req.user.tenantId,
      id
    );
  }

  @Post(':id/breakout-rooms')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Create breakout room' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async createBreakoutRoom(
    @Param('id') id: string,
    @Body() createBreakoutRoomDto: CreateBreakoutRoomDto,
    @Request() req: any
  ) {
    return this.videoConferencingService.createBreakoutRoom(
      req.user.id,
      req.user.tenantId,
      id,
      createBreakoutRoomDto
    );
  }

  @Get(':id/breakout-rooms')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get breakout rooms' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async getBreakoutRooms(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.videoConferencingService.getBreakoutRooms(
      req.user.id,
      req.user.tenantId,
      id
    );
  }

  @Delete(':id/breakout-rooms/:roomId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Close breakout room' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiParam({ name: 'roomId', description: 'Breakout room ID' })
  async closeBreakoutRoom(
    @Param('id') id: string,
    @Param('roomId') roomId: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.closeBreakoutRoom(
      req.user.id,
      req.user.tenantId,
      id,
      roomId
    );
    return { message: 'Breakout room closed successfully' };
  }

  @Get(':id/participants')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get meeting participants' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async getParticipants(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.videoConferencingService.getMeetingParticipants(
      req.user.id,
      req.user.tenantId,
      id
    );
  }

  @Post(':id/audio/toggle')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Toggle audio' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async toggleAudio(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.toggleAudio(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Audio toggled successfully' };
  }

  @Post(':id/video/toggle')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Toggle video' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async toggleVideo(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.toggleVideo(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Video toggled successfully' };
  }

  @Post(':id/screen-share/start')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Start screen sharing' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async startScreenShare(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.startScreenShare(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Screen sharing started successfully' };
  }

  @Post(':id/screen-share/stop')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Stop screen sharing' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  async stopScreenShare(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.videoConferencingService.stopScreenShare(
      req.user.id,
      req.user.tenantId,
      id
    );
    return { message: 'Screen sharing stopped successfully' };
  }

  @Get('analytics')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get meeting analytics' })
  async getAnalytics(@Request() req: any) {
    return this.videoConferencingService.getAnalytics(
      req.user.id,
      req.user.tenantId
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Get service health' })
  async getHealth() {
    return this.videoConferencingService.getHealth();
  }
}
