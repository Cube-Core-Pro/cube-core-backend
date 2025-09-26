// path: backend/src/modules/video/video.controller.ts
// purpose: Video conferencing controller for managing meetings, recordings, and breakout rooms
// dependencies: NestJS, Prisma, authentication guards, validation

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
  
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';import { VideoService } from './video.service';
// TODO: Implement video services
// import { MeetingService } from './services/meeting.service';
// import { RecordingService } from './services/recording.service';
// import { BreakoutRoomService } from './services/breakout-room.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  JoinMeetingDto,
  MeetingQueryDto,
  CreateBreakoutRoomDto,
  
  
} from './dto/video.dto';

@ApiTags('Video Conferencing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('video')
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    // TODO: Inject other services when implemented
  ) {}

  // Meeting Management
  @Get('meetings')
  @ApiOperation({ summary: 'Get all meetings' })
  @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
  async getMeetings(@Request() req, @Query() query: MeetingQueryDto) {
    return this.videoService.getMeetings(req.user.tenantId, req.user.id, query);
  }

  @Get('meetings/:id')
  @ApiOperation({ summary: 'Get meeting by ID' })
  @ApiResponse({ status: 200, description: 'Meeting retrieved successfully' })
  async getMeeting(@Request() req, @Param('id') id: string) {
    return this.videoService.getMeeting(req.user.tenantId, id);
  }

  @Post('meetings')
  @ApiOperation({ summary: 'Create new meeting' })
  @ApiResponse({ status: 201, description: 'Meeting created successfully' })
  async createMeeting(@Request() req, @Body() createMeetingDto: CreateMeetingDto) {
    return this.videoService.createMeeting(req.user.tenantId, req.user.id, createMeetingDto);
  }

  @Put('meetings/:id')
  @ApiOperation({ summary: 'Update meeting' })
  @ApiResponse({ status: 200, description: 'Meeting updated successfully' })
  async updateMeeting(
    @Request() req,
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
  ) {
    return this.videoService.updateMeeting(req.user.tenantId, req.user.id, id, updateMeetingDto);
  }

  @Delete('meetings/:id')
  @ApiOperation({ summary: 'Delete meeting' })
  @ApiResponse({ status: 200, description: 'Meeting deleted successfully' })
  async deleteMeeting(@Request() req, @Param('id') id: string) {
    return this.videoService.deleteMeeting(req.user.tenantId, req.user.id, id);
  }

  // Meeting Actions
  @Post('meetings/:id/join')
  @ApiOperation({ summary: 'Join meeting' })
  @ApiResponse({ status: 200, description: 'Joined meeting successfully' })
  async joinMeeting(
    @Request() req,
    @Param('id') id: string,
    @Body() joinMeetingDto: JoinMeetingDto,
  ) {
    return this.videoService.joinMeeting(req.user.tenantId, req.user.id, id, joinMeetingDto);
  }

  @Post('meetings/:id/leave')
  @ApiOperation({ summary: 'Leave meeting' })
  @ApiResponse({ status: 200, description: 'Left meeting successfully' })
  async leaveMeeting(@Request() req, @Param('id') id: string) {
    return this.videoService.leaveMeeting(req.user.tenantId, req.user.id, id);
  }

  @Post('meetings/:id/start-recording')
  @ApiOperation({ summary: 'Start meeting recording' })
  @ApiResponse({ status: 200, description: 'Recording started successfully' })
  async startRecording(@Request() req, @Param('id') id: string) {
    return this.videoService.startRecording(req.user.tenantId, req.user.id, id);
  }

  @Post('meetings/:id/stop-recording')
  @ApiOperation({ summary: 'Stop meeting recording' })
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  async stopRecording(@Request() req, @Param('id') id: string) {
    return this.videoService.stopRecording(req.user.tenantId, req.user.id, id);
  }

  // Breakout Rooms
  @Post('meetings/:id/breakout-rooms')
  @ApiOperation({ summary: 'Create breakout room' })
  @ApiResponse({ status: 201, description: 'Breakout room created successfully' })
  async createBreakoutRoom(
    @Request() req,
    @Param('id') meetingId: string,
    @Body() createBreakoutRoomDto: CreateBreakoutRoomDto,
  ) {
    return this.videoService.createBreakoutRoom(req.user.tenantId, req.user.id, meetingId, createBreakoutRoomDto);
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get video conferencing analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Request() req, @Query() _query: any) {
    return this.videoService.getAnalytics(req.user.tenantId, req.user.id);
  }
}