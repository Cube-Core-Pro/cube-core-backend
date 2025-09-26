// path: backend/src/enterprise-webmail/dto/create-email.dto.ts
// purpose: DTO for creating and sending emails
// dependencies: class-validator, class-transformer

import { IsString, IsArray, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmailPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum EmailType {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  TEMPLATE = 'TEMPLATE'
}

export class EmailAttachmentDto {
  @ApiProperty({ description: 'Attachment filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Attachment content type' })
  @IsString()
  contentType: string;

  @ApiProperty({ description: 'Attachment size in bytes' })
  size: number;

  @ApiPropertyOptional({ description: 'Attachment content (base64 encoded)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Attachment URL if stored externally' })
  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateEmailDto {
  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body content' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'HTML body content' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiProperty({ description: 'Recipient email addresses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiPropertyOptional({ description: 'CC email addresses', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC email addresses', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsString()
  replyTo?: string;

  @ApiProperty({ description: 'Email priority', enum: EmailPriority, default: EmailPriority.NORMAL })
  @IsEnum(EmailPriority)
  priority: EmailPriority = EmailPriority.NORMAL;

  @ApiPropertyOptional({ description: 'Email attachments', type: [EmailAttachmentDto] })
  @IsOptional()
  @IsArray()
  attachments?: EmailAttachmentDto[];

  @ApiPropertyOptional({ description: 'Email tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Folder ID where email will be stored' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Whether to request read receipt', default: false })
  @IsOptional()
  @IsBoolean()
  requestReadReceipt?: boolean = false;

  @ApiPropertyOptional({ description: 'Whether email is confidential', default: false })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean = false;

  @ApiPropertyOptional({ description: 'Schedule send time (for delayed sending)' })
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Email template ID if using template' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Template variables for dynamic content' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Email metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}