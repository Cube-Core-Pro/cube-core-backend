// path: backend/src/office/services/import-export.service.ts
// purpose: Advanced import/export service with format conversion, batch processing, and cloud integration
// dependencies: File processing, format converters, cloud storage, queue processing

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ImportOptions {
  format: 'docx' | 'pdf' | 'txt' | 'html' | 'md' | 'xlsx' | 'csv' | 'pptx' | 'odt' | 'ods' | 'odp';
  preserveFormatting?: boolean;
  extractImages?: boolean;
  convertTables?: boolean;
  mergeDocuments?: boolean;
  templateMapping?: Record<string, string>;
  customSettings?: Record<string, any>;
}

interface ExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'txt' | 'md' | 'xlsx' | 'csv' | 'pptx' | 'png' | 'jpg' | 'svg';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  includeComments?: boolean;
  includeVersionHistory?: boolean;
  watermark?: {
    text: string;
    opacity: number;
    position: 'center' | 'corner' | 'header' | 'footer';
  };
  password?: string;
  permissions?: {
    allowPrint?: boolean;
    allowCopy?: boolean;
    allowEdit?: boolean;
  };
  customSettings?: Record<string, any>;
}

interface BatchOperation {
  id: string;
  tenantId: string;
  userId: string;
  operation: 'import' | 'export' | 'convert';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'failed';
    documentId?: string;
    error?: string;
    downloadUrl?: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
  settings: ImportOptions | ExportOptions;
}

interface CloudIntegration {
  provider: 'google_drive' | 'onedrive' | 'dropbox' | 'box' | 's3' | 'azure_blob';
  credentials: Record<string, any>;
  syncSettings: {
    autoSync?: boolean;
    syncInterval?: number;
    conflictResolution?: 'local' | 'remote' | 'merge' | 'ask';
  };
}

@Injectable()
export class ImportExportService {
  private readonly logger = new Logger(ImportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue('import-export') private readonly importExportQueue: Queue,
  ) {}

  async importDocument(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
    options: ImportOptions,
    folderId?: string
  ): Promise<{
    documentId: string;
    warnings: string[];
    metadata: Record<string, any>;
  }> {
    try {
      this.logger.log(`Importing document: ${file.originalname} for tenant ${tenantId}`);

      // Validate file format
      this.validateFileFormat(file, options.format);

      // Process file based on format
      const processedContent = await this.processImportFile(file, options);

      // Create document in database
      const _documentNumber = await this.generateDocumentNumber(tenantId);
      const document = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          createdBy: userId,
          // documentNumber, // Field doesn't exist
          title: this.extractTitleFromFilename(file.originalname),
          type: this.mapFormatToDocumentType(options.format),
          description: `Imported from ${options.format.toUpperCase()} file`,
          content: processedContent.content,
          format: 'DOCX',
          checksum: 'temp-checksum',
          folderId,
          tags: processedContent.tags || [],
          size: JSON.stringify(processedContent.content).length,
          // status: 'DRAFT', // Field doesn't exist
        }
      });

      // Create initial version
      await this.prisma.documentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          changes: `Imported from ${options.format.toUpperCase()} file: ${file.originalname}`,
          createdBy: userId,
        }
      });

      // Log import activity
      await this.logImportExportActivity(tenantId, userId, 'import', {
        documentId: document.id,
        fileName: file.originalname,
        format: options.format,
        fileSize: file.size,
      });

      return {
        documentId: document.id,
        warnings: processedContent.warnings || [],
        metadata: processedContent.metadata || {},
      };

    } catch (error) {
      this.logger.error('Error importing document:', error);
      throw new Error(`Failed to import document: ${error.message}`);
    }
  }

  async exportDocument(
    tenantId: string,
    userId: string,
    documentId: string,
    options: ExportOptions
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    fileSize: number;
    expiresAt: Date;
  }> {
    try {
      this.logger.log(`Exporting document ${documentId} to ${options.format} for tenant ${tenantId}`);

      // Get document
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId, permission: { in: ['VIEW', 'COMMENT', 'EDIT', 'ADMIN'] } } } }
          ]
        },
        include: {
          comments: options.includeComments ? {
            include: { user: { select: { firstName: true, lastName: true } } }
          } : false,
          versions: options.includeVersionHistory ? {
            include: { creator: { select: { firstName: true, lastName: true } } }
          } : false,
        }
      });

      if (!document) {
        throw new Error('Document not found or access denied');
      }

      // Process export based on format
      const exportResult = await this.processExportDocument(document, options);

      // Generate download URL
      const fileName = `${document.title}.${options.format}`;
      const downloadUrl = await this.generateDownloadUrl(exportResult.filePath, fileName);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Log export activity
      await this.logImportExportActivity(tenantId, userId, 'export', {
        documentId: document.id,
        fileName,
        format: options.format,
        fileSize: exportResult.fileSize,
      });

      return {
        downloadUrl,
        fileName,
        fileSize: exportResult.fileSize,
        expiresAt,
      };

    } catch (error) {
      this.logger.error('Error exporting document:', error);
      throw new Error(`Failed to export document: ${error.message}`);
    }
  }

  async startBatchImport(
    tenantId: string,
    userId: string,
    files: Express.Multer.File[],
    options: ImportOptions,
    folderId?: string
  ): Promise<{ batchId: string }> {
    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create batch operation record
      const batchOperation: BatchOperation = {
        id: batchId,
        tenantId,
        userId,
        operation: 'import',
        status: 'pending',
        progress: 0,
        totalFiles: files.length,
        processedFiles: 0,
        failedFiles: 0,
        results: [],
        createdAt: new Date(),
        settings: options,
      };

      // Store batch operation in Redis
      await this.redis.setex(
        `batch:${batchId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(batchOperation)
      );

      // Queue batch processing job
      await this.importExportQueue.add('batch-import', {
        batchId,
        tenantId,
        userId,
        files: files.map(f => ({
          originalname: f.originalname,
          buffer: f.buffer,
          mimetype: f.mimetype,
          size: f.size,
        })),
        options,
        folderId,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      return { batchId };

    } catch (error) {
      this.logger.error('Error starting batch import:', error);
      throw new Error('Failed to start batch import');
    }
  }

  async startBatchExport(
    tenantId: string,
    userId: string,
    documentIds: string[],
    options: ExportOptions
  ): Promise<{ batchId: string }> {
    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const batchOperation: BatchOperation = {
        id: batchId,
        tenantId,
        userId,
        operation: 'export',
        status: 'pending',
        progress: 0,
        totalFiles: documentIds.length,
        processedFiles: 0,
        failedFiles: 0,
        results: [],
        createdAt: new Date(),
        settings: options,
      };

      await this.redis.setex(
        `batch:${batchId}`,
        24 * 60 * 60,
        JSON.stringify(batchOperation)
      );

      await this.importExportQueue.add('batch-export', {
        batchId,
        tenantId,
        userId,
        documentIds,
        options,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      return { batchId };

    } catch (error) {
      this.logger.error('Error starting batch export:', error);
      throw new Error('Failed to start batch export');
    }
  }

  async getBatchStatus(batchId: string): Promise<BatchOperation | null> {
    try {
      const batchData = await this.redis.get(`batch:${batchId}`);
      return batchData ? JSON.parse(batchData) : null;
    } catch (error) {
      this.logger.error('Error getting batch status:', error);
      return null;
    }
  }

  async convertDocumentFormat(
    tenantId: string,
    userId: string,
    documentId: string,
    targetFormat: string,
    _options: Partial<ExportOptions> = {}
  ): Promise<{
    newDocumentId: string;
    originalFormat: string;
    targetFormat: string;
  }> {
    try {
      // Get original document
      const originalDoc = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId, permission: { in: ['VIEW', 'COMMENT', 'EDIT', 'ADMIN'] } } } }
          ]
        }
      });

      if (!originalDoc) {
        throw new Error('Document not found or access denied');
      }

      // Convert content to target format
      const convertedContent = await this.convertContentFormat(
        originalDoc.content,
        originalDoc.type,
        this.mapFormatToDocumentType(targetFormat as any)
      );

      // Create new document with converted content
      const _documentNumber = await this.generateDocumentNumber(tenantId);
      const newDocument = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          createdBy: userId,
          // documentNumber, // Field doesn't exist
          title: `${originalDoc.title} (${targetFormat.toUpperCase()})`,
          type: this.mapFormatToDocumentType(targetFormat as any),
          description: `Converted from ${originalDoc.type} to ${targetFormat.toUpperCase()}`,
          content: convertedContent,
          format: 'DOCX',
          checksum: 'temp-checksum',
          folderId: originalDoc.folderId,
          tags: [...(originalDoc.tags || []), 'converted'],
          size: JSON.stringify(convertedContent).length,
          // status: 'DRAFT', // Field doesn't exist
        }
      });

      // Create initial version
      await this.prisma.documentVersion.create({
        data: {
          documentId: newDocument.id,
          version: 1,
          changes: `Converted from ${originalDoc.type} format`,
          createdBy: userId,
        }
      });

      return {
        newDocumentId: newDocument.id,
        originalFormat: originalDoc.type,
        targetFormat: targetFormat.toUpperCase(),
      };

    } catch (error) {
      this.logger.error('Error converting document format:', error);
      throw new Error(`Failed to convert document format: ${error.message}`);
    }
  }

  async setupCloudIntegration(
    tenantId: string,
    userId: string,
    integration: CloudIntegration
  ): Promise<{ integrationId: string }> {
    try {
      const integrationId = `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store integration settings securely
      await this.redis.setex(
        `cloud:integration:${tenantId}:${integrationId}`,
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify({
          ...integration,
          userId,
          createdAt: new Date(),
        })
      );

      // Set up sync schedule if auto-sync is enabled
      if (integration.syncSettings.autoSync) {
        await this.scheduleCloudSync(tenantId, integrationId, integration);
      }

      return { integrationId };

    } catch (error) {
      this.logger.error('Error setting up cloud integration:', error);
      throw new Error('Failed to setup cloud integration');
    }
  }

  async syncWithCloud(
    tenantId: string,
    integrationId: string,
    direction: 'upload' | 'download' | 'bidirectional' = 'bidirectional'
  ): Promise<{
    syncId: string;
    status: 'started' | 'failed';
  }> {
    try {
      const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get integration settings
      const integrationData = await this.redis.get(`cloud:integration:${tenantId}:${integrationId}`);
      if (!integrationData) {
        throw new Error('Cloud integration not found');
      }

      const integration = JSON.parse(integrationData);

      // Queue sync job
      await this.importExportQueue.add('cloud-sync', {
        syncId,
        tenantId,
        integrationId,
        integration,
        direction,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      return {
        syncId,
        status: 'started',
      };

    } catch (error) {
      this.logger.error('Error syncing with cloud:', error);
      return {
        syncId: '',
        status: 'failed',
      };
    }
  }

  async getImportExportHistory(
    tenantId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    operation: string;
    fileName: string;
    format: string;
    status: string;
    createdAt: Date;
    fileSize?: number;
    documentId?: string;
  }>> {
    try {
      // Get history from Redis (recent activities)
      const historyKey = `import_export_history:${tenantId}:${userId}`;
      const history = await this.redis.lrange(historyKey, offset, offset + limit - 1);

      return history.map(item => JSON.parse(item));

    } catch (error) {
      this.logger.error('Error getting import/export history:', error);
      return [];
    }
  }

  // Private helper methods

  private validateFileFormat(file: Express.Multer.File, expectedFormat: string): void {
    const formatMimeTypes: Record<string, string[]> = {
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'pdf': ['application/pdf'],
      'txt': ['text/plain'],
      'html': ['text/html'],
      'md': ['text/markdown', 'text/x-markdown'],
      'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'csv': ['text/csv'],
      'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      'odt': ['application/vnd.oasis.opendocument.text'],
      'ods': ['application/vnd.oasis.opendocument.spreadsheet'],
      'odp': ['application/vnd.oasis.opendocument.presentation'],
    };

    const allowedMimeTypes = formatMimeTypes[expectedFormat];
    if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file format. Expected ${expectedFormat}, got ${file.mimetype}`);
    }
  }

  private async processImportFile(
    file: Express.Multer.File,
    options: ImportOptions
  ): Promise<{
    content: any;
    warnings: string[];
    metadata: Record<string, any>;
    tags: string[];
  }> {
    const _warnings: string[] = [];
    const _metadata: Record<string, any> = {};
    const _tags: string[] = [];

    switch (options.format) {
      case 'txt':
        return this.processTxtFile(file, options);
      case 'html':
        return this.processHtmlFile(file, options);
      case 'md':
        return this.processMarkdownFile(file, options);
      case 'csv':
        return this.processCsvFile(file, options);
      case 'docx':
        return this.processDocxFile(file, options);
      case 'xlsx':
        return this.processXlsxFile(file, options);
      case 'pptx':
        return this.processPptxFile(file, options);
      default:
        throw new Error(`Unsupported import format: ${options.format}`);
    }
  }

  private async processTxtFile(file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    const text = file.buffer.toString('utf-8');
    
    return {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: text,
              }
            ]
          }
        ]
      },
      warnings: [],
      metadata: { originalFormat: 'txt', encoding: 'utf-8' },
      tags: ['imported', 'text'],
    };
  }

  private async processHtmlFile(file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    const html = file.buffer.toString('utf-8');
    
    // Basic HTML to ProseMirror conversion
    // In production, use a proper HTML parser like cheerio
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    
    return {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: textContent,
              }
            ]
          }
        ]
      },
      warnings: ['HTML formatting may not be fully preserved'],
      metadata: { originalFormat: 'html' },
      tags: ['imported', 'html'],
    };
  }

  private async processMarkdownFile(file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    const markdown = file.buffer.toString('utf-8');
    
    // Basic Markdown to ProseMirror conversion
    // In production, use a proper Markdown parser
    const lines = markdown.split('\n');
    const content = [];
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        content.push({
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: line.substring(2) }]
        });
      } else if (line.startsWith('## ')) {
        content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: line.substring(3) }]
        });
      } else if (line.trim()) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        });
      }
    }
    
    return {
      content: { type: 'doc', content },
      warnings: [],
      metadata: { originalFormat: 'markdown' },
      tags: ['imported', 'markdown'],
    };
  }

  private async processCsvFile(file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    const csv = file.buffer.toString('utf-8');
    const lines = csv.split('\n').filter(line => line.trim());
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    
    // Convert CSV to spreadsheet format
    const cells: Record<string, any> = {};
    
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellAddress = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
        cells[cellAddress] = {
          value: isNaN(Number(cell)) ? cell : Number(cell),
          type: isNaN(Number(cell)) ? 'text' : 'number',
        };
      });
    });
    
    return {
      content: {
        sheets: [
          {
            name: 'Imported Data',
            cells,
            rows: rows.length,
            cols: Math.max(...rows.map(row => row.length)),
          }
        ]
      },
      warnings: [],
      metadata: { originalFormat: 'csv', rowCount: rows.length },
      tags: ['imported', 'csv', 'spreadsheet'],
    };
  }

  private async processDocxFile(_file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    // Mock DOCX processing - in production, use mammoth.js or similar
    return {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'DOCX content would be extracted here using mammoth.js or similar library',
              }
            ]
          }
        ]
      },
      warnings: ['DOCX processing requires additional libraries'],
      metadata: { originalFormat: 'docx' },
      tags: ['imported', 'docx', 'document'],
    };
  }

  private async processXlsxFile(_file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    // Mock XLSX processing - in production, use xlsx library
    return {
      content: {
        sheets: [
          {
            name: 'Sheet1',
            cells: {
              'A1': { value: 'Sample', type: 'text' },
              'B1': { value: 'Data', type: 'text' },
              'A2': { value: 100, type: 'number' },
              'B2': { value: 200, type: 'number' },
            },
            rows: 100,
            cols: 26,
          }
        ]
      },
      warnings: ['XLSX processing requires additional libraries'],
      metadata: { originalFormat: 'xlsx' },
      tags: ['imported', 'xlsx', 'spreadsheet'],
    };
  }

  private async processPptxFile(_file: Express.Multer.File, _options: ImportOptions): Promise<any> {
    // Mock PPTX processing - in production, use pptx-parser or similar
    return {
      content: {
        slides: [
          {
            id: 'slide_1',
            title: 'Imported Slide',
            layout: 'title-content',
            elements: [
              {
                type: 'text',
                content: 'PPTX content would be extracted here',
                position: { x: 50, y: 50, width: 600, height: 400 },
              }
            ]
          }
        ]
      },
      warnings: ['PPTX processing requires additional libraries'],
      metadata: { originalFormat: 'pptx' },
      tags: ['imported', 'pptx', 'presentation'],
    };
  }

  private async processExportDocument(
    document: any,
    options: ExportOptions
  ): Promise<{ filePath: string; fileSize: number }> {
    // Mock export processing - implement actual format conversion
    const exportContent = this.generateExportContent(document, options);
    const fileName = `${document.id}_${Date.now()}.${options.format}`;
    const filePath = path.join('/tmp', fileName);
    
    // Write export content to file
    await fs.writeFile(filePath, exportContent);
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      fileSize: stats.size,
    };
  }

  private generateExportContent(document: any, options: ExportOptions): string {
    switch (options.format) {
      case 'txt':
        return this.extractTextFromContent(document.content);
      case 'html':
        return this.convertToHtml(document.content);
      case 'md':
        return this.convertToMarkdown(document.content);
      case 'csv':
        return this.convertToCsv(document.content);
      default:
        return JSON.stringify(document.content, null, 2);
    }
  }

  private extractTextFromContent(content: any): string {
    if (typeof content === 'string') return content;
    
    if (content?.type === 'doc' && content?.content) {
      return this.extractTextFromProseMirror(content.content);
    }
    
    return JSON.stringify(content);
  }

  private extractTextFromProseMirror(content: any[]): string {
    let text = '';
    
    for (const node of content) {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.content) {
        text += this.extractTextFromProseMirror(node.content);
      }
      text += '\n';
    }
    
    return text.trim();
  }

  private convertToHtml(content: any): string {
    // Basic conversion - implement proper ProseMirror to HTML conversion
    const text = this.extractTextFromContent(content);
    return `<!DOCTYPE html>
<html>
<head>
    <title>Exported Document</title>
</head>
<body>
    <pre>${text}</pre>
</body>
</html>`;
  }

  private convertToMarkdown(content: any): string {
    // Basic conversion - implement proper ProseMirror to Markdown conversion
    return this.extractTextFromContent(content);
  }

  private convertToCsv(content: any): string {
    if (content?.sheets) {
      const sheet = content.sheets[0];
      const rows: string[] = [];
      
      // Convert cells to CSV format
      for (let row = 1; row <= sheet.rows; row++) {
        const rowData: string[] = [];
        for (let col = 0; col < sheet.cols; col++) {
          const cellAddress = `${String.fromCharCode(65 + col)}${row}`;
          const cell = sheet.cells[cellAddress];
          rowData.push(cell?.value?.toString() || '');
        }
        rows.push(rowData.join(','));
      }
      
      return rows.join('\n');
    }
    
    return this.extractTextFromContent(content);
  }

  private mapFormatToDocumentType(format: string): 'DOCUMENT' | 'SPREADSHEET' | 'PRESENTATION' {
    const formatMap: Record<string, 'DOCUMENT' | 'SPREADSHEET' | 'PRESENTATION'> = {
      'docx': 'DOCUMENT',
      'pdf': 'DOCUMENT',
      'txt': 'DOCUMENT',
      'html': 'DOCUMENT',
      'md': 'DOCUMENT',
      'odt': 'DOCUMENT',
      'xlsx': 'SPREADSHEET',
      'csv': 'SPREADSHEET',
      'ods': 'SPREADSHEET',
      'pptx': 'PRESENTATION',
      'odp': 'PRESENTATION',
    };
    
    return formatMap[format] || 'DOCUMENT';
  }

  private extractTitleFromFilename(filename: string): string {
    return path.parse(filename).name;
  }

  private async generateDocumentNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.officeDocument.count({ where: { tenantId } });
    return `DOC${String(count + 1).padStart(6, '0')}`;
  }

  private async convertContentFormat(
    content: any,
    fromType: string,
    toType: string
  ): Promise<any> {
    // Basic format conversion logic
    if (fromType === toType) return content;
    
    // Implement actual format conversion logic here
    return content;
  }

  private async generateDownloadUrl(filePath: string, _fileName: string): Promise<string> {
    // Generate secure download URL - implement with your file storage solution
    return `/api/office/download/${path.basename(filePath)}`;
  }

  private async scheduleCloudSync(
    tenantId: string,
    integrationId: string,
    integration: CloudIntegration
  ): Promise<void> {
    // Schedule recurring sync job
    const interval = integration.syncSettings.syncInterval || 60; // minutes
    
    await this.importExportQueue.add('cloud-sync', {
      tenantId,
      integrationId,
      integration,
      direction: 'bidirectional',
    }, {
      repeat: { every: interval * 60 * 1000 },
      attempts: 3,
    });
  }

  private async logImportExportActivity(
    tenantId: string,
    userId: string,
    operation: string,
    metadata: any
  ): Promise<void> {
    const activity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      ...metadata,
      createdAt: new Date(),
    };

    // Store in Redis for quick access
    const historyKey = `import_export_history:${tenantId}:${userId}`;
    await this.redis.lpush(historyKey, JSON.stringify(activity));
    await this.redis.ltrim(historyKey, 0, 99); // Keep last 100 activities
  }
}
