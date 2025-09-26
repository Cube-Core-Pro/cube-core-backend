// path: backend/src/modules/office/office.service.ts
// purpose: Facade for Office Suite operations leveraging shared services
// dependencies: Office shared services (documents, folders, templates)

import { Injectable } from '@nestjs/common';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateFolderDto,
  DocumentQueryDto,
  DocumentType,
  DocumentFormat,
} from '../../office/dto/office.dto';
import { DocumentService } from './services/document.service';
import { FolderService } from '../../office/services/folder.service';
import { TemplateService } from '../../office/services/template.service';

const MIME_BY_FORMAT: Record<string, string> = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  PDF: 'application/pdf',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  HTML: 'text/html',
  TXT: 'text/plain',
};

@Injectable()
export class OfficeService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly folderService: FolderService,
    private readonly templateService: TemplateService,
  ) {}

  async getDocuments(tenantId: string, userId: string, query: DocumentQueryDto) {
    return this.documentService.findAll(tenantId, userId, query);
  }

  async getDocument(tenantId: string, userId: string, documentId: string) {
    return this.documentService.findOne(tenantId, userId, documentId);
  }

  async deleteDocument(tenantId: string, userId: string, documentId: string) {
    return this.documentService.remove(tenantId, userId, documentId);
  }

  async downloadDocument(tenantId: string, userId: string, documentId: string) {
    const document = await this.documentService.findOne(tenantId, userId, documentId);
    const serialized = JSON.stringify(document.content ?? {}, null, 2);
    const buffer = Buffer.from(serialized, 'utf-8');
    const extension = (document.format || DocumentFormat.DOCX).toLowerCase();
    const mimeType = MIME_BY_FORMAT[document.format as string] || 'application/json';

    return {
      file: buffer,
      filename: `${document.title}.${extension}`,
      mimeType,
    };
  }

  async uploadDocument(tenantId: string, userId: string, file: Express.Multer.File) {
    return this.documentService.import(tenantId, userId, file);
  }

  async createDocument(tenantId: string, userId: string, dto: CreateDocumentDto) {
    return this.documentService.create(tenantId, userId, dto);
  }

  async updateDocument(
    tenantId: string,
    userId: string,
    documentId: string,
    dto: UpdateDocumentDto,
  ) {
    return this.documentService.update(tenantId, userId, documentId, dto);
  }

  async getFolders(tenantId: string, userId: string, filters?: { parentId?: string; search?: string }) {
    return this.folderService.list(tenantId, userId, filters);
  }

  async createFolder(tenantId: string, userId: string, dto: CreateFolderDto) {
    return this.folderService.create(tenantId, userId, dto.name, dto.description, dto.parentId);
  }

  async deleteFolder(tenantId: string, userId: string, folderId: string) {
    return this.folderService.remove(tenantId, userId, folderId);
  }

  async getTemplates(tenantId: string, filters: any = {}) {
    return this.templateService.findAll(tenantId, filters);
  }

  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    documentData: { name?: string; description?: string; folderId?: string },
  ) {
    const template = await this.templateService.findOne(tenantId, templateId);
    const createDto: CreateDocumentDto = {
      title: documentData.name || `${template.name} Copy`,
      description: documentData.description || template.description || undefined,
      type: template.type as DocumentType,
      format: (template.type === DocumentType.SPREADSHEET
        ? DocumentFormat.XLSX
        : template.type === DocumentType.PRESENTATION
          ? DocumentFormat.PPTX
          : DocumentFormat.DOCX),
      content: template.content,
      folderId: documentData.folderId,
      tags: template.tags || [],
      isPublic: false,
      allowCollaboration: true,
      settings: {},
    };

    return this.documentService.create(tenantId, userId, createDto);
  }

  async getVersionHistory(tenantId: string, userId: string, documentId: string) {
    return this.documentService.getVersions(tenantId, userId, documentId);
  }

  async restoreVersion(
    tenantId: string,
    userId: string,
    documentId: string,
    versionId: string,
  ) {
    return this.documentService.restoreVersion(tenantId, userId, documentId, versionId);
  }
}
