// path: backend/src/storage/dto/download-query.dto.ts
// purpose: DTO for download URL generation query params

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class DownloadQueryDto {
  @ApiPropertyOptional({ description: 'Expiration in seconds for the presigned URL', default: 3600 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(60)
  @Max(604800)
  expiresIn?: number = 3600;

  @ApiPropertyOptional({ description: 'Track the download event', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  track?: boolean = true;
}
