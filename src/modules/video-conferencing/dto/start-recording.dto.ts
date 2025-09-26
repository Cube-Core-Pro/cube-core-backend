// path: backend/src/modules/video-conferencing/dto/start-recording.dto.ts
// purpose: DTO for starting meeting recordings
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class StartRecordingDto {
  @IsOptional()
  @IsString()
  recordingName?: string;

  @IsOptional()
  @IsBoolean()
  recordAudio?: boolean;

  @IsOptional()
  @IsBoolean()
  recordVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  recordScreenShare?: boolean;

  @IsOptional()
  @IsString()
  quality?: 'low' | 'medium' | 'high' | 'hd';
}