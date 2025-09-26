// path: backend/src/video-conferencing/dto/create-meeting.dto.ts
// purpose: DTO for creating video conference meetings
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MeetingType {
  INSTANT = 'INSTANT',
  SCHEDULED = 'SCHEDULED',
  RECURRING = 'RECURRING',
  WEBINAR = 'WEBINAR'
}

export enum MeetingStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED'
}

export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export class MeetingParticipantDto {
  @ApiProperty({ description: 'Participant email' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'Participant name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Whether participant is a moderator', default: false })
  @IsOptional()
  @IsBoolean()
  isModerator?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether participant is required', default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = true;
}

export class MeetingRecurrenceDto {
  @ApiProperty({ description: 'Recurrence type', enum: RecurrenceType })
  @IsEnum(RecurrenceType)
  type: RecurrenceType;

  @ApiProperty({ description: 'Recurrence interval (e.g., every 2 weeks)' })
  @IsNumber()
  @Min(1)
  @Max(30)
  interval: number;

  @ApiPropertyOptional({ description: 'End date for recurrence' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of occurrences' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  occurrences?: number;
}

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Meeting type', enum: MeetingType })
  @IsEnum(MeetingType)
  type: MeetingType;

  @ApiPropertyOptional({ description: 'Meeting start time (ISO string)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Meeting duration in minutes', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440) // 24 hours
  duration?: number = 60;

  @ApiPropertyOptional({ description: 'Meeting timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiPropertyOptional({ description: 'Meeting participants', type: [MeetingParticipantDto] })
  @IsOptional()
  @IsArray()
  participants?: MeetingParticipantDto[];

  @ApiPropertyOptional({ description: 'Meeting recurrence settings' })
  @IsOptional()
  recurrence?: MeetingRecurrenceDto;

  @ApiPropertyOptional({ description: 'Whether meeting requires password', default: true })
  @IsOptional()
  @IsBoolean()
  requirePassword?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to enable waiting room', default: true })
  @IsOptional()
  @IsBoolean()
  enableWaitingRoom?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to allow screen sharing', default: true })
  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to allow recording', default: false })
  @IsOptional()
  @IsBoolean()
  allowRecording?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether to enable chat', default: true })
  @IsOptional()
  @IsBoolean()
  enableChat?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to enable breakout rooms', default: false })
  @IsOptional()
  @IsBoolean()
  enableBreakoutRooms?: boolean = false;

  @ApiPropertyOptional({ description: 'Maximum number of participants', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(1000)
  maxParticipants?: number = 100;

  @ApiPropertyOptional({ description: 'Whether to auto-record meeting', default: false })
  @IsOptional()
  @IsBoolean()
  autoRecord?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether to mute participants on join', default: true })
  @IsOptional()
  @IsBoolean()
  muteOnJoin?: boolean = true;

  @ApiPropertyOptional({ description: 'Meeting tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Meeting agenda' })
  @IsOptional()
  @IsString()
  agenda?: string;
}