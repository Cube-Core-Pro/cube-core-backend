// path: backend/src/office/dto/office.dto.ts
// purpose: Office Suite DTOs for documents, spreadsheets, presentations
// dependencies: class-validator, class-transformer, Swagger

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum DocumentType {
  DOCUMENT = 'DOCUMENT',
  SPREADSHEET = 'SPREADSHEET',
  PRESENTATION = 'PRESENTATION',
  FORM = 'FORM',
  TEMPLATE = 'TEMPLATE',
}

export enum DocumentFormat {
  DOCX = 'DOCX',
  PDF = 'PDF',
  XLSX = 'XLSX',
  PPTX = 'PPTX',
  ODT = 'ODT',
  ODS = 'ODS',
  ODP = 'ODP',
  HTML = 'HTML',
  TXT = 'TXT',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SharePermission {
  VIEW = 'VIEW',
  COMMENT = 'COMMENT',
  EDIT = 'EDIT',
  ADMIN = 'ADMIN',
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ enum: DocumentType, description: 'Type of document' })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ enum: DocumentFormat, description: 'Document format' })
  @IsOptional()
  @IsEnum(DocumentFormat)
  format?: DocumentFormat;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Folder ID' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Initial content' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiPropertyOptional({ description: 'Document tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Indicates if the document is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Allow collaboration for this document' })
  @IsOptional()
  @IsBoolean()
  allowCollaboration?: boolean;

  @ApiPropertyOptional({ description: 'Document settings metadata' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Document content' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Document status' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Document tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Folder ID' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ enum: DocumentFormat, description: 'Document format' })
  @IsOptional()
  @IsEnum(DocumentFormat)
  format?: DocumentFormat;

  @ApiPropertyOptional({ description: 'Indicates if the document is public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Allow collaboration for this document' })
  @IsOptional()
  @IsBoolean()
  allowCollaboration?: boolean;

  @ApiPropertyOptional({ description: 'Document settings metadata' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class ShareDocumentDto {
  @ApiProperty({ description: 'User ID or email to share with' })
  @IsString()
  userIdOrEmail: string;

  @ApiProperty({ enum: SharePermission, description: 'Permission level' })
  @IsEnum(SharePermission)
  permission: SharePermission;

  @ApiPropertyOptional({ description: 'Share message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Expiration date for share' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  expiresAt?: Date;
}

export class CreateFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Folder description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent folder ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Folder color' })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DocumentType, description: 'Template type' })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template content' })
  @IsObject()
  content: any;

  @ApiPropertyOptional({ description: 'Template preview image' })
  @IsOptional()
  @IsString()
  previewImage?: string;

  @ApiPropertyOptional({ description: 'Template category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Template tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is template public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class CreateSpreadsheetDto {
  @ApiProperty({ description: 'Spreadsheet name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Spreadsheet description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Initial sheet configuration' })
  @IsOptional()
  @IsObject()
  sheets?: any;
}

export class CreatePresentationDto {
  @ApiProperty({ description: 'Presentation title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Presentation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Slides payload' })
  @IsOptional()
  @IsArray()
  slides?: any[];
}

export class CollaborationEventDto {
  @ApiProperty({ description: 'Document ID' })
  @IsUUID()
  documentId: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Event data' })
  @IsObject()
  data: any;

  @ApiPropertyOptional({ description: 'Cursor position' })
  @IsOptional()
  @IsObject()
  cursor?: any;
}

export class CommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Position in document' })
  @IsOptional()
  @IsObject()
  position?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reply to comment ID' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class CollaborationInviteDto {
  @ApiProperty({ description: 'Document ID' })
  @IsUUID()
  documentId: string;

  @ApiProperty({ description: 'Emails to invite' })
  @IsArray()
  @IsString({ each: true })
  emails: string[];

  @ApiProperty({ enum: SharePermission, description: 'Permission level for invited collaborators' })
  @IsEnum(SharePermission)
  permission: SharePermission;

  @ApiPropertyOptional({ description: 'Invitation message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Invitation expiration' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  expiresAt?: Date;
}

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DocumentType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Filter by folder' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by owner' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Show only shared documents' })
  @IsOptional()
  @IsBoolean()
  sharedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'updatedAt';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
