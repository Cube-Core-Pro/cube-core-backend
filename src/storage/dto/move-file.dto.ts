// path: backend/src/storage/dto/move-file.dto.ts
// purpose: DTO for moving a file to a new location

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { StorageProvider } from './upload-file.dto';

export class MoveFileDto {
  @ApiPropertyOptional({ description: 'Destination bucket' })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({ description: 'Destination key/path' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ description: 'Destination folder (used if key is not provided)' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Destination storage provider' })
  @IsOptional()
  @IsEnum(StorageProvider)
  provider?: StorageProvider;
}
