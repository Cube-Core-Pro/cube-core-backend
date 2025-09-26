// path: backend/src/modules/office/services/import-export.service.ts
// purpose: Enterprise document import/export service with format conversion and batch processing
// dependencies: @nestjs/common, prisma, file-system, conversion-engines

import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  type: 'single' | 'batch' | 'folder';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  files: ImportFileInfo[];
  options: ImportOptions;
  results: ImportResult[];
  progress: JobProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ImportFileInfo {
  originalName: string;
  tempPath: string;
  size: number;
  mimeType: string;
  targetFormat?: string;
  folderId?: string;
  metadata?: Record<string, any>;
}

export interface ImportOptions {
  convertFormat?: boolean;
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
  createFolders?: boolean;
  overwriteExisting?: boolean;
  validateContent?: boolean;
  compression?: 'none' | 'low' | 'medium' | 'high';
  watermark?: WatermarkOptions;
  permissions?: DocumentPermissions;
}

export interface WatermarkOptions {
  enabled: boolean;
  text?: string;
  image?: string;
  opacity?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface DocumentPermissions {
  isPublic: boolean;
  canView: string[];
  canEdit: string[];
  canComment: string[];
}

export interface ImportResult {
  originalFile: string;
  success: boolean;
  documentId?: string;
  documentName?: string;
  folderId?: string;
  warnings: string[];
  error?: string;
  metadata?: {
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
    hasCharts?: boolean;
    extractedText?: string;
  };
}

export interface JobProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentFile?: string;
  estimatedTimeRemaining?: number;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  type: 'single' | 'multiple' | 'folder' | 'archive';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  documents: ExportDocumentInfo[];
  format: ExportFormat;
  options: ExportOptions;
  progress: JobProgress;
  downloadUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExportDocumentInfo {
  documentId: string;
  name: string;
  type: string;
  includeComments?: boolean;
  includeRevisions?: boolean;
  pageRange?: { start?: number; end?: number };
}

export interface ExportFormat {
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt' | 'csv' | 'json' | 'zip';
  version?: string;
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
}

export interface ExportOptions {
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  passwordProtect?: boolean;
  password?: string;
  digitalSignature?: boolean;
  watermark?: WatermarkOptions;
  customization?: {
    headerFooter?: boolean;
    pageNumbers?: boolean;
    tableOfContents?: boolean;
    bookmarks?: boolean;
  };
}

export interface ConversionSupport {
  inputFormats: string[];
  outputFormats: string[];
  supportMatrix: Record<string, string[]>;
  qualityLevels: string[];
  maxFileSize: number;
  batchLimit: number;
}

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);
  private readonly supportedImportFormats = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/html',
    'application/rtf',
    'application/json',
  ];
  private readonly supportedExportFormats = [
    'pdf', 'docx', 'xlsx', 'pptx', 'html', 'txt', 'csv', 'json', 'zip',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createImportJob(
    userId: string,
    tenantId: string,
    files: ImportFileInfo[],
    options: ImportOptions = {}
  ): Promise<ImportJob> {
    try {
      // Validate files
      for (const file of files) {
        if (!this.supportedImportFormats.includes(file.mimeType)) {
          throw new BadRequestException(`Unsupported file format: ${file.mimeType}`);
        }

        // Check file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          throw new BadRequestException(`File too large: ${file.originalName} (max 100MB)`);
        }
      }

      // Check batch limit (50 files max)
      if (files.length > 50) {
        throw new BadRequestException('Maximum 50 files per batch');
      }

      const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const importJob: ImportJob = {
        id: jobId,
        tenantId,
        userId,
        type: files.length === 1 ? 'single' : 'batch',
        status: 'pending',
        files,
        options: {
          convertFormat: false,
          preserveFormatting: true,
          extractMetadata: true,
          createFolders: false,
          overwriteExisting: false,
          validateContent: true,
          compression: 'medium',
          ...options,
        },
        results: [],
        progress: {
          total: files.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        },
        createdAt: new Date(),
      };

      // Store job in Redis for quick access
      await this.redis.setex(`import_job:${jobId}`, 3600, JSON.stringify(importJob));

      // Start processing asynchronously
      this.processImportJob(jobId).catch(error => {
        this.logger.error(`Import job ${jobId} failed`, error);
      });

      this.logger.log(`Import job created: ${jobId} with ${files.length} files`);
      return importJob;
    } catch (error) {
      this.logger.error('Error creating import job', error);
      throw error;
    }
  }

  async getImportJob(
    jobId: string,
    userId: string,
    tenantId: string
  ): Promise<ImportJob | null> {
    try {
      // Try Redis first
      const cached = await this.redis.get(`import_job:${jobId}`);
      if (cached) {
        const job = JSON.parse(cached) as ImportJob;
        if (job.userId === userId && job.tenantId === tenantId) {
          return job;
        }
      }

      // No DB fallback; jobs are stored in Redis only
      return null;
    } catch (error) {
      this.logger.error('Error getting import job', error);
      return null;
    }
  }

  async createExportJob(
    userId: string,
    tenantId: string,
    documents: ExportDocumentInfo[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<ExportJob> {
    try {
      // Validate format
      if (!this.supportedExportFormats.includes(format.type)) {
        throw new BadRequestException(`Unsupported export format: ${format.type}`);
      }

      // Check document limit (100 documents max)
      if (documents.length > 100) {
        throw new BadRequestException('Maximum 100 documents per export');
      }

      // Validate documents exist and user has access
      for (const doc of documents) {
        const exists = await this.prisma.officeDocument.findFirst({
          where: {
            id: doc.documentId,
            tenantId,
            // Add permission check here
          },
        });

        if (!exists) {
          throw new NotFoundException(`Document not found: ${doc.documentId}`);
        }
      }

      const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const exportJob: ExportJob = {
        id: jobId,
        tenantId,
        userId,
        type: documents.length === 1 ? 'single' : 'multiple',
        status: 'pending',
        documents,
        format,
        options: {
          includeMetadata: true,
          includeAttachments: false,
          passwordProtect: false,
          digitalSignature: false,
          ...options,
        },
        progress: {
          total: documents.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Store job
      await this.redis.setex(`export_job:${jobId}`, 3600, JSON.stringify(exportJob));
      
      // Start processing asynchronously
      this.processExportJob(jobId).catch(error => {
        this.logger.error(`Export job ${jobId} failed`, error);
      });

      this.logger.log(`Export job created: ${jobId} with ${documents.length} documents`);
      return exportJob;
    } catch (error) {
      this.logger.error('Error creating export job', error);
      throw error;
    }
  }

  async getExportJob(
    jobId: string,
    userId: string,
    tenantId: string
  ): Promise<ExportJob | null> {
    try {
      // Try Redis first
      const cached = await this.redis.get(`export_job:${jobId}`);
      if (cached) {
        const job = JSON.parse(cached) as ExportJob;
        if (job.userId === userId && job.tenantId === tenantId) {
          return job;
        }
      }

      // No DB fallback; jobs are stored in Redis only
      return null;
    } catch (error) {
      this.logger.error('Error getting export job', error);
      return null;
    }
  }

  async cancelJob(
    jobId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Get job
      const importJob = await this.getImportJob(jobId, userId, tenantId);
      const exportJob = await this.getExportJob(jobId, userId, tenantId);
      const job = importJob || exportJob;

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status === 'completed' || job.status === ('cancelled' as any)) {
        throw new BadRequestException('Cannot cancel completed or already cancelled job');
      }

      // Update status
      job.status = 'cancelled';

      // Update in Redis and database
      const cacheKey = importJob ? `import_job:${jobId}` : `export_job:${jobId}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(job));

      // Redis-only update; no DB persistence layer present

      this.logger.log(`Job cancelled: ${jobId}`);
    } catch (error) {
      this.logger.error('Error cancelling job', error);
      throw error;
    }
  }

  async getConversionSupport(): Promise<ConversionSupport> {
    return {
      inputFormats: this.supportedImportFormats,
      outputFormats: this.supportedExportFormats,
      supportMatrix: {
        'application/pdf': ['pdf', 'html', 'txt'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'html', 'txt', 'docx'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['pdf', 'csv', 'html', 'xlsx'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pdf', 'html', 'pptx'],
        'text/plain': ['pdf', 'html', 'txt'],
        'text/csv': ['xlsx', 'pdf', 'html', 'csv'],
        'text/html': ['pdf', 'txt', 'html'],
        'application/rtf': ['pdf', 'docx', 'txt', 'html'],
        'application/json': ['csv', 'xlsx', 'txt', 'json'],
      },
      qualityLevels: ['low', 'medium', 'high'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      batchLimit: 50,
    };
  }

  async getUserJobs(
    userId: string,
    tenantId: string,
    options: {
      type?: 'import' | 'export';
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Array<ImportJob | ExportJob>> {
    try {
      // Fetch from Redis keys and filter by user/tenant
      const keys = await this.redis.keys('import_job:*');
      const exportKeys = await this.redis.keys('export_job:*');
      const allKeys = [...keys, ...exportKeys];
      const jobs: Array<ImportJob | ExportJob> = [];
      for (const key of allKeys) {
        const data = await this.redis.get(key);
        if (!data) continue;
        const job = JSON.parse(data) as ImportJob | ExportJob;
        if (job.userId !== userId || job.tenantId !== tenantId) continue;
        if (options.type) {
          const isImport = 'files' in job;
          if ((options.type === 'import' && !isImport) || (options.type === 'export' && isImport)) {
            continue;
          }
        }
        if (options.status && job.status !== options.status) continue;
        jobs.push(job);
      }
      // Sort by createdAt desc
      jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const start = options.offset || 0;
      const end = start + (options.limit || 20);
      return jobs.slice(start, end);
    } catch (error) {
      this.logger.error('Error getting user jobs', error);
      return [];
    }
  }

  private async processImportJob(jobId: string): Promise<void> {
    const job = await this.getImportJobFromStorage(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      await this.updateJob(jobId, job);

      for (let i = 0; i < job.files.length; i++) {
  if ((job.status as any) === 'cancelled') break;

        const file = job.files[i];
        job.progress.currentFile = file.originalName;
        await this.updateJob(jobId, job);

        try {
          const result = await this.processImportFile(file, job.options, job.tenantId, job.userId);
          job.results.push(result);
          job.progress.completed++;
        } catch (error) {
          job.results.push({
            originalFile: file.originalName,
            success: false,
            warnings: [],
            error: error.message,
          });
          job.progress.failed++;
        }

        job.progress.percentage = Math.round((job.progress.completed + job.progress.failed) / job.progress.total * 100);
        await this.updateJob(jobId, job);
      }

      job.status = job.progress.failed === 0 ? 'completed' : 'completed';
      job.completedAt = new Date();
      job.progress.currentFile = undefined;

      await this.updateJob(jobId, job);
      this.logger.log(`Import job completed: ${jobId}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      await this.updateJob(jobId, job);
      this.logger.error(`Import job failed: ${jobId}`, error);
    }
  }

  private async processExportJob(jobId: string): Promise<void> {
    const job = await this.getExportJobFromStorage(jobId);
    if (!job) return;

    try {
      job.status = 'processing';
      await this.updateJob(jobId, job);

      // Create temporary directory for export
      const tempDir = path.join('/tmp', `export_${jobId}`);
      await fs.mkdir(tempDir, { recursive: true });

      const exportedFiles: string[] = [];

      for (let i = 0; i < job.documents.length; i++) {
  if ((job.status as any) === 'cancelled') break;

        const doc = job.documents[i];
        job.progress.currentFile = doc.name;
        await this.updateJob(jobId, job);

        try {
          const exportedFile = await this.exportDocument(doc, job.format, job.options, tempDir);
          exportedFiles.push(exportedFile);
          job.progress.completed++;
        } catch (error) {
          this.logger.error(`Failed to export document ${doc.documentId}`, error);
          job.progress.failed++;
        }

        job.progress.percentage = Math.round((job.progress.completed + job.progress.failed) / job.progress.total * 100);
        await this.updateJob(jobId, job);
      }

      // Create final archive if multiple files or zip format requested
      if (exportedFiles.length > 1 || job.format.type === 'zip') {
        const archivePath = await this.createArchive(exportedFiles, tempDir, jobId);
        job.downloadUrl = await this.uploadToStorage(archivePath, jobId);
      } else if (exportedFiles.length === 1) {
        job.downloadUrl = await this.uploadToStorage(exportedFiles[0], jobId);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.currentFile = undefined;

      await this.updateJob(jobId, job);

      // Cleanup temp directory
      await fs.rmdir(tempDir, { recursive: true });

      this.logger.log(`Export job completed: ${jobId}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      await this.updateJob(jobId, job);
      this.logger.error(`Export job failed: ${jobId}`, error);
    }
  }

  private async processImportFile(
    file: ImportFileInfo,
    options: ImportOptions,
    tenantId: string,
    userId: string
  ): Promise<ImportResult> {
    const result: ImportResult = {
      originalFile: file.originalName,
      success: false,
      warnings: [],
    };

    try {
      // Read and validate file
      const fileContent = await fs.readFile(file.tempPath);
      
      if (options.validateContent) {
        const validation = await this.validateFileContent(fileContent, file.mimeType);
        if (!validation.valid) {
          throw new Error(`Invalid file content: ${validation.error}`);
        }
        result.warnings.push(...validation.warnings);
      }

      // Extract metadata if requested
      if (options.extractMetadata) {
        result.metadata = await this.extractMetadata(fileContent, file.mimeType);
      }

      // Convert format if requested
      let processedContent = fileContent;
      let finalMimeType = file.mimeType;
      
      if (options.convertFormat && file.targetFormat) {
        const conversion = await this.convertFormat(fileContent, file.mimeType, file.targetFormat);
        processedContent = conversion.content;
        finalMimeType = conversion.mimeType;
      }

      // Apply compression if specified
      if (options.compression && options.compression !== 'none') {
        processedContent = await this.compressContent(processedContent, options.compression);
      }

      // Apply watermark if specified
      if (options.watermark?.enabled) {
        processedContent = await this.applyWatermark(processedContent, finalMimeType, options.watermark);
      }

      // Create OfficeDocument in database
      const base64 = processedContent.toString('base64');
      const checksum = createHash('sha256').update(processedContent).digest('hex');
      const document = await this.prisma.officeDocument.create({
        data: {
          title: path.parse(file.originalName).name,
          description: undefined,
          type: this.getOfficeType(finalMimeType),
          format: this.getFormatFromMime(finalMimeType),
          content: {
            binary: base64,
            originalMimeType: finalMimeType,
            metadata: result.metadata || {},
          } as any,
          templateId: null,
          folderId: file.folderId || null,
          tags: [],
          isPublic: options.permissions?.isPublic ?? false,
          allowCollaboration: true,
          settings: {},
          version: 1,
          size: processedContent.length,
          checksum,
          tenantId,
          createdBy: userId,
          lastModifiedBy: userId,
        },
      });

      result.success = true;
      result.documentId = document.id;
      result.documentName = document.title;
      result.folderId = document.folderId || undefined;

      // Clean up temp file
      await fs.unlink(file.tempPath);

      return result;
    } catch (error) {
      result.error = error.message;
      return result;
    }
  }

  private async exportDocument(
    doc: ExportDocumentInfo,
    format: ExportFormat,
    options: ExportOptions,
    outputDir: string
  ): Promise<string> {
    // Get document from database
    const document = await this.prisma.officeDocument.findUnique({
      where: { id: doc.documentId },
    });

    if (!document) {
      throw new Error(`Document not found: ${doc.documentId}`);
    }

    // Convert content to target format
    // Extract buffer from stored JSON
    const originalMime: string = (document.content as any)?.originalMimeType || 'application/octet-stream';
    const binaryB64: string | undefined = (document.content as any)?.binary;
    const buffer: Buffer = binaryB64 ? Buffer.from(binaryB64, 'base64') : Buffer.from(JSON.stringify(document.content));
    const convertedContent = await this.convertFormat(buffer, originalMime, format.type);

    // Apply export options
    let finalContent = convertedContent.content;

    if (options.passwordProtect && options.password) {
      finalContent = await this.passwordProtect(finalContent, options.password);
    }

    if (options.watermark?.enabled) {
      finalContent = await this.applyWatermark(finalContent, convertedContent.mimeType, options.watermark);
    }

    // Write to file
    const fileName = `${document.title}.${format.type}`;
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, finalContent);

    return filePath;
  }

  private async validateFileContent(content: Buffer, mimeType: string): Promise<{
    valid: boolean;
    error?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Basic validation based on mime type
      switch (mimeType) {
        case 'application/pdf':
          if (!content.toString('ascii', 0, 4).includes('%PDF')) {
            return { valid: false, error: 'Invalid PDF file', warnings };
          }
          break;
        case 'text/plain':
          // Check for valid UTF-8
          try {
            content.toString('utf-8');
          } catch {
            warnings.push('File may contain non-UTF-8 characters');
          }
          break;
      }

      return { valid: true, warnings };
    } catch (error) {
      return { valid: false, error: error.message, warnings };
    }
  }

  private async extractMetadata(content: Buffer, mimeType: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      size: content.length,
      extractedAt: new Date(),
    };

    try {
      switch (mimeType) {
        case 'text/plain':
          const text = content.toString('utf-8');
          metadata.wordCount = text.split(/\s+/).length;
          metadata.lineCount = text.split('\n').length;
          metadata.characterCount = text.length;
          break;
        case 'application/pdf':
          // Would use PDF parser to extract metadata
          metadata.pages = 1; // Placeholder
          break;
      }
    } catch (error) {
      this.logger.warn('Failed to extract metadata', error);
    }

    return metadata;
  }

  private async convertFormat(
    content: Buffer,
    fromMimeType: string,
    toFormat: string
  ): Promise<{ content: Buffer; mimeType: string }> {
    // This is a simplified implementation
    // In production, you'd use libraries like LibreOffice, Pandoc, etc.

    const mimeTypeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      html: 'text/html',
    };

    // For now, just return the original content
    // In production, implement actual conversion logic
    return {
      content,
      mimeType: mimeTypeMap[toFormat] || fromMimeType,
    };
  }

  private async compressContent(content: Buffer, level: string): Promise<Buffer> {
    // Implement compression logic (e.g., using zlib)
    // For now, return original content
    return content;
  }

  private async applyWatermark(
    content: Buffer,
    mimeType: string,
    watermark: WatermarkOptions
  ): Promise<Buffer> {
    // Implement watermark application logic
    // This would depend on the file format and watermark type
    return content;
  }

  private async passwordProtect(content: Buffer, password: string): Promise<Buffer> {
    // Implement password protection
    // This would typically involve encrypting the content
    return content;
  }

  private async createArchive(files: string[], outputDir: string, jobId: string): Promise<string> {
    // Create ZIP archive containing all files
    const archivePath = path.join(outputDir, `export_${jobId}.zip`);
    // Implementation would use a ZIP library
    // For now, just return the first file path
    return files[0] || archivePath;
  }

  private async uploadToStorage(filePath: string, jobId: string): Promise<string> {
    // Upload file to storage service (S3, etc.) and return download URL
    // For now, return a mock URL
    return `https://downloads.example.com/${jobId}/${path.basename(filePath)}`;
  }

  private getOfficeType(mimeType: string): string {
    switch (mimeType) {
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
      case 'application/pdf':
      case 'text/plain':
        return 'DOCUMENT';
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
      case 'text/csv':
        return 'SPREADSHEET';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      case 'application/vnd.ms-powerpoint':
        return 'PRESENTATION';
      default:
        return 'OTHER';
    }
  }

  private getFormatFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      'text/html': 'HTML',
    };
    return map[mimeType] || 'BINARY';
  }

  private async getImportJobFromStorage(jobId: string): Promise<ImportJob | null> {
    const cached = await this.redis.get(`import_job:${jobId}`);
    if (cached) {
      return JSON.parse(cached) as ImportJob;
    }

    // No DB fallback
    return null;
  }

  private async getExportJobFromStorage(jobId: string): Promise<ExportJob | null> {
    const cached = await this.redis.get(`export_job:${jobId}`);
    if (cached) {
      return JSON.parse(cached) as ExportJob;
    }

    // No DB fallback
    return null;
  }

  private async updateJob(jobId: string, job: ImportJob | ExportJob): Promise<void> {
    const isImport = 'files' in job;
    const cacheKey = isImport ? `import_job:${jobId}` : `export_job:${jobId}`;
    
    await this.redis.setex(cacheKey, 3600, JSON.stringify(job));
  }
}