// path: backend/src/modules/remote-desktop/dto/connect-session.dto.ts
// purpose: DTO for connecting to remote desktop session
// dependencies: class-validator, class-transformer, swagger

import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectSessionDto {
  @ApiProperty({ description: 'Connection method', enum: ['web', 'native', 'mobile'], required: false })
  @IsOptional()
  @IsString()
  connectionMethod?: 'web' | 'native' | 'mobile';

  @ApiProperty({ description: 'Client information', required: false })
  @IsOptional()
  @IsObject()
  clientInfo?: {
    platform: string;
    version: string;
    capabilities: string[];
  };

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'Client IP address', required: false })
  @IsOptional()
  @IsString()
  clientIp?: string;

  @ApiProperty({ description: 'Additional connection parameters', required: false })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}