// path: backend/src/modules/remote-desktop/dto/update-session.dto.ts
// purpose: DTO for updating remote desktop session settings
// dependencies: class-validator, class-transformer, swagger

import { IsOptional, IsObject,   } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiProperty({ description: 'Session display settings', required: false })
  @IsOptional()
  @IsObject()
  settings?: {
    resolution?: string;
    colorDepth?: number;
    multiMonitor?: boolean;
    audioEnabled?: boolean;
    clipboardEnabled?: boolean;
    fileTransferEnabled?: boolean;
    recordingEnabled?: boolean;
  };

  @ApiProperty({ description: 'Session security settings', required: false })
  @IsOptional()
  @IsObject()
  security?: {
    encrypted?: boolean;
    vpnRequired?: boolean;
    mfaRequired?: boolean;
    ipWhitelist?: string[];
    sessionTimeout?: number;
  };

  @ApiProperty({ description: 'Session metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}