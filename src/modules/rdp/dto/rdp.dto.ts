// path: backend/src/modules/rdp/dto/rdp.dto.ts
// purpose: Validated DTOs and Enums for RDP module with Swagger metadata

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Length, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SessionType {
  RDP = 'RDP',
  VNC = 'VNC', 
  SSH = 'SSH',
  VDI = 'VDI',
  BROWSER = 'BROWSER',
}

export enum SessionStatus {
  CREATED = 'CREATED',
  STARTING = 'STARTING', 
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED',
}

export enum VdiType {
  WINDOWS = 'WINDOWS',
  LINUX = 'LINUX',
  MACOS = 'MACOS',
  ANDROID = 'ANDROID',
  CUSTOM = 'CUSTOM',
}

export enum ConnectionProtocol {
  RDP = 'RDP',
  VNC = 'VNC',
  SSH = 'SSH',
  SPICE = 'SPICE',
  GUACAMOLE = 'GUACAMOLE',
}

class SessionSettingsDto {
  @ApiPropertyOptional({ example: '1920x1080' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ example: 32 })
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(48)
  colorDepth?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enableAudio?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enableClipboard?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enableFileTransfer?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enablePrinting?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enableRecording?: boolean;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SessionType })
  @IsEnum(SessionType)
  type!: SessionType;

  @ApiProperty({ description: 'Target host or resource identifier' })
  @IsString()
  target!: string;

  @ApiPropertyOptional({ example: 3389 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConnections?: number;

  @ApiPropertyOptional({ type: SessionSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConnections?: number;

  @ApiPropertyOptional({ type: SessionSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class SessionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: SessionType })
  @IsOptional()
  @IsEnum(SessionType)
  type?: SessionType;

  @ApiPropertyOptional({ enum: SessionStatus })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class CreateVdiDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  templateId!: string;

  @ApiProperty({ enum: VdiType })
  @IsEnum(VdiType)
  osType!: VdiType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  cpuCores!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  ramGb!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  storageGb!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class VdiQueryDto extends SessionQueryDto {
  @ApiPropertyOptional({ enum: VdiType })
  @IsOptional()
  @IsEnum(VdiType)
  osType?: VdiType;
}

export class CreateRdpSessionDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ConnectionProtocol })
  @IsEnum(ConnectionProtocol)
  protocol!: ConnectionProtocol;

  @ApiPropertyOptional({ enum: VdiType })
  @IsOptional()
  @IsEnum(VdiType)
  vdiType?: VdiType;

  @ApiProperty({ description: 'Host to connect to' })
  @IsString()
  host!: string;

  @ApiPropertyOptional({ example: 3389 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateRdpSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ example: 3389 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class ConnectSessionDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, any>;
}

// Backward compatibility alias
export class CreateVdiInstanceDto extends CreateVdiDto {}

export class EnableSessionRecordingDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;
}

export class DisableSessionRecordingDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;
}

export class SetSessionWatermarkDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiProperty()
  @IsString()
  watermarkText!: string;
}

export class SetSessionPermissionsDto {
  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiProperty({ type: Object })
  permissions!: {
    allowFileTransfer: boolean;
    allowClipboard: boolean;
    allowPrinting: boolean;
    allowAudio: boolean;
    allowUSBRedirection: boolean;
    allowDriveRedirection: boolean;
  };
}

export class GetOptimalVdiDto {
  @ApiProperty({ type: Object })
  requirements!: {
    cpu: number;
    memory: number;
    storage: number;
    gpu?: boolean;
  };
}

export class ScaleVdiPoolDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  targetCapacity!: number;
}

export class GetSessionAnalyticsDto {
  @ApiProperty({ type: Object })
  timeRange!: {
    startDate: Date;
    endDate: Date;
  };
}

export class GenerateSessionReportDto {
  @ApiProperty({ enum: ['usage', 'performance', 'security', 'cost'] })
  reportType!: 'usage' | 'performance' | 'security' | 'cost';
}