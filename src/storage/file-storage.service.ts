// path: backend/src/storage/file-storage.service.ts
// purpose: Enterprise file storage service with multi-cloud support, versioning, encryption, and compliance
// dependencies: @nestjs/common, aws-sdk, azure-storage, google-cloud/storage, minio, sharp, ffmpeg, virus-scanner

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as AWS from 'aws-sdk';
import { BlobServiceClient } from '@azure/storage-blob';
import { Storage as GoogleStorage } from '@google-cloud/storage';
import * as MinIO from 'minio';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import * as mime from 'mime-types';
import { Readable } from 'stream';
import { StorageProvider, FileVisibility } from './dto/upload-file.dto';

type StorageProviderLiteral = (typeof StorageProvider)[keyof typeof StorageProvider];
type StorageProviderType = StorageProviderLiteral | 'aws' | 'azure' | 'gcp';
type FileVisibilityType = (typeof FileVisibility)[keyof typeof FileVisibility];

export interface FileMetadata {
  id: string;
  tenantId: string;
  userId: string;
  key: string;
  path: string;
  bucket: string;
  provider: StorageProviderType;
  url: string;
  visibility: FileVisibilityType;
  size: number;
  mimeType: string;
  checksum: string;
  version: string;
  metadata: Record<string, any>;
  encrypted: boolean;
  encryptionAlgorithm?: string;
  contentEncoding?: string;
  cacheControl?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Legacy/derived fields retained for downstream compatibility
  filename?: string;
  originalName?: string;
  tags?: string[];
  isPublic?: boolean;
  downloadCount?: number;
  lastAccessedAt?: Date | null;
  compressed?: boolean;
}

export interface UploadOptions {
  tenantId: string;
  userId: string;
  folder?: string;
  bucket?: string;
  provider?: StorageProviderType;
  visibility?: FileVisibilityType;
  isPublic?: boolean;
  encrypt?: boolean;
  encryptionAlgorithm?: string;
  compress?: boolean;
  contentEncoding?: string;
  cacheControl?: string;
  generateThumbnail?: boolean;
  generatePresignedUrl?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  expiresAt?: Date;
  allowedMimeTypes?: string[];
  maxSize?: number;
  virusScan?: boolean;
}

export interface DownloadOptions {
  tenantId: string;
  userId: string;
  version?: number;
  generatePresignedUrl?: boolean;
  expiresIn?: number;
  trackDownload?: boolean;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private s3Client: AWS.S3;
  private azureBlobClient: BlobServiceClient;
  private gcpStorage: GoogleStorage;
  private minioClient: MinIO.Client;
  private defaultProvider: StorageProviderType;
  private encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.initializeClients();
    this.defaultProvider = this.normalizeProvider(
      this.configService.get<string>('FILE_STORAGE_PROVIDER') ?? 'minio',
    );
    const configuredKey = this.configService.get<string>('FILE_ENCRYPTION_KEY');
    const encryptionKeyHex = configuredKey ?? crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
  }

  private initializeClients(): void {
    // AWS S3
    if (this.configService.get('AWS_ACCESS_KEY_ID')) {
      this.s3Client = new AWS.S3({
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });
    }

    // Azure Blob Storage
    if (this.configService.get('AZURE_STORAGE_CONNECTION_STRING')) {
      this.azureBlobClient = BlobServiceClient.fromConnectionString(
        this.configService.get('AZURE_STORAGE_CONNECTION_STRING'),
      );
    }

    // Google Cloud Storage
    if (this.configService.get('GCP_PROJECT_ID')) {
      this.gcpStorage = new GoogleStorage({
        projectId: this.configService.get('GCP_PROJECT_ID'),
        keyFilename: this.configService.get('GCP_KEY_FILE'),
      });
    }

    // MinIO
    this.minioClient = new MinIO.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  private normalizeProvider(provider: string | null | undefined): StorageProviderType {
    const normalized = (provider ?? this.defaultProvider ?? '').toLowerCase();
    switch (normalized) {
      case 'aws':
      case 'aws-s3':
      case 's3':
        return StorageProvider.AWS_S3;
      case 'azure':
      case 'azure-blob':
      case 'azure_blob':
        return StorageProvider.AZURE_BLOB;
      case 'gcp':
      case 'gcp-storage':
      case 'gcs':
      case 'google-cloud':
        return StorageProvider.GCP_STORAGE;
      case 'local':
        return StorageProvider.LOCAL;
      case 'minio':
      default:
        return StorageProvider.MINIO;
    }
  }

  async uploadFile(
    file: Express.Multer.File | Buffer | Readable,
    options: UploadOptions,
  ): Promise<FileMetadata> {
    try {
      await this.validateFile(file, options);

      const provider = this.normalizeProvider(options.provider ?? this.defaultProvider);
      const bucket = options.bucket ?? this.getBucketName(options.tenantId);
      const now = new Date();
      const fileId = crypto.randomUUID();
      const filename = this.generateFilename(fileId, file);
      const key = this.generateFilePath(options.tenantId, options.folder, filename);
      const visibility =
        options.visibility ?? (options.isPublic ? FileVisibility.PUBLIC : FileVisibility.PRIVATE);
      const isPublic = visibility === FileVisibility.PUBLIC;

      if (options.virusScan) {
        await this.scanForVirus(file);
      }

      const processedFile = await this.processFile(file, options);
      const checksum = await this.calculateChecksum(processedFile);

      const uploadResult = await this.uploadToProvider(
        processedFile,
        key,
        options,
        provider,
        bucket,
      );

      let thumbnailPath: string | undefined;
      if (options.generateThumbnail && this.isImageFile(file)) {
        thumbnailPath = await this.generateThumbnail(processedFile, key, options, provider, bucket);
      }

      const originalName = this.getOriginalName(file);
      const metadataRecord: Record<string, any> = {
        ...(options.metadata ?? {}),
        originalName,
        filename,
        tags: options.tags ?? [],
        thumbnailPath,
        uploadResult,
        downloadCount: 0,
        lastAccessedAt: now.toISOString(),
        compressed: Boolean(options.compress),
      };

      const fileMetadata: FileMetadata = {
        id: fileId,
        tenantId: options.tenantId,
        userId: options.userId,
        key,
        path: key,
        bucket,
        provider,
        url: '',
        visibility,
        size: this.getFileSize(processedFile),
        mimeType: this.getMimeType(file),
        checksum,
        version: '1',
        metadata: metadataRecord,
        encrypted: Boolean(options.encrypt),
        encryptionAlgorithm: options.encryptionAlgorithm
          ?? (options.encrypt ? 'aes-256-cbc' : undefined),
        contentEncoding: options.contentEncoding,
        cacheControl: options.cacheControl,
        expiresAt: options.expiresAt,
        createdAt: now,
        updatedAt: now,
        filename,
        originalName,
        tags: options.tags ?? [],
        isPublic,
        downloadCount: 0,
        lastAccessedAt: now,
        compressed: Boolean(options.compress),
      };

      if (isPublic) {
        fileMetadata.url = await this.generatePublicUrl(fileMetadata);
      } else if (options.generatePresignedUrl) {
        fileMetadata.url = await this.generatePresignedUrl(fileMetadata, 3600);
      }

      await this.saveFileMetadata(fileMetadata);
      await this.redis.setex(`file:${fileId}`, 3600, JSON.stringify(fileMetadata));
      this.logger.log(`File uploaded successfully: ${fileId} (${filename})`);

      return fileMetadata;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async downloadFile(fileId: string, options: DownloadOptions): Promise<{
    stream: Readable;
    metadata: FileMetadata;
    presignedUrl?: string;
  }> {
    try {
      // Get file metadata
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        throw new NotFoundException('File not found');
      }

      // Validate access
      await this.validateFileAccess(metadata, options);

      // Generate presigned URL if requested
      let presignedUrl: string | undefined;
      if (options.generatePresignedUrl) {
        presignedUrl = await this.generatePresignedUrl(
          metadata,
          options.expiresIn || 3600,
        );
      }

      // Get file stream from provider
      const stream = await this.downloadFromProvider(metadata, options.version);

      // Track download if enabled
      if (options.trackDownload) {
        await this.trackDownload(fileId, options.userId);
      }

      return {
        stream,
        metadata,
        presignedUrl,
      };
    } catch (error) {
      this.logger.error('Error downloading file:', error);
      throw error;
    }
  }

  async createFileVersion(fileId: string, file: Express.Multer.File | Buffer, options: UploadOptions): Promise<FileMetadata> {
    try {
      const originalMetadata = await this.getFileMetadata(fileId);
      if (!originalMetadata || originalMetadata.tenantId !== options.tenantId) {
        throw new NotFoundException('Original file not found');
      }

      // Create new version
      const currentVersion = parseInt(originalMetadata.version ?? '1', 10) || 1;
      const newVersion = currentVersion + 1;
      const versionedFilename = this.generateVersionedFilename(
        originalMetadata.filename ?? originalMetadata.key,
        newVersion,
      );
      const versionedPath = this.generateFilePath(options.tenantId, options.folder, versionedFilename);

      // Process and upload new version
      const processedFile = await this.processFile(file, options);
      const checksum = await this.calculateChecksum(processedFile);
      
      await this.uploadToProvider(
        processedFile,
        versionedPath,
        options,
        originalMetadata.provider,
        originalMetadata.bucket,
      );

      // Update metadata
      const updatedMetadataDocument = {
        ...originalMetadata.metadata,
        previousVersion: originalMetadata.version,
        originalFileId: originalMetadata.metadata.originalFileId ?? originalMetadata.id,
      };

      const versionedMetadata: FileMetadata = {
        ...originalMetadata,
        key: versionedPath,
        path: versionedPath,
        filename: versionedFilename,
        size: this.getFileSize(processedFile),
        checksum,
        version: String(newVersion),
        updatedAt: new Date(),
        metadata: updatedMetadataDocument,
      };

      await this.saveFileMetadata(versionedMetadata);
      await this.redis.setex(`file:${fileId}`, 3600, JSON.stringify(versionedMetadata));

      return versionedMetadata;
    } catch (error) {
      this.logger.error('Error creating file version:', error);
      throw error;
    }
  }

  async getFileVersions(fileId: string, tenantId: string): Promise<FileMetadata[]> {
    try {
      const allFiles = await this.prisma.file.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return allFiles
        .map((file) => this.mapPrismaToFileMetadata(file))
        .filter((metadata) =>
          metadata.id === fileId || metadata.metadata?.originalFileId === fileId,
        );
    } catch (error) {
      this.logger.error('Error getting file versions:', error);
      throw error;
    }
  }

  async shareFile(fileId: string, tenantId: string, shareOptions: {
    expiresAt?: Date;
    password?: string;
    allowDownload?: boolean;
    allowPreview?: boolean;
    maxDownloads?: number;
  }): Promise<{ shareId: string; shareUrl: string }> {
    try {
      let metadata = await this.getFileMetadata(fileId);
      if (!metadata || metadata.tenantId !== tenantId) {
        const byKey = await this.getFileMetadataByPath(fileId);
        if (!byKey || byKey.tenantId !== tenantId) {
          throw new NotFoundException('File not found');
        }
        metadata = byKey;
      }

      const shareId = crypto.randomUUID();
      const shareToken = crypto.randomBytes(32).toString('hex');

      // Save share record
      await this.prisma.fileShare.create({
        data: {
          id: shareId,
          fileId,
          tenantId,
          shareToken,
          expiresAt: shareOptions.expiresAt,
          password: shareOptions.password ? await this.hashPassword(shareOptions.password) : null,
          allowDownload: shareOptions.allowDownload ?? true,
          allowPreview: shareOptions.allowPreview ?? true,
          maxDownloads: shareOptions.maxDownloads,
          downloadCount: 0,
          createdAt: new Date(),
        },
      });

      const shareUrl = `${this.configService.get('APP_URL')}/share/${shareToken}`;

      return { shareId, shareUrl };
    } catch (error) {
      this.logger.error('Error sharing file:', error);
      throw error;
    }
  }

  async searchFiles(tenantId: string, query: {
    filename?: string;
    mimeType?: string;
    tags?: string[];
    folder?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minSize?: number;
    maxSize?: number;
    page?: number;
    limit?: number;
  }): Promise<{ files: FileMetadata[]; total: number }> {
    try {
      const baseWhere: Prisma.FileWhereInput = {
        tenantId,
        deletedAt: null,
      };
      const additional: Prisma.FileWhereInput[] = [];

      if (query.mimeType) {
        additional.push({ mimeType: { contains: query.mimeType, mode: 'insensitive' } });
      }

      if (query.userId) {
        additional.push({ userId: query.userId });
      }

      if (query.folder) {
        additional.push({ key: { contains: query.folder, mode: 'insensitive' } });
      }

      if (query.dateFrom || query.dateTo) {
        additional.push({
          createdAt: {
            gte: query.dateFrom,
            lte: query.dateTo,
          },
        });
      }

      if (query.minSize || query.maxSize) {
        additional.push({
          size: {
            gte: query.minSize ? BigInt(query.minSize) : undefined,
            lte: query.maxSize ? BigInt(query.maxSize) : undefined,
          },
        });
      }

      if (query.filename) {
        additional.push({
          OR: [
            { metadata: { path: ['filename'], string_contains: query.filename } },
            { metadata: { path: ['originalName'], string_contains: query.filename } },
            { key: { contains: query.filename, mode: 'insensitive' } },
          ],
        });
      }

      if (query.tags && query.tags.length > 0) {
        additional.push({
          metadata: {
            path: ['tags'],
            array_contains: query.tags,
          },
        });
      }

      const where: Prisma.FileWhereInput = additional.length
        ? { ...baseWhere, AND: additional }
        : baseWhere;

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;

      const [files, total] = await Promise.all([
        this.prisma.file.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.file.count({ where }),
      ]);

      return {
        files: files.map((f) => this.mapPrismaToFileMetadata(f)),
        total,
      };
    } catch (error) {
      this.logger.error('Error searching files:', error);
      throw error;
    }
  }

  async getStorageAnalytics(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    sizeByMimeType: Record<string, number>;
    uploadsByMonth: Record<string, number>;
    topUsers: Array<{ userId: string; fileCount: number; totalSize: number }>;
    storageQuota: { used: number; limit: number; percentage: number };
  }> {
    try {
      const baseWhereCondition: Prisma.FileWhereInput = {
        tenantId,
        deletedAt: { equals: null },
      };
      const groupByWhere = baseWhereCondition as unknown as Prisma.FileScalarWhereWithAggregatesInput;
      const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const groupByDateWhere = {
        ...baseWhereCondition,
        createdAt: { gte: lastYear },
      } as unknown as Prisma.FileScalarWhereWithAggregatesInput;

      const [totalFiles, totalSizeResult, sizeByMimeType, uploadsByMonth, topUsers] = await Promise.all([
        this.prisma.file.count({ where: baseWhereCondition }),
        this.prisma.file.aggregate({
          where: baseWhereCondition,
          _sum: { size: true },
        }),
        // @ts-ignore Prisma groupBy typing limitation requires manual suppression
        this.prisma.file.groupBy({
          by: ['mimeType'],
          where: groupByWhere,
          _sum: { size: true },
        }) as unknown as Prisma.PrismaPromise<any>,
        // @ts-ignore Prisma groupBy typing limitation requires manual suppression
        this.prisma.file.groupBy({
          by: ['createdAt'],
          where: groupByDateWhere,
          _count: { _all: true },
        }) as unknown as Prisma.PrismaPromise<any>,
        // @ts-ignore Prisma groupBy typing limitation requires manual suppression
        this.prisma.file.groupBy({
          by: ['userId'],
          where: groupByWhere,
          _count: { userId: true },
          _sum: { size: true },
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }) as unknown as Prisma.PrismaPromise<any>,
      ]);

      const totalSize = Number(totalSizeResult._sum.size ?? 0);
      const storageLimit = await this.getStorageLimit(tenantId);

      return {
        totalFiles,
        totalSize,
        sizeByMimeType: sizeByMimeType.reduce((acc, item) => {
          acc[item.mimeType] = Number(item._sum.size ?? 0);
          return acc;
        }, {} as Record<string, number>),
        uploadsByMonth: uploadsByMonth.reduce((acc, item) => {
          const month = item.createdAt.toISOString().substring(0, 7);
          const count = typeof item._count === 'object' ? item._count._all ?? 0 : item._count;
          acc[month] = (acc[month] || 0) + count;
          return acc;
        }, {} as Record<string, number>),
        topUsers: topUsers.map(user => ({
          userId: user.userId,
          fileCount: typeof user._count === 'object' ? (user._count as any).userId ?? 0 : user._count,
          totalSize: Number(user._sum.size ?? 0),
        })),
        storageQuota: {
          used: totalSize,
          limit: storageLimit,
          percentage: storageLimit > 0 ? (totalSize / storageLimit) * 100 : 0,
        },
      };
    } catch (error) {
      this.logger.error('Error getting storage analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async validateFile(file: any, options: UploadOptions): Promise<void> {
    const mimeType = this.getMimeType(file);
    const size = this.getFileSize(file);

    // Check allowed mime types
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`File type ${mimeType} not allowed`);
    }

    // Check file size
    if (options.maxSize && size > options.maxSize) {
      throw new BadRequestException(`File size ${size} exceeds maximum ${options.maxSize}`);
    }

    // Check storage quota
    const storageUsed = await this.getStorageUsed(options.tenantId);
    const storageLimit = await this.getStorageLimit(options.tenantId);
    
    if (storageUsed + size > storageLimit) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }

  private async processFile(file: any, options: UploadOptions): Promise<Buffer> {
    let buffer = this.getFileBuffer(file);

    // Compress if requested
    if (options.compress) {
      buffer = await this.compressFile(buffer, this.getMimeType(file));
    }

    // Encrypt if requested
    if (options.encrypt) {
      buffer = await this.encryptFile(buffer);
    }

    return buffer;
  }

  private async uploadToProvider(
    file: Buffer,
    filePath: string,
    options: UploadOptions,
    provider: StorageProviderType,
    bucket: string,
  ): Promise<void> {
    const contentType = this.getMimeType(file);

    switch (provider) {
      case 'aws-s3':
      case 'aws':
        await this.s3Client.upload({
          Bucket: bucket,
          Key: filePath,
          Body: file,
          ContentType: contentType,
          ServerSideEncryption: options.encrypt ? 'AES256' : undefined,
          ContentEncoding: options.contentEncoding,
          CacheControl: options.cacheControl,
        }).promise();
        return;

      case 'azure-blob':
      case 'azure':
        if (!this.azureBlobClient) {
          throw new BadRequestException('Azure Blob Storage is not configured');
        }
        {
          const containerClient = this.azureBlobClient.getContainerClient(bucket);
          const blockBlobClient = containerClient.getBlockBlobClient(filePath);
          await blockBlobClient.upload(file, file.length, {
            blobHTTPHeaders: {
              blobContentType: contentType,
              blobCacheControl: options.cacheControl,
              blobContentEncoding: options.contentEncoding,
            },
          });
        }
        return;

      case 'gcp-storage':
      case 'gcp':
        if (!this.gcpStorage) {
          throw new BadRequestException('Google Cloud Storage is not configured');
        }
        {
          const gcpBucket = this.gcpStorage.bucket(bucket);
          const gcpFile = gcpBucket.file(filePath);
          await gcpFile.save(file, {
            contentType,
            metadata: {
              cacheControl: options.cacheControl,
              contentEncoding: options.contentEncoding,
            },
          });
        }
        return;

      case 'minio':
        await this.minioClient.putObject(bucket, filePath, file, undefined, {
          'Content-Type': contentType,
          'Cache-Control': options.cacheControl,
          'Content-Encoding': options.contentEncoding,
        });
        return;

      case 'local':
        throw new BadRequestException('Local storage provider is not yet supported');

      default:
        throw new BadRequestException(`Unsupported storage provider: ${provider}`);
    }
  }

  private async downloadFromProvider(metadata: FileMetadata, version?: number): Promise<Readable> {
    const filePath = version ? this.getVersionedPath(metadata.key, version) : metadata.key;

    switch (metadata.provider) {
      case 'aws-s3':
      case 'aws':
        {
          const s3Object = await this.s3Client.getObject({
            Bucket: metadata.bucket,
            Key: filePath,
          }).promise();
          return Readable.from(s3Object.Body as Buffer);
        }

      case 'azure-blob':
      case 'azure':
        if (!this.azureBlobClient) {
          throw new BadRequestException('Azure Blob Storage is not configured');
        }
        {
          const containerClient = this.azureBlobClient.getContainerClient(metadata.bucket);
          const blockBlobClient = containerClient.getBlockBlobClient(filePath);
          const response = await blockBlobClient.download();
          if (!response.readableStreamBody) {
            throw new NotFoundException('Azure blob stream not available');
          }
          return response.readableStreamBody as Readable;
        }

      case 'gcp-storage':
      case 'gcp':
        if (!this.gcpStorage) {
          throw new BadRequestException('Google Cloud Storage is not configured');
        }
        return this.gcpStorage.bucket(metadata.bucket).file(filePath).createReadStream();

      case 'minio':
        return this.minioClient.getObject(metadata.bucket, filePath);

      case 'local':
        throw new BadRequestException('Local storage provider is not yet supported');

      default:
        throw new BadRequestException(`Unsupported storage provider: ${metadata.provider}`);
    }
  }

  private async deleteFromProvider(metadata: FileMetadata): Promise<void> {
    switch (metadata.provider) {
      case 'aws-s3':
      case 'aws':
        await this.s3Client.deleteObject({
          Bucket: metadata.bucket,
          Key: metadata.key,
        }).promise();
        break;

      case 'azure-blob':
      case 'azure':
        if (!this.azureBlobClient) {
          throw new BadRequestException('Azure Blob Storage is not configured');
        }
        await this.azureBlobClient
          .getContainerClient(metadata.bucket)
          .getBlockBlobClient(metadata.key)
          .delete();
        break;

      case 'gcp-storage':
      case 'gcp':
        if (!this.gcpStorage) {
          throw new BadRequestException('Google Cloud Storage is not configured');
        }
        await this.gcpStorage.bucket(metadata.bucket).file(metadata.key).delete();
        break;

      case 'minio':
        await this.minioClient.removeObject(metadata.bucket, metadata.key);
        break;

      case 'local':
        throw new BadRequestException('Local storage provider is not yet supported');
    }
  }

  private async generateThumbnail(
    file: Buffer,
    originalPath: string,
    options: UploadOptions,
    provider: StorageProviderType,
    bucket: string,
  ): Promise<string> {
    try {
      const thumbnail = await sharp(file)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailPath = originalPath.replace(/\.[^.]+$/, '_thumb.jpg');
      await this.uploadToProvider(thumbnail, thumbnailPath, options, provider, bucket);

      return thumbnailPath;
    } catch (error) {
      this.logger.warn('Failed to generate thumbnail:', error);
      return undefined;
    }
  }

  private async scanForVirus(_file: any): Promise<void> {
    // Implementation would integrate with virus scanning service
    // For now, just a placeholder
    this.logger.debug('Virus scan completed (placeholder)');
  }

  private async calculateChecksum(file: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(file).digest('hex');
  }

  private async encryptFile(file: Buffer): Promise<Buffer> {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    return Buffer.concat([cipher.update(file), cipher.final()]);
  }

  private async compressFile(file: Buffer, mimeType: string): Promise<Buffer> {
    if (mimeType.startsWith('image/')) {
      return await sharp(file).jpeg({ quality: 85 }).toBuffer();
    }
    // Add other compression logic for different file types
    return file;
  }

  private generateFilename(fileId: string, file: any): string {
    const ext = path.extname(this.getOriginalName(file));
    return `${fileId}${ext}`;
  }

  private generateFilePath(tenantId: string, folder: string = '', filename: string): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const sanitizedFolder = folder
      ? folder.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '')
      : '';

    return [tenantId, sanitizedFolder, year, month, day, filename]
      .filter((segment) => segment && segment.length > 0)
      .join('/');
  }

  private generateVersionedFilename(originalFilename: string, version: number): string {
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext);
    return `${name}_v${version}${ext}`;
  }

  private getBucketName(tenantId: string): string {
    return `cube-core-${tenantId}`.toLowerCase();
  }

  private getOriginalName(file: any): string {
    if (file.originalname) return file.originalname;
    if (file.filename) return file.filename;
    return 'unknown';
  }

  private getMimeType(file: any): string {
    if (file.mimetype) return file.mimetype;
    if (file.type) return file.type;
    return mime.lookup(this.getOriginalName(file)) || 'application/octet-stream';
  }

  private getFileSize(file: any): number {
    if (Buffer.isBuffer(file)) return file.length;
    if (file.size) return file.size;
    if (file.buffer) return file.buffer.length;
    return 0;
  }

  private getFileBuffer(file: any): Buffer {
    if (Buffer.isBuffer(file)) return file;
    if (file.buffer) return file.buffer;
    throw new BadRequestException('Invalid file format');
  }

  private isImageFile(file: any): boolean {
    return this.getMimeType(file).startsWith('image/');
  }

  private async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    // Try cache first
    const cached = await this.redis.get(`file:${fileId}`);
    if (cached) {
      return this.hydrateCachedMetadata(JSON.parse(cached));
    }

    // Get from database
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, deletedAt: null },
    });

    if (!file) return null;

    const metadata = this.mapPrismaToFileMetadata(file);
    
    // Cache for future use
    await this.redis.setex(`file:${fileId}`, 3600, JSON.stringify(metadata));
    
    return metadata;
  }

  private hydrateCachedMetadata(raw: any): FileMetadata {
    const metadataDocument = this.parseMetadataDocument(raw.metadata);
    const visibility = raw.visibility as FileVisibilityType;
    const provider = this.normalizeProvider(raw.provider);
    const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();
    const updatedAt = raw.updatedAt ? new Date(raw.updatedAt) : createdAt;
    const expiresAt = raw.expiresAt ? new Date(raw.expiresAt) : undefined;
    const deletedAt = raw.deletedAt ? new Date(raw.deletedAt) : undefined;
    const lastAccessedAt = raw.lastAccessedAt
      ? new Date(raw.lastAccessedAt)
      : metadataDocument.lastAccessedAt
        ? new Date(metadataDocument.lastAccessedAt)
        : null;
    const tags = Array.isArray(raw.tags) ? raw.tags : metadataDocument.tags ?? [];
    const downloadCount = typeof raw.downloadCount === 'number'
      ? raw.downloadCount
      : typeof metadataDocument.downloadCount === 'number'
        ? metadataDocument.downloadCount
        : 0;

    return {
      id: raw.id,
      tenantId: raw.tenantId,
      userId: raw.userId,
      key: raw.key ?? raw.path,
      path: raw.key ?? raw.path,
      bucket: raw.bucket,
      provider,
      url: raw.url ?? '',
      visibility,
      size: Number(raw.size),
      mimeType: raw.mimeType,
      checksum: raw.checksum,
      version: String(raw.version),
      metadata: metadataDocument,
      encrypted: Boolean(raw.encrypted),
      encryptionAlgorithm: raw.encryptionAlgorithm ?? undefined,
      contentEncoding: raw.contentEncoding ?? undefined,
      cacheControl: raw.cacheControl ?? undefined,
      expiresAt,
      createdAt,
      updatedAt,
      deletedAt,
      filename: raw.filename ?? metadataDocument.filename,
      originalName: raw.originalName ?? metadataDocument.originalName,
      tags,
      isPublic: visibility === FileVisibility.PUBLIC,
      downloadCount,
      lastAccessedAt,
      compressed: Boolean(raw.compressed ?? metadataDocument.compressed),
    };
  }

  private async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    const document = this.buildMetadataDocument(metadata);
    metadata.metadata = document;

    await this.prisma.file.upsert({
      where: { id: metadata.id },
      create: {
        id: metadata.id,
        key: metadata.key,
        bucket: metadata.bucket,
        provider: metadata.provider,
        url: metadata.url ?? '',
        visibility: metadata.visibility,
        size: BigInt(metadata.size),
        mimeType: metadata.mimeType,
        checksum: metadata.checksum,
        version: metadata.version,
        expiresAt: metadata.expiresAt ?? null,
        metadata: document as Prisma.InputJsonValue,
        tenantId: metadata.tenantId,
        userId: metadata.userId,
        encrypted: metadata.encrypted,
        encryptionAlgorithm: metadata.encryptionAlgorithm,
        contentEncoding: metadata.contentEncoding,
        cacheControl: metadata.cacheControl,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        deletedAt: metadata.deletedAt ?? null,
      },
      update: {
        key: metadata.key,
        bucket: metadata.bucket,
        provider: metadata.provider,
        url: metadata.url ?? '',
        visibility: metadata.visibility,
        size: BigInt(metadata.size),
        mimeType: metadata.mimeType,
        checksum: metadata.checksum,
        version: metadata.version,
        expiresAt: metadata.expiresAt ?? null,
        metadata: document as Prisma.InputJsonValue,
        encrypted: metadata.encrypted,
        encryptionAlgorithm: metadata.encryptionAlgorithm,
        contentEncoding: metadata.contentEncoding,
        cacheControl: metadata.cacheControl,
        updatedAt: metadata.updatedAt,
        deletedAt: metadata.deletedAt ?? null,
      },
    });
  }

  private buildMetadataDocument(metadata: FileMetadata): Record<string, any> {
    const existing = metadata.metadata ? { ...metadata.metadata } : {};

    const normalizedLastAccessed = metadata.lastAccessedAt
      ? metadata.lastAccessedAt.toISOString()
      : typeof existing.lastAccessedAt === 'string'
        ? existing.lastAccessedAt
        : null;

    return {
      ...existing,
      filename: metadata.filename ?? existing.filename,
      originalName: metadata.originalName ?? existing.originalName,
      tags: metadata.tags ?? existing.tags ?? [],
      downloadCount: metadata.downloadCount ?? existing.downloadCount ?? 0,
      lastAccessedAt: normalizedLastAccessed,
      isPublic: metadata.visibility === FileVisibility.PUBLIC,
      compressed: metadata.compressed ?? existing.compressed ?? false,
    };
  }

  private parseMetadataDocument(json: Prisma.JsonValue | null | undefined): Record<string, any> {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return {};
    }
    return { ...(json as Record<string, any>) };
  }

  private mapPrismaToFileMetadata(file: any): FileMetadata {
    const metadataDocument = this.parseMetadataDocument(file.metadata);
    const size = typeof file.size === 'bigint' ? Number(file.size) : Number(file.size ?? 0);
    const provider = this.normalizeProvider(file.provider);
    const visibility =
      (file.visibility as FileVisibilityType | null | undefined) ?? FileVisibility.PRIVATE;
    const downloadCount = typeof metadataDocument.downloadCount === 'number'
      ? metadataDocument.downloadCount
      : 0;
    const lastAccessedAt = metadataDocument.lastAccessedAt
      ? new Date(metadataDocument.lastAccessedAt)
      : null;
    const tags = Array.isArray(metadataDocument.tags) ? metadataDocument.tags : [];
    const filename = metadataDocument.filename ?? metadataDocument.originalName ?? file.key;
    const originalName = metadataDocument.originalName ?? filename;

    return {
      id: file.id,
      tenantId: file.tenantId,
      userId: file.userId,
      key: file.key,
      path: file.key,
      bucket: file.bucket,
      provider,
      url: file.url,
      visibility,
      size,
      mimeType: file.mimeType,
      checksum: file.checksum,
      version: file.version,
      metadata: metadataDocument,
      encrypted: file.encrypted,
      encryptionAlgorithm: file.encryptionAlgorithm ?? undefined,
      contentEncoding: file.contentEncoding ?? undefined,
      cacheControl: file.cacheControl ?? undefined,
      expiresAt: file.expiresAt ?? undefined,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt ?? undefined,
      filename,
      originalName,
      tags,
      isPublic: visibility === FileVisibility.PUBLIC,
      downloadCount,
      lastAccessedAt,
      compressed: Boolean(metadataDocument.compressed),
    };
  }

  private async validateFileAccess(metadata: FileMetadata, options: DownloadOptions): Promise<void> {
    if (metadata.tenantId !== options.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (metadata.expiresAt && metadata.expiresAt < new Date()) {
      throw new ForbiddenException('File has expired');
    }
  }

  private async generatePresignedUrl(metadata: FileMetadata, expiresIn: number): Promise<string> {
    switch (metadata.provider) {
      case 'aws-s3':
      case 'aws':
        return this.s3Client.getSignedUrl('getObject', {
          Bucket: metadata.bucket,
          Key: metadata.key,
          Expires: expiresIn,
        });

      case 'minio':
        return this.minioClient.presignedGetObject(metadata.bucket, metadata.key, expiresIn);

      default:
        throw new BadRequestException(`Presigned URLs not supported for provider: ${metadata.provider}`);
    }
  }

  private async generatePublicUrl(metadata: FileMetadata): Promise<string> {
    // Generate public URL based on provider
    switch (metadata.provider) {
      case 'aws-s3':
      case 'aws':
        return `https://${metadata.bucket}.s3.amazonaws.com/${metadata.key}`;

      case 'azure-blob':
      case 'azure':
        if (!this.azureBlobClient) {
          throw new BadRequestException('Azure Blob Storage is not configured');
        }
        return this.azureBlobClient
          .getContainerClient(metadata.bucket)
          .getBlockBlobClient(metadata.key)
          .url;

      case 'gcp-storage':
      case 'gcp':
        if (!this.gcpStorage) {
          throw new BadRequestException('Google Cloud Storage is not configured');
        }
        return this.gcpStorage.bucket(metadata.bucket).file(metadata.key).publicUrl();

      case 'minio':
        {
          const minioEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost:9000');
          const protocol = this.configService.get('MINIO_USE_SSL', 'false') === 'true' ? 'https' : 'http';
          return `${protocol}://${minioEndpoint}/${metadata.bucket}/${metadata.key}`;
        }

      case 'local':
        {
          const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3001');
          return `${baseUrl}/api/v1/storage/public/${metadata.id}`;
        }

      default:
        return metadata.url || '';
    }
  }

  private async trackDownload(fileId: string, userId: string | undefined): Promise<void> {
    const now = new Date();
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { metadata: true, userId: true },
    });

    const metadataDocument = this.parseMetadataDocument(file?.metadata ?? null);
    const currentCount = typeof metadataDocument.downloadCount === 'number'
      ? metadataDocument.downloadCount
      : 0;

    metadataDocument.downloadCount = currentCount + 1;
    metadataDocument.lastAccessedAt = now.toISOString();

    await this.prisma.file.update({
      where: { id: fileId },
      data: {
        metadata: metadataDocument as Prisma.InputJsonValue,
        updatedAt: now,
      },
    });

    await this.prisma.fileDownloadLog.create({
      data: {
        fileId,
        userId: userId ?? file?.userId ?? 'system',
        downloadedAt: now,
        ipAddress: '',
        userAgent: '',
      },
    });
  }

  private async getStorageUsed(tenantId: string): Promise<number> {
    const result = await this.prisma.file.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { size: true },
    });
    return Number(result._sum.size) || 0;
  }

  private async getStorageLimit(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { storageLimit: true },
    });
    return Number(tenant?.storageLimit) || 10 * 1024 * 1024 * 1024; // 10GB default
  }

  private getVersionedPath(originalPath: string, version: number): string {
    const ext = path.extname(originalPath);
    const pathWithoutExt = originalPath.replace(ext, '');
    return `${pathWithoutExt}_v${version}${ext}`;
  }

  private async hashPassword(password: string): Promise<string> {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      // For local filesystem
      if (this.defaultProvider === StorageProvider.LOCAL) {
        const fs = await import('fs/promises');
        await fs.rename(sourcePath, destinationPath);
        return;
      }

      // For cloud providers, we need to copy and delete
      // This is a simplified implementation
      const sourceMetadata = await this.getFileMetadataByPath(sourcePath);
      if (!sourceMetadata) {
        throw new NotFoundException('Source file not found');
      }

      // Download source file
      const { stream } = await this.downloadFile(sourceMetadata.id, {
        tenantId: sourceMetadata.tenantId,
        userId: sourceMetadata.userId,
      });

      // Upload to destination
      const buffer = await this.streamToBuffer(stream);
      await this.uploadToProvider(
        buffer,
        destinationPath,
        {
          tenantId: sourceMetadata.tenantId,
          userId: sourceMetadata.userId,
        },
        sourceMetadata.provider,
        sourceMetadata.bucket,
      );

      // Delete source
      await this.deleteFromProvider(sourceMetadata);

      this.logger.log(`File moved from ${sourcePath} to ${destinationPath}`);
    } catch (error) {
      this.logger.error(`Error moving file from ${sourcePath} to ${destinationPath}:`, error);
      throw error;
    }
  }

  private async getFileMetadataByPath(path: string): Promise<FileMetadata | null> {
    try {
      const file = await this.prisma.file.findFirst({
        where: { key: path, deletedAt: null },
      });
      return file ? this.mapPrismaToFileMetadata(file) : null;
    } catch (error) {
      this.logger.error('Error getting file metadata by path:', error);
      return null;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async queryFiles(queryDto: any): Promise<any> {
    try {
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;

      const baseWhere: Prisma.FileWhereInput = {
        tenantId: queryDto.tenantId,
        deletedAt: { equals: null },
      };
      const additional: Prisma.FileWhereInput[] = [];

      if (queryDto.mimeType) {
        additional.push({ mimeType: queryDto.mimeType });
      }

      if (queryDto.filename) {
        additional.push({
          OR: [
            { metadata: { path: ['filename'], string_contains: queryDto.filename } },
            { metadata: { path: ['originalName'], string_contains: queryDto.filename } },
            { key: { contains: queryDto.filename, mode: 'insensitive' } },
          ],
        });
      }

      if (queryDto.tags && queryDto.tags.length > 0) {
        additional.push({
          metadata: {
            path: ['tags'],
            array_contains: queryDto.tags,
          },
        });
      }

      const where: Prisma.FileWhereInput = additional.length
        ? { ...baseWhere, AND: additional }
        : baseWhere;

      const files = await this.prisma.file.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await this.prisma.file.count({ where });

      return {
        data: files.map((file) => this.mapPrismaToFileMetadata(file)),
        pagination: {
          page,
          limit,
          total,
          hasMore: total > page * limit,
        },
      };
    } catch (error) {
      this.logger.error('Error querying files:', error);
      throw error;
    }
  }

  async getFile(fileId: string, tenantId: string): Promise<FileMetadata> {
    try {
      const file = await this.prisma.file.findFirst({
        where: { 
          id: fileId, 
          tenantId,
          deletedAt: null 
        },
      });

      if (!file) {
        throw new Error('File not found');
      }

      return this.mapPrismaToFileMetadata(file);
    } catch (error) {
      this.logger.error('Error getting file:', error);
      throw error;
    }
  }

  async deleteFile(
    fileId: string,
    tenantId: string,
    userOrPermanent?: string | boolean,
    maybePermanent?: boolean,
  ): Promise<void> {
    try {
      let requestedBy: string | undefined;
      let permanent = false;

      if (typeof userOrPermanent === 'string') {
        requestedBy = userOrPermanent;
        permanent = Boolean(maybePermanent);
      } else if (typeof userOrPermanent === 'boolean') {
        permanent = userOrPermanent;
      }

      const metadata = await this.getFileMetadata(fileId);
      if (!metadata || metadata.tenantId !== tenantId) {
        throw new NotFoundException('File not found');
      }

      if (permanent) {
        await this.deleteFromProvider(metadata);

        const thumbnailPath = metadata.metadata?.thumbnailPath as string | undefined;
        if (thumbnailPath) {
        await this.deleteFromProvider({ ...metadata, key: thumbnailPath, path: thumbnailPath });
        }

        await this.prisma.file.delete({ where: { id: fileId } });
      } else {
        await this.prisma.file.update({
          where: { id: fileId },
          data: { deletedAt: new Date() },
        });
      }

      await this.redis.del(`file:${metadata.id}`);
      if (metadata.id !== fileId) {
        await this.redis.del(`file:${fileId}`);
      }

      this.logger.log(
        `File ${fileId} ${permanent ? 'permanently ' : ''}deleted${requestedBy ? ` by ${requestedBy}` : ''}`,
      );
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  async getFileStats(tenantId?: string): Promise<any> {
    try {
      const where: Prisma.FileWhereInput = {
        deletedAt: { equals: null },
        ...(tenantId ? { tenantId } : {}),
      };

      const [totalFiles, sizeAggregate, providerGroups, visibilityGroups, mimeGroups, largestFile, lastUpload] = await Promise.all([
        this.prisma.file.count({ where }),
        this.prisma.file.aggregate({ where, _sum: { size: true } }),
        this.prisma.file.groupBy({ by: ['provider'], where, _sum: { size: true }, _count: { _all: true } }),
        this.prisma.file.groupBy({ by: ['visibility'], where, _count: { _all: true } }),
        this.prisma.file.groupBy({ by: ['mimeType'], where, _count: { _all: true } }),
        this.prisma.file.findFirst({ where, orderBy: { size: 'desc' } }),
        this.prisma.file.findFirst({ where, orderBy: { createdAt: 'desc' } }),
      ]);

      const totalSize = Number(sizeAggregate._sum.size ?? 0);
      const storageByProvider = providerGroups.reduce<Record<string, number>>((acc, group) => {
        acc[group.provider] = Number(group._sum.size ?? 0);
        return acc;
      }, {});

      const filesByVisibility = visibilityGroups.reduce<Record<string, number>>((acc, group) => {
        acc[group.visibility] = typeof group._count === 'object' ? group._count._all ?? 0 : group._count;
        return acc;
      }, {});

      const filesByMimeType = mimeGroups.reduce<Record<string, number>>((acc, group) => {
        const count = typeof group._count === 'object' ? group._count._all ?? 0 : group._count;
        acc[group.mimeType] = count;
        return acc;
      }, {});

      return {
        totalFiles,
        totalSize,
        storageByProvider,
        filesByVisibility,
        filesByMimeType,
        averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
        largestFileSize: largestFile ? Number(largestFile.size) : 0,
        lastUploadAt: lastUpload?.createdAt ?? null,
      };
    } catch (error) {
      this.logger.error('Error getting file stats:', error);
      throw error;
    }
  }
}
