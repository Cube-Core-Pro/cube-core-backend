// path: backend/src/storage/dto/query-files.dto.ts
// purpose: DTO for querying and filtering files with advanced search capabilities
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProvider, FileVisibility } from './upload-file.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum SortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SIZE = 'size',
  NAME = 'name',
  MIME_TYPE = 'mimeType'
}

export class QueryFilesDto {
  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of files per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search query for file names and metadata' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by storage provider' })
  @IsOptional()
  @IsEnum(StorageProvider)
  provider?: StorageProvider;

  @ApiPropertyOptional({ description: 'Filter by bucket/container' })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({ description: 'Filter by file visibility' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @ApiPropertyOptional({ description: 'Filter by MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Filter by MIME type pattern (e.g., image/*, video/*)' })
  @IsOptional()
  @IsString()
  mimeTypePattern?: string;

  @ApiPropertyOptional({ description: 'Minimum file size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSize?: number;

  @ApiPropertyOptional({ description: 'Maximum file size in bytes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxSize?: number;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by file tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter files created after this date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Filter files created before this date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Filter files modified after this date' })
  @IsOptional()
  @IsDateString()
  modifiedAfter?: string;

  @ApiPropertyOptional({ description: 'Filter files modified before this date' })
  @IsOptional()
  @IsDateString()
  modifiedBefore?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted files' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({ description: 'Include only encrypted files' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  encryptedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include only files with expiration' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  expiringOnly?: boolean;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'Cursor for cursor-based pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Include file metadata in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({ description: 'Generate signed URLs for files' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSignedUrls?: boolean = false;

  @ApiPropertyOptional({ description: 'Signed URL expiration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(604800) // Max 7 days
  @Type(() => Number)
  signedUrlExpiry?: number = 3600; // 1 hour default
}