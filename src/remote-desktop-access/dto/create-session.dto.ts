// path: backend/src/remote-desktop-access/dto/create-session.dto.ts
// purpose: DTO for creating remote desktop sessions
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SessionType {
  RDP = 'RDP',
  VNC = 'VNC',
  SSH = 'SSH',
  VDI = 'VDI'
}

export enum SessionStatus {
  PENDING = 'PENDING',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  DISCONNECTED = 'DISCONNECTED',
  TERMINATED = 'TERMINATED',
  ERROR = 'ERROR'
}

export enum OperatingSystem {
  WINDOWS_10 = 'WINDOWS_10',
  WINDOWS_11 = 'WINDOWS_11',
  WINDOWS_SERVER_2019 = 'WINDOWS_SERVER_2019',
  WINDOWS_SERVER_2022 = 'WINDOWS_SERVER_2022',
  UBUNTU_20_04 = 'UBUNTU_20_04',
  UBUNTU_22_04 = 'UBUNTU_22_04',
  CENTOS_8 = 'CENTOS_8',
  DEBIAN_11 = 'DEBIAN_11'
}

export enum InstanceSize {
  SMALL = 'SMALL',      // 2 vCPU, 4GB RAM
  MEDIUM = 'MEDIUM',    // 4 vCPU, 8GB RAM
  LARGE = 'LARGE',      // 8 vCPU, 16GB RAM
  XLARGE = 'XLARGE'     // 16 vCPU, 32GB RAM
}

export class CreateSessionDto {
  @ApiProperty({ description: 'Session name/title' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Session type', enum: SessionType })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiPropertyOptional({ description: 'Target host/server IP or hostname' })
  @IsOptional()
  @IsString()
  targetHost?: string;

  @ApiPropertyOptional({ description: 'Target port', default: 3389 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  targetPort?: number = 3389;

  @ApiPropertyOptional({ description: 'Username for remote connection' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Password for remote connection' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Operating system for VDI', enum: OperatingSystem })
  @IsOptional()
  @IsEnum(OperatingSystem)
  operatingSystem?: OperatingSystem;

  @ApiPropertyOptional({ description: 'Instance size for VDI', enum: InstanceSize })
  @IsOptional()
  @IsEnum(InstanceSize)
  instanceSize?: InstanceSize;

  @ApiPropertyOptional({ description: 'Session duration in minutes', default: 480 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440) // 24 hours
  duration?: number = 480; // 8 hours

  @ApiPropertyOptional({ description: 'Whether to enable clipboard sharing', default: true })
  @IsOptional()
  @IsBoolean()
  enableClipboard?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to enable file transfer', default: true })
  @IsOptional()
  @IsBoolean()
  enableFileTransfer?: boolean = true;

  @ApiPropertyOptional({ description: 'Whether to enable audio', default: false })
  @IsOptional()
  @IsBoolean()
  enableAudio?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether to enable printing', default: false })
  @IsOptional()
  @IsBoolean()
  enablePrinting?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether to enable multi-monitor support', default: false })
  @IsOptional()
  @IsBoolean()
  enableMultiMonitor?: boolean = false;

  @ApiPropertyOptional({ description: 'Screen resolution width', default: 1920 })
  @IsOptional()
  @IsNumber()
  @Min(800)
  @Max(3840)
  screenWidth?: number = 1920;

  @ApiPropertyOptional({ description: 'Screen resolution height', default: 1080 })
  @IsOptional()
  @IsNumber()
  @Min(600)
  @Max(2160)
  screenHeight?: number = 1080;

  @ApiPropertyOptional({ description: 'Color depth in bits', default: 32 })
  @IsOptional()
  @IsNumber()
  colorDepth?: number = 32;

  @ApiPropertyOptional({ description: 'Whether to record session', default: false })
  @IsOptional()
  @IsBoolean()
  recordSession?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether session is persistent (VDI)', default: false })
  @IsOptional()
  @IsBoolean()
  isPersistent?: boolean = false;

  @ApiPropertyOptional({ description: 'Allowed user IDs for shared access', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUsers?: string[];

  @ApiPropertyOptional({ description: 'Session tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom applications to install (VDI)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

  @ApiPropertyOptional({ description: 'Environment variables for session' })
  @IsOptional()
  environmentVariables?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Security settings' })
  @IsOptional()
  securitySettings?: {
    requireMFA?: boolean;
    allowedIPs?: string[];
    sessionTimeout?: number;
    idleTimeout?: number;
  };
}