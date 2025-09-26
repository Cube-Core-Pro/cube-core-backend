// path: backend/src/storage/dto/upload-file.dto.ts
// purpose: DTO for file upload operations with validation and metadata
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsEnum, IsObject, ValidateNested, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StorageProvider {
  AWS_S3 = 'aws-s3',
  AZURE_BLOB = 'azure-blob',
  GCP_STORAGE = 'gcp-storage',
  GOOGLE_CLOUD = 'google-cloud',
  MINIO = 'minio',
  LOCAL = 'local'
}

export enum FileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TENANT_ONLY = 'tenant-only'
}

export class FileMetadataDto {
  @ApiPropertyOptional({ description: 'Original filename' })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({ description: 'File MIME type' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'File tags for categorization' })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Custom metadata object' })
  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}

export class UploadFileDto {
  @ApiProperty({ description: 'File buffer or stream' })
  file: Buffer | NodeJS.ReadableStream | Express.Multer.File;

  @ApiPropertyOptional({ description: 'Target storage provider' })
  @IsOptional()
  @IsEnum(StorageProvider)
  provider?: StorageProvider;

  @ApiPropertyOptional({ description: 'Storage bucket/container name' })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({ description: 'File key/path in storage' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ description: 'Target folder path' })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({ description: 'Enable file compression' })
  @IsOptional()
  @IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({ description: 'Generate thumbnail for images' })
  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean;

  @ApiPropertyOptional({ description: 'File tags' })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Enable virus scanning' })
  @IsOptional()
  @IsBoolean()
  virusScan?: boolean;

  @ApiPropertyOptional({ description: 'File visibility level' })
  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility = FileVisibility.PRIVATE;

  @ApiPropertyOptional({ description: 'Enable file versioning' })
  @IsOptional()
  @IsBoolean()
  versioning?: boolean = false;

  @ApiPropertyOptional({ description: 'File expiration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(31536000) // Max 1 year
  expiresIn?: number;

  @ApiPropertyOptional({ description: 'File metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  metadata?: FileMetadataDto;

  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenant isolation' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'User ID for audit trail' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Enable server-side encryption' })
  @IsOptional()
  @IsBoolean()
  encryption?: boolean = true;

  @ApiPropertyOptional({ description: 'Content encoding (gzip, etc.)' })
  @IsOptional()
  @IsString()
  contentEncoding?: string;

  @ApiPropertyOptional({ description: 'Cache control header' })
  @IsOptional()
  @IsString()
  cacheControl?: string;
}
