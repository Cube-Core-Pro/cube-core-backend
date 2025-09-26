// path: backend/src/storage/dto/file-response.dto.ts
// purpose: Response DTOs for file operations with comprehensive metadata
// dependencies: class-validator, swagger

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StorageProvider, FileVisibility, FileMetadataDto } from './upload-file.dto';

export class FileResponseDto {
  @ApiProperty({ description: 'Unique file identifier' })
  id: string;

  @ApiProperty({ description: 'File key/path in storage' })
  key: string;

  @ApiProperty({ description: 'Storage bucket/container name' })
  bucket: string;

  @ApiProperty({ description: 'Storage provider used' })
  provider: StorageProvider;

  @ApiProperty({ description: 'File URL for access' })
  url: string;

  @ApiPropertyOptional({ description: 'Signed URL for temporary access' })
  signedUrl?: string;

  @ApiProperty({ description: 'File visibility level' })
  visibility: FileVisibility;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'File MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File checksum (MD5/SHA256)' })
  checksum: string;

  @ApiProperty({ description: 'File version (if versioning enabled)' })
  version: string;

  @ApiPropertyOptional({ description: 'File expiration timestamp' })
  expiresAt?: Date;

  @ApiProperty({ description: 'File metadata' })
  metadata: FileMetadataDto;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'User ID who uploaded the file' })
  userId: string;

  @ApiProperty({ description: 'File creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'File last modified timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'File deletion timestamp (soft delete)' })
  deletedAt?: Date;

  @ApiProperty({ description: 'Whether file is encrypted' })
  encrypted: boolean;

  @ApiPropertyOptional({ description: 'Encryption algorithm used' })
  encryptionAlgorithm?: string;

  @ApiPropertyOptional({ description: 'Content encoding' })
  contentEncoding?: string;

  @ApiPropertyOptional({ description: 'Cache control settings' })
  cacheControl?: string;
}

export class FileListResponseDto {
  @ApiProperty({ description: 'List of files', type: [FileResponseDto] })
  files: FileResponseDto[];

  @ApiProperty({ description: 'Total number of files' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of files per page' })
  limit: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Next page cursor for pagination' })
  nextCursor?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({ description: 'Uploaded file information' })
  file: FileResponseDto;

  @ApiPropertyOptional({ description: 'Upload message' })
  message?: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;
}

export class FileDeleteResponseDto {
  @ApiProperty({ description: 'Deletion success status' })
  success: boolean;

  @ApiProperty({ description: 'Deleted file ID' })
  fileId: string;

  @ApiPropertyOptional({ description: 'Deletion message' })
  message?: string;

  @ApiProperty({ description: 'Deletion timestamp' })
  deletedAt: Date;

  @ApiProperty({ description: 'Whether file was permanently deleted' })
  permanent: boolean;
}

export class FileStatsResponseDto {
  @ApiProperty({ description: 'Total number of files' })
  totalFiles: number;

  @ApiProperty({ description: 'Total storage used in bytes' })
  totalSize: number;

  @ApiProperty({ description: 'Storage used by provider' })
  storageByProvider: Record<StorageProvider, number>;

  @ApiProperty({ description: 'Files by visibility level' })
  filesByVisibility: Record<FileVisibility, number>;

  @ApiProperty({ description: 'Files by MIME type' })
  filesByMimeType: Record<string, number>;

  @ApiProperty({ description: 'Average file size in bytes' })
  averageFileSize: number;

  @ApiProperty({ description: 'Largest file size in bytes' })
  largestFileSize: number;

  @ApiProperty({ description: 'Most recent upload timestamp' })
  lastUploadAt: Date;
}
