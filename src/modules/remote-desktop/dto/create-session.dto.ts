// path: backend/src/modules/remote-desktop/dto/create-session.dto.ts
// purpose: DTO for creating remote desktop sessions
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsArray, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SessionType {
  RDP = 'RDP',
  VNC = 'VNC',
  SSH = 'SSH',
  BROWSER = 'BROWSER'
}

export class SessionResourcesDto {
  @ApiProperty({ description: 'CPU cores', example: 2 })
  cpu: number;

  @ApiProperty({ description: 'Memory in MB', example: 4096 })
  memory: number;

  @ApiProperty({ description: 'Storage in GB', example: 50 })
  storage: number;
}

export class SessionSettingsDto {
  @ApiProperty({ description: 'Screen resolution', required: false, default: '1920x1080' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiProperty({ description: 'Color depth', required: false, default: 32 })
  @IsOptional()
  colorDepth?: number;

  @ApiProperty({ description: 'Audio enabled', required: false, default: true })
  @IsOptional()
  audioEnabled?: boolean;

  @ApiProperty({ description: 'Clipboard enabled', required: false, default: true })
  @IsOptional()
  clipboardEnabled?: boolean;

  @ApiProperty({ description: 'File transfer enabled', required: false, default: false })
  @IsOptional()
  fileTransferEnabled?: boolean;

  @ApiProperty({ description: 'Multi-monitor enabled', required: false, default: false })
  @IsOptional()
  multiMonitorEnabled?: boolean;

  @ApiProperty({ description: 'Recording enabled', required: false, default: false })
  @IsOptional()
  recordingEnabled?: boolean;

  @ApiProperty({ description: 'Max duration in minutes', required: false, default: 480 })
  @IsOptional()
  maxDuration?: number;

  @ApiProperty({ description: 'Auto cleanup', required: false, default: true })
  @IsOptional()
  autoCleanup?: boolean;
}

export class SecuritySettingsDto {
  @ApiProperty({ description: 'File access restrictions', required: false })
  @IsOptional()
  @IsArray()
  fileAccessRestrictions?: string[];

  @ApiProperty({ description: 'Application whitelist', required: false })
  @IsOptional()
  @IsArray()
  applicationWhitelist?: string[];
}

export class CreateSessionDto {
  @ApiProperty({ description: 'Session name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Instance name', required: false })
  @IsOptional()
  @IsString()
  instanceName?: string;

  @ApiProperty({ description: 'Operating system type', required: false })
  @IsOptional()
  @IsString()
  osType?: string;

  @ApiProperty({ description: 'Template to use', required: false })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiProperty({ description: 'Session description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Session type',
    enum: SessionType,
    default: SessionType.RDP
  })
  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;

  @ApiProperty({ 
    description: 'Connection type', 
    required: false,
    default: 'rdp',
    enum: ['rdp', 'vnc', 'ssh', 'web']
  })
  @IsOptional()
  @IsString()
  type?: 'rdp' | 'vnc' | 'ssh' | 'web';

  @ApiProperty({ description: 'VDI instance ID', required: false })
  @IsOptional()
  @IsString()
  vdiInstanceId?: string;

  @ApiProperty({ description: 'Resource allocation', required: false })
  @IsOptional()
  @IsObject()
  resources?: SessionResourcesDto;

  @ApiProperty({ description: 'Session settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: SessionSettingsDto;

  @ApiProperty({ description: 'Allowed user IDs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedUsers?: string[];

  @ApiProperty({ description: 'Session tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Pre-installed applications', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

  @ApiProperty({ description: 'Environment variables', required: false })
  @IsOptional()
  @IsObject()
  environmentVariables?: Record<string, string>;

  @ApiProperty({ description: 'Security settings', required: false })
  @IsOptional()
  @IsObject()
  securitySettings?: SecuritySettingsDto;

  @ApiProperty({ description: 'File transfer enabled', required: false })
  @IsOptional()
  fileTransferEnabled?: boolean;

  @ApiProperty({ description: 'Recording enabled', required: false })
  @IsOptional()
  recordingEnabled?: boolean;

  @ApiProperty({ description: 'VPN required', required: false })
  @IsOptional()
  vpnRequired?: boolean;

  @ApiProperty({ description: 'MFA required', required: false })
  @IsOptional()
  mfaRequired?: boolean;

  @ApiProperty({ description: 'IP whitelist', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @ApiProperty({ description: 'Session timeout in seconds', required: false })
  @IsOptional()
  sessionTimeout?: number;
}