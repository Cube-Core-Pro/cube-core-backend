// path: backend/src/modules/collaboration/services/file-sharing.service.ts
// purpose: Enterprise file sharing service for collaborative workspaces
// dependencies: @nestjs/common, prisma, file-storage, virus-scanner

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as crypto from 'crypto';
import * as path from 'path';

export interface SharedFile {
  id: string;
  name: string;
  originalName: string;
  description?: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploaderName: string;
  workspaceId: string;
  folderId?: string;
  folderPath?: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  downloadCount: number;
  permissions: FilePermissions;
  metadata: FileMetadata;
  versions: FileVersion[];
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilePermissions {
  isPublic: boolean;
  allowAnonymous: boolean;
  canView: string[];
  canDownload: string[];
  canEdit: string[];
  canDelete: string[];
  shareSettings: ShareSettings;
}

export interface ShareSettings {
  allowSharing: boolean;
  requirePassword: boolean;
  password?: string;
  expiresAt?: Date;
  maxDownloads?: number;
  trackDownloads: boolean;
  watermark?: WatermarkSettings;
}

export interface WatermarkSettings {
  enabled: boolean;
  text?: string;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface FileMetadata {
  virusScanResult?: 'clean' | 'infected' | 'pending';
  virusScanAt?: Date;
  checksums: {
    md5: string;
    sha256: string;
  };
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for audio/video files
  encoding?: string;
  compression?: string;
  pages?: number; // for documents
  isEncrypted: boolean;
  encryptionKey?: string;
}

export interface FileVersion {
  id: string;
  version: number;
  name: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  changeNote?: string;
  checksums: {
    md5: string;
    sha256: string;
  };
}

export interface FileFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  workspaceId: string;
  permissions: FolderPermissions;
  statistics: FolderStatistics;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderPermissions {
  inheritFromParent: boolean;
  canView: string[];
  canUpload: string[];
  canCreateSubfolders: string[];
  canManage: string[];
}

export interface FolderStatistics {
  fileCount: number;
  totalSize: number;
  lastActivity: Date;
  topFileTypes: Array<{
    mimeType: string;
    count: number;
    totalSize: number;
  }>;
}

export interface ShareLink {
  id: string;
  fileId: string;
  fileName: string;
  token: string;
  url: string;
  createdBy: string;
  password?: string;
  expiresAt?: Date;
  maxDownloads?: number;
  downloadCount: number;
  trackDownloads: boolean;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt?: Date;
}

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: string[];
  uploadedSize: number;
  progress: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  uploadedBy: string;
  workspaceId: string;
  folderId?: string;
  expiresAt: Date;
  createdAt: Date;
}

@Injectable()
export class FileSharingService {
  private readonly logger = new Logger(FileSharingService.name);
  private readonly maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
  private readonly allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/avi',
    'video/x-msvideo',
    
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async uploadFile(
    userId: string,
    tenantId: string,
    fileData: {
      fileName: string;
      fileBuffer: Buffer;
      mimeType: string;
      folderId?: string;
      description?: string;
      tags?: string[];
      permissions?: Partial<FilePermissions>;
    }
  ): Promise<SharedFile> {
    try {
      // Validate file
      if (!this.allowedMimeTypes.includes(fileData.mimeType)) {
        throw new BadRequestException(`File type not allowed: ${fileData.mimeType}`);
      }

      if (fileData.fileBuffer.length > this.maxFileSize) {
        throw new BadRequestException(`File too large: ${fileData.fileBuffer.length} bytes (max: ${this.maxFileSize})`);
      }

      // Check folder permissions if specified
      if (fileData.folderId) {
        const canUpload = await this.checkFolderPermission(fileData.folderId, userId, 'upload');
        if (!canUpload) {
          throw new ForbiddenException('No permission to upload to this folder');
        }
      }

      // Generate file ID and paths
      const fileId = `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const sanitizedName = this.sanitizeFileName(fileData.fileName);
      const storagePath = this.generateStoragePath(tenantId, fileId, sanitizedName);

      // Calculate checksums
      const md5Hash = crypto.createHash('md5').update(fileData.fileBuffer).digest('hex');
      const sha256Hash = crypto.createHash('sha256').update(fileData.fileBuffer).digest('hex');

      // Check for duplicate files (by checksum)
      const existingFile = await this.prisma.sharedFile.findFirst({
        where: {
          tenantId,
          metadata: {
            path: ['checksums', 'sha256'],
            equals: sha256Hash,
          },
          isDeleted: false,
        },
      });

      if (existingFile && !fileData.folderId) {
        throw new BadRequestException('File with identical content already exists');
      }

      // Scan for viruses (placeholder - would integrate with actual antivirus)
      const virusScanResult = await this.scanFileForViruses(fileData.fileBuffer);

      if (virusScanResult === 'infected') {
        throw new BadRequestException('File rejected: contains malicious content');
      }

      // Extract file metadata
      const metadata: FileMetadata = {
        virusScanResult,
        virusScanAt: new Date(),
        checksums: {
          md5: md5Hash,
          sha256: sha256Hash,
        },
        isEncrypted: false,
        ...await this.extractFileMetadata(fileData.fileBuffer, fileData.mimeType),
      };

      // Store file in storage system (S3, local, etc.)
      const fileUrl = await this.storeFile(storagePath, fileData.fileBuffer);
      
      // Generate thumbnail if image/video
      let thumbnailUrl: string | undefined;
      let previewUrl: string | undefined;

      if (this.isImageFile(fileData.mimeType)) {
        thumbnailUrl = await this.generateImageThumbnail(fileData.fileBuffer, storagePath);
        previewUrl = fileUrl; // Images can be previewed directly
      } else if (this.isVideoFile(fileData.mimeType)) {
        thumbnailUrl = await this.generateVideoThumbnail(fileData.fileBuffer, storagePath);
      } else if (this.isDocumentFile(fileData.mimeType)) {
        previewUrl = await this.generateDocumentPreview(fileData.fileBuffer, storagePath);
      }

      // Get folder info if applicable
      let folderPath: string | undefined;
      if (fileData.folderId) {
        const folder = await this.getFolder(fileData.folderId, userId, tenantId);
        folderPath = folder?.path;
      }

      // Get uploader info
      const uploader = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      // Create file record
      const sharedFile: SharedFile = {
        id: fileId,
        name: sanitizedName,
        originalName: fileData.fileName,
        description: fileData.description,
        mimeType: fileData.mimeType,
        size: fileData.fileBuffer.length,
        uploadedBy: userId,
        uploaderName: uploader?.name || 'Unknown User',
        workspaceId: tenantId,
        folderId: fileData.folderId,
        folderPath,
        url: fileUrl,
        thumbnailUrl,
        previewUrl,
        downloadCount: 0,
        permissions: {
          isPublic: false,
          allowAnonymous: false,
          canView: [userId],
          canDownload: [userId],
          canEdit: [userId],
          canDelete: [userId],
          shareSettings: {
            allowSharing: true,
            requirePassword: false,
            trackDownloads: true,
          },
          ...fileData.permissions,
        },
        metadata,
        versions: [{
          id: `${fileId}_v1`,
          version: 1,
          name: sanitizedName,
          size: fileData.fileBuffer.length,
          url: fileUrl,
          uploadedBy: userId,
          uploadedAt: new Date(),
          changeNote: 'Initial upload',
          checksums: {
            md5: md5Hash,
            sha256: sha256Hash,
          },
        }],
        tags: fileData.tags || [],
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.prisma.sharedFile.create({
        data: {
          id: fileId,
          name: sharedFile.name,
          originalName: sharedFile.originalName,
          description: sharedFile.description,
          mimeType: sharedFile.mimeType,
          size: sharedFile.size,
          uploadedBy: userId,
          workspaceId: tenantId,
          folderId: fileData.folderId,
          folderPath,
          url: fileUrl,
          thumbnailUrl,
          previewUrl,
          downloadCount: 0,
          permissions: sharedFile.permissions,
          metadata: sharedFile.metadata,
          versions: sharedFile.versions,
          tags: sharedFile.tags,
          tenantId,
          createdAt: sharedFile.createdAt,
        },
      });

      // Update folder statistics
      if (fileData.folderId) {
        await this.updateFolderStatistics(fileData.folderId);
      }

      // Cache file info
      await this.redis.setex(`file:${fileId}`, 3600, JSON.stringify(sharedFile));

      // Log activity
      await this.logFileActivity(tenantId, userId, 'upload', fileId, sharedFile.name);

      this.logger.log(`File uploaded: ${fileId} (${sharedFile.name}) by ${userId}`);
      return sharedFile;
    } catch (error) {
      this.logger.error('Error uploading file', error);
      throw error;
    }
  }

  async createUploadSession(
    userId: string,
    tenantId: string,
    sessionData: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      chunkSize?: number;
      folderId?: string;
    }
  ): Promise<UploadSession> {
    try {
      // Validate file
      if (!this.allowedMimeTypes.includes(sessionData.mimeType)) {
        throw new BadRequestException(`File type not allowed: ${sessionData.mimeType}`);
      }

      if (sessionData.fileSize > this.maxFileSize) {
        throw new BadRequestException(`File too large: ${sessionData.fileSize} bytes`);
      }

      const chunkSize = sessionData.chunkSize || 5 * 1024 * 1024; // Default 5MB chunks
      const totalChunks = Math.ceil(sessionData.fileSize / chunkSize);

      const sessionId = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      const uploadSession: UploadSession = {
        id: sessionId,
        fileName: sessionData.fileName,
        fileSize: sessionData.fileSize,
        mimeType: sessionData.mimeType,
        chunkSize,
        totalChunks,
        uploadedChunks: [],
        uploadedSize: 0,
        progress: 0,
        status: 'active',
        uploadedBy: userId,
        workspaceId: tenantId,
        folderId: sessionData.folderId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
      };

      // Store session in Redis
      await this.redis.setex(
        `upload_session:${sessionId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(uploadSession)
      );

      this.logger.log(`Upload session created: ${sessionId} for ${sessionData.fileName}`);
      return uploadSession;
    } catch (error) {
      this.logger.error('Error creating upload session', error);
      throw error;
    }
  }

  async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunkData: Buffer,
    userId: string,
    tenantId: string
  ): Promise<{ session: UploadSession; isComplete: boolean }> {
    try {
      // Get session
      const sessionData = await this.redis.get(`upload_session:${sessionId}`);
      if (!sessionData) {
        throw new NotFoundException('Upload session not found or expired');
      }

      const session = JSON.parse(sessionData) as UploadSession;

      // Validate user
      if (session.uploadedBy !== userId || session.workspaceId !== tenantId) {
        throw new ForbiddenException('No access to this upload session');
      }

      // Validate chunk
      if (chunkIndex >= session.totalChunks) {
        throw new BadRequestException(`Invalid chunk index: ${chunkIndex}`);
      }

      if (session.uploadedChunks.includes(chunkIndex.toString())) {
        throw new BadRequestException(`Chunk ${chunkIndex} already uploaded`);
      }

      // Store chunk
      const chunkPath = `chunks/${sessionId}/${chunkIndex}`;
      await this.storeFile(chunkPath, chunkData);

      // Update session
      session.uploadedChunks.push(chunkIndex.toString());
      session.uploadedSize += chunkData.length;
      session.progress = Math.round((session.uploadedChunks.length / session.totalChunks) * 100);

      // Check if upload is complete
      const isComplete = session.uploadedChunks.length === session.totalChunks;

      if (isComplete) {
        session.status = 'completed';
        
        // Assemble file from chunks
        const completeFile = await this.assembleChunks(sessionId, session);
        
        // Upload as complete file
        await this.uploadFile(userId, tenantId, {
          fileName: session.fileName,
          fileBuffer: completeFile,
          mimeType: session.mimeType,
          folderId: session.folderId,
        });

        // Cleanup chunks
        await this.cleanupChunks(sessionId);
        
        // Remove session
        await this.redis.del(`upload_session:${sessionId}`);
      } else {
        // Update session in Redis
        await this.redis.setex(
          `upload_session:${sessionId}`,
          24 * 60 * 60,
          JSON.stringify(session)
        );
      }

      return { session, isComplete };
    } catch (error) {
      this.logger.error('Error uploading chunk', error);
      throw error;
    }
  }

  async createShareLink(
    fileId: string,
    userId: string,
    tenantId: string,
    linkOptions: {
      password?: string;
      expiresAt?: Date;
      maxDownloads?: number;
      trackDownloads?: boolean;
    } = {}
  ): Promise<ShareLink> {
    try {
      // Get file and check permissions
      const file = await this.getFile(fileId, userId, tenantId);
      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (!file.permissions.shareSettings.allowSharing) {
        throw new BadRequestException('Sharing not allowed for this file');
      }

      // Check if user can share
      if (!file.permissions.canView.includes(userId) && !file.permissions.isPublic) {
        throw new ForbiddenException('No permission to share this file');
      }

      const linkId = crypto.randomBytes(16).toString('hex');
      const token = crypto.randomBytes(32).toString('hex');

      const shareLink: ShareLink = {
        id: linkId,
        fileId,
        fileName: file.name,
        token,
        url: `${process.env.BASE_URL || 'https://app.example.com'}/share/${token}`,
        createdBy: userId,
        password: linkOptions.password,
        expiresAt: linkOptions.expiresAt,
        maxDownloads: linkOptions.maxDownloads,
        downloadCount: 0,
        trackDownloads: linkOptions.trackDownloads ?? true,
        isActive: true,
        createdAt: new Date(),
      };

      // Store in database
      await this.prisma.shareLink.create({
        data: {
          id: linkId,
          fileId,
          token,
          createdBy: userId,
          password: shareLink.password,
          expiresAt: shareLink.expiresAt,
          maxDownloads: shareLink.maxDownloads,
          downloadCount: 0,
          trackDownloads: shareLink.trackDownloads,
          isActive: true,
          tenantId,
          createdAt: shareLink.createdAt,
        },
      });

      // Cache link
      await this.redis.setex(`share_link:${token}`, 3600, JSON.stringify(shareLink));

      // Log activity
      await this.logFileActivity(tenantId, userId, 'share', fileId, file.name);

      this.logger.log(`Share link created: ${linkId} for file ${fileId}`);
      return shareLink;
    } catch (error) {
      this.logger.error('Error creating share link', error);
      throw error;
    }
  }

  async downloadFile(
    fileId: string,
    userId: string,
    tenantId: string,
    options: {
      version?: number;
      password?: string;
    } = {}
  ): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string }> {
    try {
      // Get file and check permissions
      const file = await this.getFile(fileId, userId, tenantId);
      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (!file.permissions.canDownload.includes(userId) && !file.permissions.isPublic) {
        throw new ForbiddenException('No permission to download this file');
      }

      // Get specific version or latest
      const version = options.version 
        ? file.versions.find(v => v.version === options.version)
        : file.versions[file.versions.length - 1];

      if (!version) {
        throw new NotFoundException('File version not found');
      }

      // Download file from storage
      const fileBuffer = await this.downloadFromStorage(version.url);

      // Update download count
      await this.incrementDownloadCount(fileId);

      // Log download activity
      await this.logFileActivity(tenantId, userId, 'download', fileId, file.name);

      return {
        fileBuffer,
        fileName: file.name,
        mimeType: file.mimeType,
      };
    } catch (error) {
      this.logger.error('Error downloading file', error);
      throw error;
    }
  }

  async downloadViaShareLink(
    token: string,
    password?: string
  ): Promise<{ fileBuffer: Buffer; fileName: string; mimeType: string }> {
    try {
      // Get share link
      const shareLink = await this.getShareLinkByToken(token);
      if (!shareLink) {
        throw new NotFoundException('Share link not found or expired');
      }

      // Check if link is active
      if (!shareLink.isActive) {
        throw new BadRequestException('Share link is no longer active');
      }

      // Check expiration
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        throw new BadRequestException('Share link has expired');
      }

      // Check download limit
      if (shareLink.maxDownloads && shareLink.downloadCount >= shareLink.maxDownloads) {
        throw new BadRequestException('Download limit exceeded');
      }

      // Check password if required
      if (shareLink.password && shareLink.password !== password) {
        throw new BadRequestException('Incorrect password');
      }

      // Get file
      const file = await this.prisma.sharedFile.findUnique({
        where: { id: shareLink.fileId },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Download file
      const latestVersion = (file.versions as FileVersion[])[file.versions.length - 1];
      const fileBuffer = await this.downloadFromStorage(latestVersion.url);

      // Update download count
      shareLink.downloadCount++;
      shareLink.lastAccessedAt = new Date();

      await this.prisma.shareLink.update({
        where: { id: shareLink.id },
        data: {
          downloadCount: shareLink.downloadCount,
          lastAccessedAt: shareLink.lastAccessedAt,
        },
      });

      // Update cache
      await this.redis.setex(`share_link:${token}`, 3600, JSON.stringify(shareLink));

      return {
        fileBuffer,
        fileName: file.name,
        mimeType: file.mimeType,
      };
    } catch (error) {
      this.logger.error('Error downloading via share link', error);
      throw error;
    }
  }

  async getUserFiles(
    userId: string,
    tenantId: string,
    options: {
      folderId?: string;
      search?: string;
      mimeType?: string;
      tags?: string[];
      sortBy?: 'name' | 'size' | 'createdAt' | 'downloadCount';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: SharedFile[]; total: number }> {
    try {
      const where = {
        tenantId,
        isDeleted: false,
        ...(options.folderId && { folderId: options.folderId }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
            { tags: { hasSome: [options.search] } },
          ],
        }),
        ...(options.mimeType && { mimeType: options.mimeType }),
        ...(options.tags && options.tags.length > 0 && {
          tags: { hasEvery: options.tags },
        }),
        // Filter by permission
        OR: [
          { uploadedBy: userId },
          { permissions: { path: ['canView'], array_contains: [userId] } },
          { permissions: { path: ['isPublic'], equals: true } },
        ],
      };

      const orderBy = this.buildFileOrderBy(options.sortBy, options.sortOrder);

      const [files, total] = await Promise.all([
        this.prisma.sharedFile.findMany({
          where,
          orderBy,
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.sharedFile.count({ where }),
      ]);

      return {
        files: files.map(f => this.formatSharedFile(f)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting user files', error);
      return { files: [], total: 0 };
    }
  }

  private async scanFileForViruses(fileBuffer: Buffer): Promise<'clean' | 'infected' | 'pending'> {
    try {
      // Placeholder for actual virus scanning integration
      // Would integrate with ClamAV, VirusTotal API, or similar
      
      // Simple check for common malicious patterns
      const content = fileBuffer.toString('hex').toLowerCase();
      const maliciousPatterns = [
        '4d5a90', // PE executable header
        '504b0304', // ZIP file (could contain malware)
      ];

      for (const pattern of maliciousPatterns) {
        if (content.includes(pattern)) {
          // In production, this would trigger deeper analysis
          this.logger.warn(`Potentially suspicious file pattern detected: ${pattern}`);
        }
      }

      return 'clean';
    } catch (error) {
      this.logger.error('Error scanning file for viruses', error);
      return 'pending';
    }
  }

  private async extractFileMetadata(fileBuffer: Buffer, mimeType: string): Promise<Partial<FileMetadata>> {
    const metadata: Partial<FileMetadata> = {};

    try {
      if (this.isImageFile(mimeType)) {
        // Extract image dimensions (placeholder)
        metadata.dimensions = { width: 1920, height: 1080 };
      } else if (this.isVideoFile(mimeType)) {
        // Extract video metadata (placeholder)
        metadata.duration = 120; // seconds
        metadata.dimensions = { width: 1920, height: 1080 };
      } else if (this.isDocumentFile(mimeType)) {
        // Extract document metadata (placeholder)
        metadata.pages = 10;
      }

      return metadata;
    } catch (error) {
      this.logger.warn('Error extracting file metadata', error);
      return metadata;
    }
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  private generateStoragePath(tenantId: string, fileId: string, fileName: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `${tenantId}/${year}/${month}/${fileId}/${fileName}`;
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  private isDocumentFile(mimeType: string): boolean {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(mimeType);
  }

  private async storeFile(path: string, buffer: Buffer): Promise<string> {
    // Placeholder for actual storage implementation
    // Would integrate with AWS S3, Google Cloud Storage, local filesystem, etc.
    return `https://storage.example.com/${path}`;
  }

  private async downloadFromStorage(url: string): Promise<Buffer> {
    // Placeholder for actual download implementation
    // Would download from the actual storage system
    return Buffer.from('placeholder file content');
  }

  private async generateImageThumbnail(buffer: Buffer, path: string): Promise<string> {
    // Placeholder for image processing
    // Would use Sharp, ImageMagick, or similar
    return `https://storage.example.com/${path}_thumb.jpg`;
  }

  private async generateVideoThumbnail(buffer: Buffer, path: string): Promise<string> {
    // Placeholder for video processing
    // Would use FFmpeg or similar
    return `https://storage.example.com/${path}_thumb.jpg`;
  }

  private async generateDocumentPreview(buffer: Buffer, path: string): Promise<string> {
    // Placeholder for document processing
    // Would use LibreOffice, Pandoc, or similar
    return `https://storage.example.com/${path}_preview.html`;
  }

  private async assembleChunks(sessionId: string, session: UploadSession): Promise<Buffer> {
    // Placeholder for chunk assembly
    // Would read and concatenate all chunks in order
    return Buffer.from('assembled file content');
  }

  private async cleanupChunks(sessionId: string): Promise<void> {
    // Cleanup chunk files from storage
    this.logger.debug(`Cleaning up chunks for session ${sessionId}`);
  }

  private async getFile(fileId: string, userId: string, tenantId: string): Promise<SharedFile | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`file:${fileId}`);
      if (cached) {
        return JSON.parse(cached) as SharedFile;
      }

      // Fall back to database
      const file = await this.prisma.sharedFile.findFirst({
        where: { id: fileId, tenantId, isDeleted: false },
      });

      return file ? this.formatSharedFile(file) : null;
    } catch (error) {
      this.logger.error('Error getting file', error);
      return null;
    }
  }

  private async getFolder(folderId: string, userId: string, tenantId: string): Promise<FileFolder | null> {
    try {
      const folder = await this.prisma.fileFolder.findFirst({
        where: { id: folderId, tenantId },
      });

      return folder ? this.formatFileFolder(folder) : null;
    } catch (error) {
      this.logger.error('Error getting folder', error);
      return null;
    }
  }

  private async getShareLinkByToken(token: string): Promise<ShareLink | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`share_link:${token}`);
      if (cached) {
        return JSON.parse(cached) as ShareLink;
      }

      // Fall back to database
      const link = await this.prisma.shareLink.findUnique({
        where: { token },
      });

      return link ? this.formatShareLink(link) : null;
    } catch (error) {
      this.logger.error('Error getting share link', error);
      return null;
    }
  }

  private async checkFolderPermission(
    folderId: string,
    userId: string,
    action: 'view' | 'upload' | 'manage'
  ): Promise<boolean> {
    try {
      const folder = await this.getFolder(folderId, userId, '');
      if (!folder) return false;

      switch (action) {
        case 'view':
          return folder.permissions.canView.includes(userId);
        case 'upload':
          return folder.permissions.canUpload.includes(userId);
        case 'manage':
          return folder.permissions.canManage.includes(userId);
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Error checking folder permission', error);
      return false;
    }
  }

  private async incrementDownloadCount(fileId: string): Promise<void> {
    try {
      await this.prisma.sharedFile.update({
        where: { id: fileId },
        data: { downloadCount: { increment: 1 } },
      });
    } catch (error) {
      this.logger.warn('Failed to increment download count', error);
    }
  }

  private async updateFolderStatistics(folderId: string): Promise<void> {
    try {
      const stats = await this.prisma.sharedFile.aggregate({
        where: { folderId, isDeleted: false },
        _count: { id: true },
        _sum: { size: true },
      });

      await this.prisma.fileFolder.update({
        where: { id: folderId },
        data: {
          statistics: {
            fileCount: stats._count.id || 0,
            totalSize: stats._sum.size || 0,
            lastActivity: new Date(),
          },
        },
      });
    } catch (error) {
      this.logger.warn('Failed to update folder statistics', error);
    }
  }

  private buildFileOrderBy(sortBy?: string, sortOrder?: string): any {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'size':
        return { size: order };
      case 'createdAt':
        return { createdAt: order };
      case 'downloadCount':
        return { downloadCount: order };
      default:
        return { createdAt: 'desc' };
    }
  }

  private formatSharedFile(file: any): SharedFile {
    return {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      description: file.description,
      mimeType: file.mimeType,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploaderName: file.uploaderName || 'Unknown User',
      workspaceId: file.workspaceId,
      folderId: file.folderId,
      folderPath: file.folderPath,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      previewUrl: file.previewUrl,
      downloadCount: file.downloadCount,
      permissions: file.permissions as FilePermissions,
      metadata: file.metadata as FileMetadata,
      versions: file.versions as FileVersion[],
      tags: file.tags || [],
      isArchived: file.isArchived || false,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private formatFileFolder(folder: any): FileFolder {
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      path: folder.path,
      workspaceId: folder.workspaceId,
      permissions: folder.permissions as FolderPermissions,
      statistics: folder.statistics as FolderStatistics,
      createdBy: folder.createdBy,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }

  private formatShareLink(link: any): ShareLink {
    return {
      id: link.id,
      fileId: link.fileId,
      fileName: link.fileName || '',
      token: link.token,
      url: `${process.env.BASE_URL || 'https://app.example.com'}/share/${link.token}`,
      createdBy: link.createdBy,
      password: link.password,
      expiresAt: link.expiresAt,
      maxDownloads: link.maxDownloads,
      downloadCount: link.downloadCount,
      trackDownloads: link.trackDownloads,
      isActive: link.isActive,
      createdAt: link.createdAt,
      lastAccessedAt: link.lastAccessedAt,
    };
  }

  private async logFileActivity(
    tenantId: string,
    userId: string,
    action: string,
    fileId: string,
    fileName: string
  ): Promise<void> {
    try {
      const activity = {
        tenantId,
        userId,
        action,
        resourceType: 'file',
        resourceId: fileId,
        resourceName: fileName,
        timestamp: new Date(),
      };

      await this.redis.lpush(`activity:files:${tenantId}`, JSON.stringify(activity));
      await this.redis.ltrim(`activity:files:${tenantId}`, 0, 100);
    } catch (error) {
      this.logger.warn('Failed to log file activity', error);
    }
  }
}