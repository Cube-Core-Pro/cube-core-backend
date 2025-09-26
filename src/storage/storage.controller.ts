// path: backend/src/storage/storage.controller.ts
// purpose: REST API controller for file storage operations with comprehensive endpoints
// dependencies: @nestjs/common, @nestjs/swagger, multer, FileStorageService

import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Readable as NodeReadable } from 'stream';
import { FileStorageService, UploadOptions, FileMetadata } from './file-storage.service';
import { Fortune500StorageConfig } from '../types/fortune500-types';
import {
  UploadFileDto,
  QueryFilesDto,
  FileResponseDto,
  FileListResponseDto,
  FileUploadResponseDto,
  FileDeleteResponseDto,
  FileStatsResponseDto,
  StorageProvider,
  FileVisibility,
  ShareFileDto,
  MoveFileDto,
  DownloadQueryDto,
} from './dto';

@ApiTags('File Storage')
@Controller('api/v1/storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  private toFileResponseDto(metadata: FileMetadata, overrides: Partial<FileResponseDto> = {}): FileResponseDto {
    const metadataRecord = metadata.metadata ?? {};
    const tags = metadata.tags ?? (Array.isArray(metadataRecord.tags) ? metadataRecord.tags : []);
    const fileMetadataDto = {
      originalName: metadata.originalName ?? metadataRecord.originalName,
      mimeType: metadata.mimeType,
      size: Number(metadata.size),
      description: metadataRecord.description,
      tags,
      custom: metadataRecord.custom,
    };

    const response: FileResponseDto = {
      id: metadata.id,
      key: metadata.key,
      bucket: metadata.bucket,
      provider: metadata.provider as StorageProvider,
      url: metadata.url,
      visibility: metadata.visibility as FileVisibility,
  size: Number(metadata.size),
      mimeType: metadata.mimeType,
      checksum: metadata.checksum,
      version: metadata.version,
      expiresAt: metadata.expiresAt,
      metadata: fileMetadataDto,
      tenantId: metadata.tenantId,
      userId: metadata.userId,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      deletedAt: metadata.deletedAt,
      encrypted: metadata.encrypted,
      encryptionAlgorithm: metadata.encryptionAlgorithm,
      contentEncoding: metadata.contentEncoding,
      cacheControl: metadata.cacheControl,
    };

    if (!metadata.isPublic && metadata.url) {
      response.signedUrl = metadata.url;
    }

    return { ...response, ...overrides };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to storage' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: Partial<UploadFileDto>,
    @Request() req: any,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const visibility = uploadDto.visibility ?? FileVisibility.PRIVATE;
    const metadataPayload: Record<string, any> = {
      originalName: file.originalname,
      description: uploadDto.metadata?.description,
      custom: uploadDto.metadata?.custom,
    };

    const uploadOptions: UploadOptions = {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      folder: uploadDto.folder,
      bucket: uploadDto.bucket,
      provider: uploadDto.provider as StorageProvider,
      visibility,
      isPublic: visibility === FileVisibility.PUBLIC,
      encrypt: uploadDto.encryption !== false,
      compress: uploadDto.compress,
      contentEncoding: uploadDto.contentEncoding,
      cacheControl: uploadDto.cacheControl,
      generateThumbnail: uploadDto.generateThumbnail,
      tags: uploadDto.metadata?.tags ?? uploadDto.tags,
      metadata: metadataPayload,
      expiresAt: uploadDto.expiresIn ? new Date(Date.now() + uploadDto.expiresIn * 1000) : undefined,
      virusScan: uploadDto.virusScan,
    };

    const fileMetadata = await this.fileStorageService.uploadFile(file, uploadOptions);
    const responseFile = this.toFileResponseDto(fileMetadata);

    return {
      success: true,
      file: responseFile,
      uploadedAt: new Date(),
    };
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Upload a file using a direct URL/buffer' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFromUrl(
    @Body() uploadDto: UploadFileDto,
    @Request() req: any,
  ): Promise<FileUploadResponseDto> {
    const visibility = uploadDto.visibility ?? FileVisibility.PRIVATE;
    const metadataPayload: Record<string, any> = {
      originalName: uploadDto.metadata?.originalName,
      description: uploadDto.metadata?.description,
      custom: uploadDto.metadata?.custom,
    };

    const uploadOptions: UploadOptions = {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      bucket: uploadDto.bucket,
      provider: uploadDto.provider as StorageProvider,
      visibility,
      isPublic: visibility === FileVisibility.PUBLIC,
      encrypt: uploadDto.encryption !== false,
      tags: uploadDto.metadata?.tags,
      metadata: metadataPayload,
      expiresAt: uploadDto.expiresIn ? new Date(Date.now() + uploadDto.expiresIn * 1000) : undefined,
    };

    const uploadSource = Buffer.isBuffer(uploadDto.file)
      ? uploadDto.file
      : (uploadDto.file as unknown as NodeReadable);
    const fileMetadata = await this.fileStorageService.uploadFile(uploadSource, uploadOptions);
    const responseFile = this.toFileResponseDto(fileMetadata);

    return {
      success: true,
      file: responseFile,
      uploadedAt: new Date(),
    };
  }

  @Get('files')
  @ApiOperation({ summary: 'Query and list files with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully', type: FileListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async queryFiles(
    @Query() queryDto: QueryFilesDto,
    @Request() req: any,
  ): Promise<FileListResponseDto> {
    // Ensure tenant isolation
    queryDto.tenantId = req.user.tenantId;

    const result = await this.fileStorageService.queryFiles(queryDto);

    return {
      files: result.data.map((file: FileMetadata) => this.toFileResponseDto(file)),
      total: result.pagination.total,
      page: result.pagination.page,
      limit: result.pagination.limit,
      hasMore: result.pagination.hasMore,
    };
  }

  @Get('files/:fileId/download')
  @ApiOperation({ summary: 'Get a presigned URL to download a file' })
  @ApiResponse({ status: 200, description: 'Presigned URL generated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDownloadUrl(
    @Param('fileId') fileId: string,
    @Query() query: DownloadQueryDto,
    @Request() req: any,
  ): Promise<{ url: string; file: FileResponseDto }> {
    const result = await this.fileStorageService.downloadFile(fileId, {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      generatePresignedUrl: true,
      expiresIn: query.expiresIn ?? 3600,
      trackDownload: query.track ?? true,
    });

    return {
      url: result.presignedUrl!,
      file: this.toFileResponseDto(result.metadata),
    };
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<FileResponseDto> {
    const metadata = await this.fileStorageService.getFile(fileId, req.user.tenantId);
    return this.toFileResponseDto(metadata);
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete a file (soft delete by default)' })
  @ApiResponse({ status: 200, description: 'File deleted successfully', type: FileDeleteResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @Query('permanent') permanent: boolean = false,
    @Request() req: any,
  ): Promise<FileDeleteResponseDto> {
    await this.fileStorageService.deleteFile(fileId, req.user.tenantId, permanent);
    
    return {
      success: true,
      fileId,
      message: `File ${permanent ? 'permanently ' : ''}deleted successfully`,
      deletedAt: new Date(),
      permanent,
    };
  }

  @Delete('files/:fileId/permanent')
  @ApiOperation({ summary: 'Permanently delete a file' })
  @ApiResponse({ status: 200, description: 'File permanently deleted', type: FileDeleteResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles('admin', 'super-admin')
  async permanentlyDeleteFile(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<FileDeleteResponseDto> {
    await this.fileStorageService.deleteFile(fileId, req.user.tenantId, true);
    
    return {
      success: true,
      fileId,
      message: 'File permanently deleted successfully',
      deletedAt: new Date(),
      permanent: true,
    };
  }

  @Post('files/:fileId/share')
  @ApiOperation({ summary: 'Create a share link for a file' })
  @ApiResponse({ status: 201, description: 'Share link created' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async shareFile(
    @Param('fileId') fileId: string,
    @Body() body: ShareFileDto,
    @Request() req: any,
  ): Promise<{ shareId: string; shareUrl: string }> {
    const expiresAtDate = body.expiresAt ? new Date(body.expiresAt) : undefined;
    return this.fileStorageService.shareFile(fileId, req.user.tenantId, {
      expiresAt: expiresAtDate,
      password: body.password,
      allowDownload: body.allowDownload,
      allowPreview: body.allowPreview,
      maxDownloads: body.maxDownloads,
    });
  }

  @Get('files/:fileId/versions')
  @ApiOperation({ summary: 'List versions of a file' })
  @ApiResponse({ status: 200, description: 'File versions retrieved', type: FileListResponseDto })
  async listFileVersions(
    @Param('fileId') fileId: string,
    @Request() req: any,
  ): Promise<FileListResponseDto> {
    const versions = await this.fileStorageService.getFileVersions(fileId, req.user.tenantId);
    return {
      files: versions.map((v) => this.toFileResponseDto(v)),
      total: versions.length,
      page: 1,
      limit: versions.length,
      hasMore: false,
    };
  }

  @Post('files/:fileId/version')
  @ApiOperation({ summary: 'Create a new file version' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'New version created', type: FileUploadResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async createVersion(
    @Param('fileId') fileId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: Partial<UploadFileDto>,
    @Request() req: any,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const visibility = uploadDto.visibility ?? FileVisibility.PRIVATE;
    const options: UploadOptions = {
      tenantId: req.user.tenantId,
      userId: req.user.sub,
      folder: uploadDto.folder,
      bucket: uploadDto.bucket,
      provider: uploadDto.provider as StorageProvider,
      visibility,
      isPublic: visibility === FileVisibility.PUBLIC,
      encrypt: uploadDto.encryption !== false,
      compress: uploadDto.compress,
      contentEncoding: uploadDto.contentEncoding,
      cacheControl: uploadDto.cacheControl,
      tags: uploadDto.metadata?.tags ?? uploadDto.tags,
      metadata: uploadDto.metadata as any,
    };

    const versionMeta = await this.fileStorageService.createFileVersion(fileId, file, options);
    return {
      success: true,
      file: this.toFileResponseDto(versionMeta),
      uploadedAt: new Date(),
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search files with flexible filters' })
  @ApiResponse({ status: 200, description: 'Search results', type: FileListResponseDto })
  async search(
    @Query()
    query: {
      filename?: string; mimeType?: string; tags?: string[]; folder?: string; userId?: string; dateFrom?: string; dateTo?: string; minSize?: number; maxSize?: number; page?: number; limit?: number;
    },
    @Request() req: any,
  ): Promise<FileListResponseDto> {
    const result = await this.fileStorageService.searchFiles(req.user.tenantId, {
      filename: query.filename,
      mimeType: query.mimeType,
      tags: query.tags,
      folder: query.folder,
      userId: query.userId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      minSize: query.minSize,
      maxSize: query.maxSize,
      page: query.page,
      limit: query.limit,
    });

    return {
      files: result.files.map((f) => this.toFileResponseDto(f)),
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 20,
      hasMore: result.total > ((query.page || 1) * (query.limit || 20)),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get file storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics retrieved successfully', type: FileStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStorageStats(
    @Request() req: any,
  ): Promise<FileStatsResponseDto> {
    return this.fileStorageService.getFileStats(req.user.tenantId);
  }

  @Get('stats/global')
  @ApiOperation({ summary: 'Get global file storage statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Global storage statistics retrieved successfully', type: FileStatsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @Roles('admin', 'super-admin')
  async getGlobalStorageStats(): Promise<FileStatsResponseDto> {
    return this.fileStorageService.getFileStats();
  }

  @Post('files/:fileId/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted file' })
  @ApiResponse({ status: 200, description: 'File restored successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async restoreFile(
    @Param('fileId') _fileId: string,
    @Request() _req: any,
  ): Promise<FileResponseDto> {
    // This would be implemented in the service
    throw new BadRequestException('Restore functionality not yet implemented');
  }

  @Post('files/:fileId/copy')
  @ApiOperation({ summary: 'Copy a file to a new location' })
  @ApiResponse({ status: 201, description: 'File copied successfully', type: FileUploadResponseDto })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async copyFile(
    @Param('fileId') _fileId: string,
    @Body() _copyDto: { bucket?: string; key?: string; provider?: StorageProvider },
    @Request() _req: any,
  ): Promise<FileUploadResponseDto> {
    // This would be implemented in the service
    throw new BadRequestException('Copy functionality not yet implemented');
  }

  @Post('files/:fileId/move')
  @ApiOperation({ summary: 'Move a file to a new location' })
  @ApiResponse({ status: 200, description: 'File moved successfully', type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async moveFile(
    @Param('fileId') fileId: string,
    @Body() moveDto: MoveFileDto,
    @Request() req: any,
  ): Promise<FileResponseDto> {
    const file = await this.fileStorageService.getFile(fileId, req.user.tenantId);

    // Compute destination key: if a full key is provided use it; else prepend optional folder to current filename
    let destinationKey = moveDto.key;
    if (!destinationKey) {
      const filename = file.filename || file.key.split('/').pop()!;
      const basePath = [req.user.tenantId];
      if (moveDto.folder) basePath.push(moveDto.folder);
      destinationKey = [...basePath, filename].join('/');
    }

    await this.fileStorageService.moveFile(file.key, destinationKey);

    const updated = await this.fileStorageService.getFile(fileId, req.user.tenantId);
    return this.toFileResponseDto(updated);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check storage service health' })
  @ApiResponse({ status: 200, description: 'Storage service is healthy' })
  async healthCheck(): Promise<{ status: string; timestamp: Date; providers: Record<string, boolean> }> {
    // This would check connectivity to all configured storage providers
    return {
      status: 'healthy',
      timestamp: new Date(),
      providers: {
        [StorageProvider.LOCAL]: true,
        [StorageProvider.AWS_S3]: false, // Would check actual connectivity
        [StorageProvider.AZURE_BLOB]: false,
        [StorageProvider.GCP_STORAGE]: false,
        [StorageProvider.MINIO]: false,
      },
    };
  }
}
