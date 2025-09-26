// path: backend/src/modules/video-conferencing/dto/update-meeting.dto.ts
// purpose: DTO for updating video meetings
// dependencies: class-validator, class-transformer

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class UpdateMeetingSettingsDto {
  @IsOptional()
  @IsBoolean()
  allowParticipantVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  allowParticipantAudio?: boolean;

  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean;

  @IsOptional()
  @IsBoolean()
  allowChat?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRecording?: boolean;

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
}

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledAt?: Date;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480) // Max 8 hours
  duration?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMeetingSettingsDto)
  settings?: UpdateMeetingSettingsDto;
}
