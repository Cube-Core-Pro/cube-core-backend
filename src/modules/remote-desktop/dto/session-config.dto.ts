// path: backend/src/modules/remote-desktop/dto/session-config.dto.ts
// purpose: DTO for session configuration
// dependencies: class-validator, class-transformer, swagger

import { IsOptional, IsObject,    } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SessionConfigDto {
  @ApiProperty({ description: 'Display configuration', required: false })
  @IsOptional()
  @IsObject()
  display?: {
    resolution: string;
    colorDepth: number;
    multiMonitor: boolean;
    scaling: number;
  };

  @ApiProperty({ description: 'Audio configuration', required: false })
  @IsOptional()
  @IsObject()
  audio?: {
    enabled: boolean;
    quality: 'low' | 'medium' | 'high';
    bidirectional: boolean;
  };

  @ApiProperty({ description: 'Input configuration', required: false })
  @IsOptional()
  @IsObject()
  input?: {
    keyboard: boolean;
    mouse: boolean;
    touch: boolean;
    gamepad: boolean;
  };

  @ApiProperty({ description: 'File transfer configuration', required: false })
  @IsOptional()
  @IsObject()
  fileTransfer?: {
    enabled: boolean;
    uploadEnabled: boolean;
    downloadEnabled: boolean;
    maxFileSize: number; // MB
    allowedExtensions: string[];
  };

  @ApiProperty({ description: 'Clipboard configuration', required: false })
  @IsOptional()
  @IsObject()
  clipboard?: {
    enabled: boolean;
    textEnabled: boolean;
    imageEnabled: boolean;
    fileEnabled: boolean;
  };

  @ApiProperty({ description: 'Recording configuration', required: false })
  @IsOptional()
  @IsObject()
  recording?: {
    enabled: boolean;
    video: boolean;
    audio: boolean;
    quality: 'low' | 'medium' | 'high';
    maxDuration: number; // minutes
  };

  @ApiProperty({ description: 'Performance configuration', required: false })
  @IsOptional()
  @IsObject()
  performance?: {
    compression: 'none' | 'low' | 'medium' | 'high';
    bandwidth: number; // kbps
    frameRate: number; // fps
    adaptiveQuality: boolean;
  };

  @ApiProperty({ description: 'Security configuration', required: false })
  @IsOptional()
  @IsObject()
  security?: {
    encryption: boolean;
    certificateValidation: boolean;
    sessionTimeout: number; // seconds
    idleTimeout: number; // seconds
    maxConcurrentSessions: number;
  };
}