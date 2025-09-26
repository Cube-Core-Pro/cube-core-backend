// path: backend/src/storage/dto/share-file.dto.ts
// purpose: DTO for creating a share link for a file
// dependencies: class-validator, class-transformer, swagger

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, IsDateString, Min } from 'class-validator';

export class ShareFileDto {
  @ApiPropertyOptional({ description: 'ISO date for when the share link expires' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Password required to access the share' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Allow downloading the file' })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional({ description: 'Allow previewing the file' })
  @IsOptional()
  @IsBoolean()
  allowPreview?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of downloads' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxDownloads?: number;
}
