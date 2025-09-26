// path: backend/src/modules/video-conferencing/dto/create-meeting.dto.ts
// purpose: DTO for creating video meetings
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMeetingDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledAt?: Date;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480) // Max 8 hours
  duration?: number;

  @IsOptional()
  @IsBoolean()
  allowRecording?: boolean;

  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean;

  @IsOptional()
  @IsBoolean()
  allowChat?: boolean;

  @IsOptional()
  @IsBoolean()
  allowBreakoutRooms?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(1000)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  requirePassword?: boolean;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  waitingRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  muteOnJoin?: boolean;

  @IsOptional()
  @IsBoolean()
  videoOnJoin?: boolean;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startTime?: Date;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endTime?: Date;

  @IsOptional()
  settings?: any;
}
