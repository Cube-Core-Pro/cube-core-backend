// path: backend/src/modules/webmail/dto/webmail.dto.ts
// purpose: Data Transfer Objects for Enterprise WebMail operations
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, IsObject, IsEmail, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {  Type } from 'class-transformer';

export enum EmailPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum EmailStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  READ = 'READ',
  REPLIED = 'REPLIED',
  FORWARDED = 'FORWARDED',
  DELETED = 'DELETED',
  SPAM = 'SPAM',
  ARCHIVED = 'ARCHIVED',
}

export enum FolderType {
  INBOX = 'INBOX',
  SENT = 'SENT',
  DRAFTS = 'DRAFTS',
  TRASH = 'TRASH',
  SPAM = 'SPAM',
  ARCHIVE = 'ARCHIVE',
  CUSTOM = 'CUSTOM',
}

export enum FilterAction {
  MOVE_TO_FOLDER = 'MOVE_TO_FOLDER',
  MARK_AS_READ = 'MARK_AS_READ',
  MARK_AS_SPAM = 'MARK_AS_SPAM',
  DELETE = 'DELETE',
  FORWARD = 'FORWARD',
  REPLY = 'REPLY',
  FLAG = 'FLAG',
  LABEL = 'LABEL',
}

export enum BulkAction {
  MARK_READ = 'MARK_READ',
  MARK_UNREAD = 'MARK_UNREAD',
  DELETE = 'DELETE',
  MOVE = 'MOVE',
  ARCHIVE = 'ARCHIVE',
  SPAM = 'SPAM',
  NOT_SPAM = 'NOT_SPAM',
  STAR = 'STAR',
  UNSTAR = 'UNSTAR',
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email addresses' })
  @IsArray()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body (HTML)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Email body (HTML alternative)' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({
    enum: EmailPriority,
    description: 'Email priority',
    default: EmailPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiPropertyOptional({ description: 'Request read receipt' })
  @IsOptional()
  @IsBoolean()
  readReceipt?: boolean;

  @ApiPropertyOptional({ description: 'Schedule send time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Email template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Email tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Folder ID to save sent email' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Email encryption settings' })
  @IsOptional()
  @IsObject()
  encryption?: {
    enabled: boolean;
    method: 'PGP' | 'S/MIME';
    publicKey?: string;
  };

  @ApiPropertyOptional({ description: 'Digital signature settings' })
  @IsOptional()
  @IsObject()
  signature?: {
    enabled: boolean;
    method: 'PGP' | 'S/MIME';
    privateKey?: string;
  };
}

export class UpdateEmailDto {
  @ApiPropertyOptional({ description: 'Email subject' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Email body (HTML)' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({ enum: EmailPriority, description: 'Email priority' })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiPropertyOptional({ description: 'Mark as read/unread' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Mark as starred/unstarred' })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional({ description: 'Mark as spam/not spam' })
  @IsOptional()
  @IsBoolean()
  isSpam?: boolean;

  @ApiPropertyOptional({ description: 'Email tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Folder ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Schedule send time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class EmailQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Folder ID filter' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ enum: EmailStatus, description: 'Email status filter' })
  @IsOptional()
  @IsEnum(EmailStatus)
  status?: EmailStatus;

  @ApiPropertyOptional({ enum: EmailPriority, description: 'Email priority filter' })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiPropertyOptional({ description: 'Sender email filter' })
  @IsOptional()
  @IsEmail()
  from?: string;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Has attachments filter' })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiPropertyOptional({ description: 'Is starred filter' })
  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @ApiPropertyOptional({ description: 'Tags filter' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class EmailSearchDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Date from filter' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to filter' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Folder ID filter' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Has attachments filter' })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiPropertyOptional({ description: 'Search in subject' })
  @IsOptional()
  @IsBoolean()
  searchSubject?: boolean;

  @ApiPropertyOptional({ description: 'Search in body' })
  @IsOptional()
  @IsBoolean()
  searchBody?: boolean;

  @ApiPropertyOptional({ description: 'Search in sender' })
  @IsOptional()
  @IsBoolean()
  searchSender?: boolean;

  @ApiPropertyOptional({ description: 'Search in attachments' })
  @IsOptional()
  @IsBoolean()
  searchAttachments?: boolean;

  @ApiPropertyOptional({ description: 'Date range filter' })
  @IsOptional()
  @IsObject()
  dateRange?: {
    from: string;
    to: string;
  };

  @ApiPropertyOptional({ description: 'Folder IDs to search in' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  folderIds?: string[];

  @ApiPropertyOptional({ description: 'Advanced search options' })
  @IsOptional()
  @IsObject()
  advanced?: {
    exactPhrase?: boolean;
    caseSensitive?: boolean;
    includeDeleted?: boolean;
    includeSpam?: boolean;
  };
}

export class BulkEmailActionDto {
  @ApiProperty({ description: 'Email IDs to perform action on' })
  @IsArray()
  @IsString({ each: true })
  emailIds: string[];

  @ApiProperty({ enum: BulkAction, description: 'Action to perform' })
  @IsEnum(BulkAction)
  action: BulkAction;

  @ApiPropertyOptional({ description: 'Target folder ID (for MOVE action)' })
  @IsOptional()
  @IsString()
  targetFolderId?: string;

  @ApiPropertyOptional({ description: 'Additional action parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class CreateFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Folder description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FolderType, description: 'Folder type' })
  @IsEnum(FolderType)
  type: FolderType;

  @ApiPropertyOptional({ description: 'Parent folder ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Folder color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Folder icon' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Auto-archive settings' })
  @IsOptional()
  @IsObject()
  autoArchive?: {
    enabled: boolean;
    afterDays: number;
    targetFolderId?: string;
  };
}

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Template body (HTML)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Plain text body' })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({ description: 'Template category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Template tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  variables?: Array<{
    name: string;
    type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
    required: boolean;
    defaultValue?: any;
    description?: string;
  }>;

  @ApiPropertyOptional({ description: 'Is shared template' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class CreateFilterDto {
  @ApiProperty({ description: 'Filter name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Filter description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Filter conditions' })
  @IsArray()
  @IsObject({ each: true })
  conditions: Array<{
    field: 'FROM' | 'TO' | 'SUBJECT' | 'BODY' | 'ATTACHMENT' | 'SIZE' | 'DATE';
    operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'GREATER_THAN' | 'LESS_THAN' | 'REGEX';
    value: string;
    caseSensitive?: boolean;
  }>;

  @ApiProperty({ description: 'Filter logic' })
  @IsEnum(['AND', 'OR'])
  logic: 'AND' | 'OR';

  @ApiProperty({ description: 'Filter actions' })
  @IsArray()
  @IsObject({ each: true })
  actions: Array<{
    type: FilterAction;
    parameters: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: 'Filter priority' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ description: 'Is filter active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Apply to existing emails' })
  @IsOptional()
  @IsBoolean()
  applyToExisting?: boolean;
}

export class EmailAccountDto {
  @ApiProperty({ description: 'Account name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'IMAP settings' })
  @IsObject()
  imapSettings: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };

  @ApiProperty({ description: 'SMTP settings' })
  @IsObject()
  smtpSettings: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };

  @ApiPropertyOptional({ description: 'Sync settings' })
  @IsOptional()
  @IsObject()
  syncSettings?: {
    enabled: boolean;
    interval: number; // minutes
    syncFolders: string[];
    maxEmails: number;
  };

  @ApiPropertyOptional({ description: 'Security settings' })
  @IsOptional()
  @IsObject()
  securitySettings?: {
    enableTLS: boolean;
    enableOAuth: boolean;
    oauthProvider?: 'GOOGLE' | 'MICROSOFT' | 'YAHOO';
    oauthToken?: string;
  };
}

export class EmailSignatureDto {
  @ApiProperty({ description: 'Signature name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Signature content (HTML)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Is default signature' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Use for replies' })
  @IsOptional()
  @IsBoolean()
  useForReplies?: boolean;

  @ApiPropertyOptional({ description: 'Use for forwards' })
  @IsOptional()
  @IsBoolean()
  useForForwards?: boolean;
}

export class EmailRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule conditions' })
  @IsArray()
  @IsObject({ each: true })
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
  }>;

  @ApiProperty({ description: 'Rule actions' })
  @IsArray()
  @IsObject({ each: true })
  actions: Array<{
    type: string;
    parameters: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: 'Rule priority' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is rule active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
