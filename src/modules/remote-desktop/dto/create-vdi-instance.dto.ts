// path: backend/src/modules/remote-desktop/dto/create-vdi-instance.dto.ts
// purpose: DTO for creating VDI instance
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsObject, IsBoolean,  IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVdiInstanceDto {
  @ApiProperty({ description: 'Instance name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Operating system type', enum: ['windows', 'linux', 'macos'] })
  @IsEnum(['windows', 'linux', 'macos'])
  type: 'windows' | 'linux' | 'macos';

  @ApiProperty({ description: 'Template to use for instance' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Resource allocation' })
  @IsObject()
  resources: {
    cpu: number;
    memory: number; // MB
    storage: number; // GB
    gpu?: boolean;
  };

  @ApiProperty({ description: 'Enable VPN for instance', required: false })
  @IsOptional()
  @IsBoolean()
  vpnEnabled?: boolean;

  @ApiProperty({ description: 'Network configuration', required: false })
  @IsOptional()
  @IsObject()
  network?: {
    subnet?: string;
    staticIp?: string;
    dnsServers?: string[];
  };

  @ApiProperty({ description: 'Instance metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}