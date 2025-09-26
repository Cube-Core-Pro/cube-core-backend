// path: backend/src/modules/video-conferencing/dto/create-breakout-room.dto.ts
// purpose: DTO for creating breakout rooms
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class CreateBreakoutRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}