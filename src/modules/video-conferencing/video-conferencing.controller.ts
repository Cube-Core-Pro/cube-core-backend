// path: backend/src/modules/video-conferencing/video-conferencing.controller.ts
// purpose: Advanced Video Conferencing Controller with Fortune500 enterprise features
// dependencies: @nestjs/common, video-conferencing.service, dto classes

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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VideoConferencingService } from './video-conferencing.service';
import {
  CreateMeetingDto,
  JoinMeetingDto,
  UpdateMeetingDto,
  CreateBreakoutRoomDto,
  StartRecordingDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '@prisma/client';

@Controller('video-conferencing')
@UseGuards(JwtAuthGuard)
export class VideoConferencingController {
  constructor(private readonly videoConferencingService: VideoConferencingService) {}

  // Meeting Management
  @Post('meetings')
  @HttpCode(HttpStatus.CREATED)
  async createMeeting(@Body() dto: CreateMeetingDto, @GetUser() user: User) {
    return this.videoConferencingService.createMeeting(user.id, user.tenantId, dto);
  }

  @Get('meetings')
  async getMeetings(@GetUser() user: User, @Query('limit') limit?: number) {
    return this.videoConferencingService.getMeetings(user.id, user.tenantId, limit);
  }

  @Get('meetings/:id')
  async getMeeting(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.getMeeting(user.id, user.tenantId, id);
  }

  @Put('meetings/:id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.updateMeeting(user.id, user.tenantId, id, dto);
  }

  @Delete('meetings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMeeting(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.deleteMeeting(user.id, user.tenantId, id);
  }

  // Meeting Participation
  @Post('meetings/:id/join')
  async joinMeeting(
    @Param('id') id: string,
    @Body() dto: JoinMeetingDto,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.joinMeeting(user.id, user.tenantId, id, dto);
  }

  @Post('meetings/:id/leave')
  async leaveMeeting(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.leaveMeeting(user.id, user.tenantId, id);
  }

  @Get('meetings/:id/participants')
  async getMeetingParticipants(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.getMeetingParticipants(user.id, user.tenantId, id);
  }

  // Breakout Rooms
  @Post('meetings/:id/breakout-rooms')
  async createBreakoutRoom(
    @Param('id') meetingId: string,
    @Body() dto: CreateBreakoutRoomDto,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.createBreakoutRoom(user.id, user.tenantId, meetingId, dto);
  }

  @Get('meetings/:id/breakout-rooms')
  async getBreakoutRooms(@Param('id') meetingId: string, @GetUser() user: User) {
    return this.videoConferencingService.getBreakoutRooms(user.id, user.tenantId, meetingId);
  }

  @Post('meetings/:meetingId/breakout-rooms/:roomId/join')
  async joinBreakoutRoom(
    @Param('meetingId') meetingId: string,
    @Param('roomId') roomId: string,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.joinBreakoutRoom(user.id, user.tenantId, meetingId, roomId);
  }

  @Post('meetings/:meetingId/breakout-rooms/:roomId/leave')
  async leaveBreakoutRoom(
    @Param('meetingId') meetingId: string,
    @Param('roomId') roomId: string,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.leaveBreakoutRoom(user.id, user.tenantId, meetingId, roomId);
  }

  // Recording
  @Post('meetings/:id/start-recording')
  async startRecording(
    @Param('id') id: string,
    @Body() dto: StartRecordingDto,
    @GetUser() user: User,
  ) {
    return this.videoConferencingService.startRecording(user.id, user.tenantId, id, dto);
  }

  @Post('meetings/:id/stop-recording')
  async stopRecording(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.stopRecording(user.id, user.tenantId, id);
  }

  @Get('meetings/:id/recording')
  async getRecording(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.getRecording(user.id, user.tenantId, id);
  }

  // Screen Sharing
  @Post('meetings/:id/start-screen-share')
  async startScreenShare(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.startScreenShare(user.id, user.tenantId, id);
  }

  @Post('meetings/:id/stop-screen-share')
  async stopScreenShare(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.stopScreenShare(user.id, user.tenantId, id);
  }

  // Meeting Controls
  @Post('meetings/:id/mute-all')
  async muteAllParticipants(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.muteAllParticipants(user.id, user.tenantId, id);
  }

  @Post('meetings/:id/unmute-all')
  async unmuteAllParticipants(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.unmuteAllParticipants(user.id, user.tenantId, id);
  }

  @Post('meetings/:id/lock')
  async lockMeeting(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.lockMeeting(user.id, user.tenantId, id);
  }

  @Post('meetings/:id/unlock')
  async unlockMeeting(@Param('id') id: string, @GetUser() user: User) {
    return this.videoConferencingService.unlockMeeting(user.id, user.tenantId, id);
  }
}