// path: backend/src/modules/webmail/services/attachment.service.ts
// purpose: Email attachment management service with Fortune500 security and compliance
// dependencies: @nestjs/common, prisma, file upload, virus scanning, storage

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailAttachment } from '../webmail.service';

export interface AttachmentMetadata {
  id: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  uploadedBy: string;
  emailId?: string;
  isSecure: boolean;
  scanResults: AttachmentScanResults;
  downloadCount: number;
  lastDownloaded?: Date;
  expiresAt?: Date;
  isEncrypted: boolean;
  encryptionKey?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  tags: string[];
  permissions: AttachmentPermissions;
}

export interface AttachmentScanResults {
  scannedAt: Date;
  scanEngine: string;
  isClean: boolean;
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  quarantined: boolean;
}

export interface AttachmentPermissions {
  canDownload: string[];
  canPreview: string[];
  canDelete: string[];
  isPublic: boolean;
  requiresAuthentication: boolean;
}

export interface UploadOptions {
  encrypt?: boolean;
  expiresIn?: number; // hours
  allowedUsers?: string[];
  tags?: string[];
  generateThumbnail?: boolean;
  generatePreview?: boolean;
}

export interface AttachmentStats {
  totalAttachments: number;
  totalSize: number;
  averageSize: number;
  fileTypeBreakdown: Record<string, number>;
  uploadTrends: Array<{
    date: string;
    count: number;
    size: number;
  }>;
  securityStats: {
    cleanFiles: number;
    threatsDetected: number;
    quarantinedFiles: number;
  };
  popularFiles: Array<{
    id: string;
    filename: string;
    downloadCount: number;
  }>;
}

export interface FileTypeConfig {
  extension: string;
  mimeType: string;
  maxSize: number;
  allowedInEmail: boolean;
  requiresApproval: boolean;
  scanRequired: boolean;
  generateThumbnail: boolean;
  category: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'executable' | 'other';
}

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly maxFileSize: number;
  private readonly allowedFileTypes: Set<string>;
  private readonly blockedFileTypes: Set<string>;
  private readonly fileTypeConfigs: Map<string, FileTypeConfig>;

  constructor(private readonly configService: ConfigService) {
    this.maxFileSize = this.configService.get<number>('MAX_ATTACHMENT_SIZE', 25 * 1024 * 1024); // 25MB
    this.allowedFileTypes = new Set(this.configService.get<string>('ALLOWED_FILE_TYPES', '').split(','));
    this.blockedFileTypes = new Set(['exe', 'bat', 'com', 'scr', 'pif', 'vbs', 'js']);
    this.fileTypeConfigs = this.initializeFileTypeConfigs();
  }

  async uploadAttachment(
    file: Express.Multer.File,
    userId: string,
    options: UploadOptions = {},
  ): Promise<AttachmentMetadata> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique ID and hash
      const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileHash = await this.generateFileHash(file.buffer);

      // Check for duplicates
      const existingAttachment = await this.findByHash(fileHash);
      if (existingAttachment) {
        this.logger.log(`Duplicate file detected: ${file.originalname}`);
        return existingAttachment;
      }

      // Scan for viruses and threats
      const scanResults = await this.scanFile(file);
      
      if (!scanResults.isClean) {
        throw new BadRequestException(`File contains threats: ${scanResults.threats.join(', ')}`);
      }

      // Store file
      const storedFilename = `${attachmentId}_${this.sanitizeFilename(file.originalname)}`;
      const fileUrl = await this.storeFile(file.buffer, storedFilename);

      // Generate thumbnails and previews if requested
      let thumbnailUrl: string | undefined;
      let previewUrl: string | undefined;

      if (options.generateThumbnail && this.canGenerateThumbnail(file.mimetype)) {
        thumbnailUrl = await this.generateThumbnail(file.buffer, attachmentId, file.mimetype);
      }

      if (options.generatePreview && this.canGeneratePreview(file.mimetype)) {
        previewUrl = await this.generatePreview(file.buffer, attachmentId, file.mimetype);
      }

      // Encrypt if requested
      let isEncrypted = false;
      let encryptionKey: string | undefined;

      if (options.encrypt) {
        const encryptionResult = await this.encryptFile(file.buffer);
        isEncrypted = true;
        encryptionKey = encryptionResult.key;
      }

      // Calculate expiration
      const expiresAt = options.expiresIn 
        ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
        : undefined;

      // Create attachment metadata
      const metadata: AttachmentMetadata = {
        id: attachmentId,
        filename: storedFilename,
        originalFilename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        hash: fileHash,
        uploadedAt: new Date(),
        uploadedBy: userId,
        isSecure: scanResults.isClean,
        scanResults,
        downloadCount: 0,
        expiresAt,
        isEncrypted,
        encryptionKey,
        thumbnailUrl,
        previewUrl,
        tags: options.tags || [],
        permissions: {
          canDownload: options.allowedUsers || [userId],
          canPreview: options.allowedUsers || [userId],
          canDelete: [userId],
          isPublic: false,
          requiresAuthentication: true,
        },
      };

      // Store metadata
      await this.storeAttachmentMetadata(metadata);

      this.logger.log(`Attachment uploaded: ${file.originalname} by ${userId}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Error uploading attachment: ${error.message}`);
      throw error;
    }
  }

  async downloadAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; metadata: AttachmentMetadata }> {
    try {
      const metadata = await this.getAttachmentMetadata(attachmentId);
      
      // Check permissions
      if (!this.hasDownloadPermission(metadata, userId)) {
        throw new BadRequestException('Insufficient permissions to download attachment');
      }

      // Check expiration
      if (metadata.expiresAt && new Date() > metadata.expiresAt) {
        throw new BadRequestException('Attachment has expired');
      }

      // Check security status
      if (!metadata.isSecure || metadata.scanResults.quarantined) {
        throw new BadRequestException('Attachment is not safe to download');
      }

      // Retrieve file
      const buffer = await this.retrieveFile(metadata.filename);
      
      // Decrypt if necessary
      let fileBuffer = buffer;
      if (metadata.isEncrypted && metadata.encryptionKey) {
        fileBuffer = await this.decryptFile(buffer, metadata.encryptionKey);
      }

      // Update download statistics
      await this.updateDownloadStats(attachmentId);

      this.logger.log(`Attachment downloaded: ${attachmentId} by ${userId}`);
      return { buffer: fileBuffer, metadata };
    } catch (error) {
      this.logger.error(`Error downloading attachment: ${error.message}`);
      throw error;
    }
  }

  async getAttachmentMetadata(attachmentId: string): Promise<AttachmentMetadata> {
    try {
      const metadata = await this.retrieveAttachmentMetadata(attachmentId);
      
      if (!metadata) {
        throw new NotFoundException('Attachment not found');
      }

      return metadata;
    } catch (error) {
      this.logger.error(`Error getting attachment metadata: ${error.message}`);
      throw error;
    }
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    try {
      const metadata = await this.getAttachmentMetadata(attachmentId);
      
      // Check permissions
      if (!metadata.permissions.canDelete.includes(userId)) {
        throw new BadRequestException('Insufficient permissions to delete attachment');
      }

      // Delete file from storage
      await this.deleteFile(metadata.filename);

      // Delete thumbnails and previews
      if (metadata.thumbnailUrl) {
        await this.deleteFile(this.extractFilenameFromUrl(metadata.thumbnailUrl));
      }
      if (metadata.previewUrl) {
        await this.deleteFile(this.extractFilenameFromUrl(metadata.previewUrl));
      }

      // Delete metadata
      await this.deleteAttachmentMetadata(attachmentId);

      this.logger.log(`Attachment deleted: ${attachmentId} by ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting attachment: ${error.message}`);
      throw error;
    }
  }

  async getUserAttachments(
    userId: string,
    filters?: {
      emailId?: string;
      contentType?: string;
      tags?: string[];
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<AttachmentMetadata[]> {
    try {
      const allAttachments = await this.getAllAttachments();
      
      return allAttachments.filter(attachment => {
        // Check if user has access
        if (!this.hasDownloadPermission(attachment, userId)) {
          return false;
        }

        // Apply filters
        if (filters?.emailId && attachment.emailId !== filters.emailId) {
          return false;
        }

        if (filters?.contentType && !attachment.contentType.includes(filters.contentType)) {
          return false;
        }

        if (filters?.tags?.length && !filters.tags.some(tag => attachment.tags.includes(tag))) {
          return false;
        }

        if (filters?.dateFrom && attachment.uploadedAt < filters.dateFrom) {
          return false;
        }

        if (filters?.dateTo && attachment.uploadedAt > filters.dateTo) {
          return false;
        }

        return true;
      });
    } catch (error) {
      this.logger.error(`Error getting user attachments: ${error.message}`);
      throw error;
    }
  }

  async getAttachmentStats(userId?: string): Promise<AttachmentStats> {
    try {
      const attachments = userId 
        ? await this.getUserAttachments(userId)
        : await this.getAllAttachments();

      const totalAttachments = attachments.length;
      const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
      const averageSize = totalAttachments > 0 ? totalSize / totalAttachments : 0;

      // File type breakdown
      const fileTypeBreakdown = attachments.reduce((acc, att) => {
        const extension = this.getFileExtension(att.originalFilename);
        acc[extension] = (acc[extension] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Upload trends (last 30 days)
      const uploadTrends = this.calculateUploadTrends(attachments, 30);

      // Security stats
      const securityStats = {
        cleanFiles: attachments.filter(att => att.scanResults.isClean).length,
        threatsDetected: attachments.filter(att => !att.scanResults.isClean).length,
        quarantinedFiles: attachments.filter(att => att.scanResults.quarantined).length,
      };

      // Popular files
      const popularFiles = attachments
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 10)
        .map(att => ({
          id: att.id,
          filename: att.originalFilename,
          downloadCount: att.downloadCount,
        }));

      return {
        totalAttachments,
        totalSize,
        averageSize,
        fileTypeBreakdown,
        uploadTrends,
        securityStats,
        popularFiles,
      };
    } catch (error) {
      this.logger.error(`Error getting attachment stats: ${error.message}`);
      throw error;
    }
  }

  async rescanAttachment(attachmentId: string, userId: string): Promise<AttachmentScanResults> {
    try {
      const metadata = await this.getAttachmentMetadata(attachmentId);
      
      // Check permissions (only file owner or admin can rescan)
      if (metadata.uploadedBy !== userId) {
        throw new BadRequestException('Insufficient permissions to rescan attachment');
      }

      // Retrieve file for scanning
      const buffer = await this.retrieveFile(metadata.filename);
      
      // Perform new scan
      const scanResults = await this.scanFile({
        buffer,
        originalname: metadata.originalFilename,
        mimetype: metadata.contentType,
        size: metadata.size,
      } as Express.Multer.File);

      // Update metadata
      metadata.scanResults = scanResults;
      metadata.isSecure = scanResults.isClean;
      
      await this.storeAttachmentMetadata(metadata);

      this.logger.log(`Attachment rescanned: ${attachmentId} by ${userId}`);
      return scanResults;
    } catch (error) {
      this.logger.error(`Error rescanning attachment: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    const extension = this.getFileExtension(file.originalname);
    
    if (this.blockedFileTypes.has(extension)) {
      throw new BadRequestException(`File type .${extension} is not allowed`);
    }

    if (this.allowedFileTypes.size > 0 && !this.allowedFileTypes.has(extension)) {
      throw new BadRequestException(`File type .${extension} is not in allowed types`);
    }
  }

  private async generateFileHash(buffer: Buffer): Promise<string> {
    // Mock hash generation - use crypto.createHash in real implementation
    return `hash_${buffer.length}_${Date.now()}`;
  }

  private async scanFile(file: Express.Multer.File): Promise<AttachmentScanResults> {
    // Mock virus scanning - integrate with real antivirus service
    const threats: string[] = [];
    let isClean = true;
    let riskLevel: AttachmentScanResults['riskLevel'] = 'low';

    // Check for dangerous file types
    const extension = this.getFileExtension(file.originalname);
    if (this.blockedFileTypes.has(extension)) {
      threats.push(`Dangerous file type: .${extension}`);
      isClean = false;
      riskLevel = 'high';
    }

    // Mock content scanning
    if (file.buffer.includes(Buffer.from('EICAR'))) {
      threats.push('Test virus signature detected');
      isClean = false;
      riskLevel = 'critical';
    }

    return {
      scannedAt: new Date(),
      scanEngine: 'CubeCore Security Scanner v1.0',
      isClean,
      threats,
      riskLevel,
      quarantined: !isClean && riskLevel === 'critical',
    };
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  private async storeFile(buffer: Buffer, filename: string): Promise<string> {
    // Mock file storage - implement with actual storage service (AWS S3, etc.)
    return `https://storage.example.com/attachments/${filename}`;
  }

  private async retrieveFile(filename: string): Promise<Buffer> {
    // Mock file retrieval - implement with actual storage service
    return Buffer.from('mock file content');
  }

  private async deleteFile(filename: string): Promise<void> {
    // Mock file deletion - implement with actual storage service
  }

  private canGenerateThumbnail(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  }

  private canGeneratePreview(mimeType: string): boolean {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('text/') ||
           mimeType === 'application/pdf' ||
           mimeType.includes('document');
  }

  private async generateThumbnail(buffer: Buffer, id: string, mimeType: string): Promise<string> {
    // Mock thumbnail generation
    return `https://storage.example.com/thumbnails/${id}_thumb.jpg`;
  }

  private async generatePreview(buffer: Buffer, id: string, mimeType: string): Promise<string> {
    // Mock preview generation
    return `https://storage.example.com/previews/${id}_preview.jpg`;
  }

  private async encryptFile(buffer: Buffer): Promise<{ encryptedBuffer: Buffer; key: string }> {
    // Mock encryption - implement with actual encryption service
    const key = `enc_${Date.now()}_${Math.random().toString(36)}`;
    return {
      encryptedBuffer: buffer, // Would be encrypted in real implementation
      key,
    };
  }

  private async decryptFile(encryptedBuffer: Buffer, key: string): Promise<Buffer> {
    // Mock decryption - implement with actual decryption service
    return encryptedBuffer; // Would be decrypted in real implementation
  }

  private hasDownloadPermission(metadata: AttachmentMetadata, userId: string): boolean {
    if (metadata.uploadedBy === userId) return true;
    if (metadata.permissions.isPublic) return true;
    return metadata.permissions.canDownload.includes(userId);
  }

  private async updateDownloadStats(attachmentId: string): Promise<void> {
    try {
      const metadata = await this.retrieveAttachmentMetadata(attachmentId);
      if (metadata) {
        metadata.downloadCount += 1;
        metadata.lastDownloaded = new Date();
        await this.storeAttachmentMetadata(metadata);
      }
    } catch (error) {
      this.logger.error(`Error updating download stats: ${error.message}`);
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private extractFilenameFromUrl(url: string): string {
    return url.split('/').pop() || '';
  }

  private calculateUploadTrends(attachments: AttachmentMetadata[], days: number): AttachmentStats['uploadTrends'] {
    const trends: Record<string, { count: number; size: number }> = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    attachments
      .filter(att => att.uploadedAt >= startDate)
      .forEach(att => {
        const date = att.uploadedAt.toISOString().split('T')[0];
        if (!trends[date]) {
          trends[date] = { count: 0, size: 0 };
        }
        trends[date].count += 1;
        trends[date].size += att.size;
      });

    return Object.entries(trends)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async findByHash(hash: string): Promise<AttachmentMetadata | null> {
    // Mock hash lookup - implement with database
    return null;
  }

  private initializeFileTypeConfigs(): Map<string, FileTypeConfig> {
    const configs = new Map<string, FileTypeConfig>();
    
    // Document types
    configs.set('pdf', {
      extension: 'pdf',
      mimeType: 'application/pdf',
      maxSize: 50 * 1024 * 1024,
      allowedInEmail: true,
      requiresApproval: false,
      scanRequired: true,
      generateThumbnail: true,
      category: 'document',
    });

    // Image types
    configs.set('jpg', {
      extension: 'jpg',
      mimeType: 'image/jpeg',
      maxSize: 10 * 1024 * 1024,
      allowedInEmail: true,
      requiresApproval: false,
      scanRequired: true,
      generateThumbnail: true,
      category: 'image',
    });

    return configs;
  }

  // Mock database methods - implement with actual database
  private async storeAttachmentMetadata(metadata: AttachmentMetadata): Promise<void> {
    // Store in database
  }

  private async retrieveAttachmentMetadata(attachmentId: string): Promise<AttachmentMetadata | null> {
    // Retrieve from database
    return null;
  }

  private async deleteAttachmentMetadata(attachmentId: string): Promise<void> {
    // Delete from database
  }

  private async getAllAttachments(): Promise<AttachmentMetadata[]> {
    // Get all from database
    return [];
  }
}