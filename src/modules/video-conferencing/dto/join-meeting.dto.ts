// path: backend/src/modules/video-conferencing/dto/join-meeting.dto.ts
// purpose: DTO for joining video meetings
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class JoinMeetingDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  videoEnabled?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;
}