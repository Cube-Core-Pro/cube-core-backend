// path: backend/src/modules/enterprise-email/dto/send-email.dto.ts
// purpose: DTO for sending enterprise emails
// dependencies: class-validator, class-transformer, swagger

import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EmailPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
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

  @ApiProperty({ description: 'Attachment file path or buffer' })
  data: string | Buffer;

  @ApiProperty({ description: 'Content ID for inline attachments', required: false })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiProperty({ description: 'Is inline attachment', required: false })
  @IsOptional()
  @IsBoolean()
  isInline?: boolean;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Email recipients' })
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Email body (plain text)' })
  @IsString()
  body: string;

  @ApiProperty({ description: 'Email body (HTML)', required: false })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiProperty({ description: 'CC recipients', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiProperty({ description: 'BCC recipients', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @ApiProperty({ description: 'Reply-to address', required: false })
  @IsOptional()
  @IsString()
  replyTo?: string;

  @ApiProperty({ 
    description: 'Email priority',
    enum: EmailPriority,
    required: false,
    default: EmailPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @ApiProperty({ description: 'Email attachments', required: false })
  @IsOptional()
  @IsArray()
  attachments?: EmailAttachmentDto[];

  @ApiProperty({ description: 'Email tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Request read receipt', required: false })
  @IsOptional()
  @IsBoolean()
  requestReadReceipt?: boolean;

  @ApiProperty({ description: 'Mark as confidential', required: false })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @ApiProperty({ description: 'Include signature', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  includeSignature?: boolean;

  @ApiProperty({ description: 'Schedule email for later', required: false })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  scheduledAt?: Date;

  @ApiProperty({ description: 'Email template ID', required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: 'Template variables', required: false })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}