// path: backend/src/modules/video/dto/video.dto.ts
// purpose: Data Transfer Objects for Video Conferencing operations
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, IsObject, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MeetingType {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
  RECURRING = 'RECURRING',
  WEBINAR = 'WEBINAR',
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum ParticipantRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  PRESENTER = 'PRESENTER',
  ATTENDEE = 'ATTENDEE',
}

export enum RecordingStatus {
  NOT_STARTED = 'NOT_STARTED',
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MeetingType, description: 'Meeting type' })
  @IsEnum(MeetingType)
  type: MeetingType;

  @ApiPropertyOptional({ description: 'Meeting password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Maximum participants' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Meeting duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Enable waiting room' })
  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @ApiPropertyOptional({ description: 'Enable recording' })
  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable chat' })
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable screen sharing' })
  @IsOptional()
  @IsBoolean()
  screenSharingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Meeting settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class ScheduleMeetingDto extends CreateMeetingDto {
  @ApiProperty({ description: 'Scheduled start time' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Participant emails to invite' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inviteEmails?: string[];

  @ApiPropertyOptional({ description: 'Send calendar invite' })
  @IsOptional()
  @IsBoolean()
  sendCalendarInvite?: boolean;

  @ApiPropertyOptional({ description: 'Recurring meeting settings' })
  @IsOptional()
  @IsObject()
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    endDate?: string;
    occurrences?: number;
  };
}

export class UpdateMeetingDto {
  @ApiPropertyOptional({ description: 'Meeting title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meeting password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Maximum participants' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Meeting duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Meeting settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class JoinMeetingDto {
  @ApiPropertyOptional({ description: 'Meeting password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Join with audio muted' })
  @IsOptional()
  @IsBoolean()
  audioMuted?: boolean;

  @ApiPropertyOptional({ description: 'Join with video disabled' })
  @IsOptional()
  @IsBoolean()
  videoDisabled?: boolean;

  @ApiPropertyOptional({ description: 'Device preferences' })
  @IsOptional()
  @IsObject()
  devicePreferences?: {
    audioDeviceId?: string;
    videoDeviceId?: string;
    speakerDeviceId?: string;
  };
}

export class MeetingQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MeetingType, description: 'Meeting type filter' })
  @IsOptional()
  @IsEnum(MeetingType)
  type?: MeetingType;

  @ApiPropertyOptional({ enum: MeetingStatus, description: 'Meeting status filter' })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateBreakoutRoomDto {
  @ApiProperty({ description: 'Breakout room name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Maximum participants' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Auto-assign participants' })
  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @ApiPropertyOptional({ description: 'Room settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}

export class UpdateMeetingSettingsDto {
  @ApiPropertyOptional({ description: 'Enable waiting room' })
  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @ApiPropertyOptional({ description: 'Enable recording' })
  @IsOptional()
  @IsBoolean()
  recordingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable chat' })
  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable screen sharing' })
  @IsOptional()
  @IsBoolean()
  screenSharingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Allow participants to unmute themselves' })
  @IsOptional()
  @IsBoolean()
  allowUnmute?: boolean;

  @ApiPropertyOptional({ description: 'Allow participants to start video' })
  @IsOptional()
  @IsBoolean()
  allowVideo?: boolean;

  @ApiPropertyOptional({ description: 'Enable breakout rooms' })
  @IsOptional()
  @IsBoolean()
  breakoutRoomsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable polls' })
  @IsOptional()
  @IsBoolean()
  pollsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable whiteboard' })
  @IsOptional()
  @IsBoolean()
  whiteboardEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable file sharing' })
  @IsOptional()
  @IsBoolean()
  fileSharingEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Meeting background settings' })
  @IsOptional()
  @IsObject()
  backgroundSettings?: {
    allowVirtualBackgrounds: boolean;
    allowBlur: boolean;
    customBackgrounds: string[];
  };

  @ApiPropertyOptional({ description: 'Audio settings' })
  @IsOptional()
  @IsObject()
  audioSettings?: {
    enableNoiseCancellation: boolean;
    enableEchoCancellation: boolean;
    audioQuality: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  @ApiPropertyOptional({ description: 'Video settings' })
  @IsOptional()
  @IsObject()
  videoSettings?: {
    defaultResolution: '480p' | '720p' | '1080p';
    enableHD: boolean;
    enableSpotlight: boolean;
  };
}

export class ChatMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Message type' })
  @IsOptional()
  @IsEnum(['TEXT', 'FILE', 'EMOJI', 'POLL'])
  type?: 'TEXT' | 'FILE' | 'EMOJI' | 'POLL';

  @ApiPropertyOptional({ description: 'Recipient user ID (for private messages)' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Message metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class PollDto {
  @ApiProperty({ description: 'Poll question' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Poll options' })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiPropertyOptional({ description: 'Allow multiple selections' })
  @IsOptional()
  @IsBoolean()
  multipleChoice?: boolean;

  @ApiPropertyOptional({ description: 'Anonymous poll' })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Poll duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  duration?: number;
}

export class WhiteboardActionDto {
  @ApiProperty({ description: 'Action type' })
  @IsEnum(['DRAW', 'ERASE', 'TEXT', 'SHAPE', 'CLEAR'])
  action: 'DRAW' | 'ERASE' | 'TEXT' | 'SHAPE' | 'CLEAR';

  @ApiProperty({ description: 'Action data' })
  @IsObject()
  data: any;

  @ApiPropertyOptional({ description: 'Action timestamp' })
  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

export class RecordingSettingsDto {
  @ApiPropertyOptional({ description: 'Record audio' })
  @IsOptional()
  @IsBoolean()
  recordAudio?: boolean;

  @ApiPropertyOptional({ description: 'Record video' })
  @IsOptional()
  @IsBoolean()
  recordVideo?: boolean;

  @ApiPropertyOptional({ description: 'Record screen sharing' })
  @IsOptional()
  @IsBoolean()
  recordScreenShare?: boolean;

  @ApiPropertyOptional({ description: 'Record chat' })
  @IsOptional()
  @IsBoolean()
  recordChat?: boolean;

  @ApiPropertyOptional({ description: 'Recording quality' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  quality?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({ description: 'Auto-start recording' })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @ApiPropertyOptional({ description: 'Auto-stop recording when meeting ends' })
  @IsOptional()
  @IsBoolean()
  autoStop?: boolean;
}