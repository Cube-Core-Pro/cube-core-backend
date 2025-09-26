// path: backend/src/common/dto/base.dto.ts
// purpose: Base DTOs with enterprise-grade validation
// dependencies: class-validator, class-transformer

import {
  IsOptional,
  IsString,
  IsNumber,
  
  IsUUID,
  IsDateString,
  IsArray,
  
  Min,
  Max,
  Length,
  IsEnum,
  IsEmail,
  IsUrl,
  Matches,
} from 'class-validator';
import {  Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Trim, ToLowerCase, ToUpperCase } from '../validators/validation.utils';

export class BaseDto {
  @ApiPropertyOptional({ description: 'Record ID' })
  @IsOptional()
  @IsUUID(4, { message: 'ID must be a valid UUID' })
  id?: string;

  @ApiPropertyOptional({ description: 'Creation timestamp' })
  @IsOptional()
  @IsDateString({}, { message: 'Created at must be a valid ISO date string' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Last update timestamp' })
  @IsOptional()
  @IsDateString({}, { message: 'Updated at must be a valid ISO date string' })
  updatedAt?: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Page number (1-based)', 
    minimum: 1, 
    maximum: 10000,
    default: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Max(10000, { message: 'Page cannot exceed 10000' })
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page', 
    minimum: 1, 
    maximum: 1000,
    default: 20 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(1000, { message: 'Limit cannot exceed 1000' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @Length(1, 50, { message: 'Sort by must be between 1 and 50 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.]*$/, { 
    message: 'Sort by must be a valid field name' 
  })
  sortBy?: string;

  @ApiPropertyOptional({ 
    description: 'Sort order', 
    enum: ['asc', 'desc'],
    default: 'asc' 
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be either asc or desc' })
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  @Length(1, 100, { message: 'Search must be between 1 and 100 characters' })
  @Trim()
  search?: string;
}

export class FilterDto {
  @ApiPropertyOptional({ description: 'Field to filter by' })
  @IsString({ message: 'Field must be a string' })
  @Length(1, 50, { message: 'Field must be between 1 and 50 characters' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.]*$/, { 
    message: 'Field must be a valid field name' 
  })
  field: string;

  @ApiPropertyOptional({ 
    description: 'Filter operator',
    enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'ilike', 'between', 'exists', 'null']
  })
  @IsEnum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'like', 'ilike', 'between', 'exists', 'null'], {
    message: 'Operator must be a valid filter operator'
  })
  operator: string;

  @ApiPropertyOptional({ description: 'Filter value' })
  value: any;

  @ApiPropertyOptional({ 
    description: 'Value type',
    enum: ['string', 'number', 'boolean', 'date']
  })
  @IsOptional()
  @IsEnum(['string', 'number', 'boolean', 'date'], {
    message: 'Type must be string, number, boolean, or date'
  })
  type?: 'string' | 'number' | 'boolean' | 'date';
}

export class BulkOperationDto {
  @ApiProperty({ description: 'Array of IDs to operate on' })
  @IsArray({ message: 'IDs must be an array' })
  @IsUUID(4, { each: true, message: 'Each ID must be a valid UUID' })
  ids: string[];

  @ApiPropertyOptional({ description: 'Operation to perform' })
  @IsOptional()
  @IsString({ message: 'Operation must be a string' })
  @Length(1, 50, { message: 'Operation must be between 1 and 50 characters' })
  operation?: string;

  @ApiPropertyOptional({ description: 'Additional data for the operation' })
  @IsOptional()
  data?: Record<string, any>;
}

export class ContactInfoDto {
  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @Length(5, 254, { message: 'Email must be between 5 and 254 characters' })
  @ToLowerCase()
  @Trim()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number in international format' })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\+[1-9]\d{1,14}$/, { 
    message: 'Phone must be in international format (e.g., +1234567890)' 
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  @Length(1, 255, { message: 'Website must be between 1 and 255 characters' })
  website?: string;
}

export class AddressDto {
  @ApiPropertyOptional({ description: 'Street address line 1' })
  @IsOptional()
  @IsString({ message: 'Street 1 must be a string' })
  @Length(1, 100, { message: 'Street 1 must be between 1 and 100 characters' })
  @Trim()
  street1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString({ message: 'Street 2 must be a string' })
  @Length(1, 100, { message: 'Street 2 must be between 1 and 100 characters' })
  @Trim()
  street2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @Length(1, 50, { message: 'City must be between 1 and 50 characters' })
  @Trim()
  city?: string;

  @ApiPropertyOptional({ description: 'State or province' })
  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @Length(1, 50, { message: 'State must be between 1 and 50 characters' })
  @Trim()
  state?: string;

  @ApiPropertyOptional({ description: 'Postal or ZIP code' })
  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  @Length(1, 20, { message: 'Postal code must be between 1 and 20 characters' })
  @Trim()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  @Length(2, 2, { message: 'Country must be a 2-character ISO code' })
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a valid ISO 3166-1 alpha-2 code' })
  @ToUpperCase()
  country?: string;
}

export class MoneyDto {
  @ApiProperty({ description: 'Amount in cents (to avoid floating point issues)' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be non-negative' })
  @Max(999999999999, { message: 'Amount is too large' })
  amount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsString({ message: 'Currency must be a string' })
  @Length(3, 3, { message: 'Currency must be a 3-character ISO code' })
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a valid ISO 4217 code' })
  @ToUpperCase()
  currency: string;
}

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (ISO 8601)' })
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate: string;

  @ApiProperty({ description: 'End date (ISO 8601)' })
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate: string;
}

export class FileUploadDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString({ message: 'Filename must be a string' })
  @Length(1, 255, { message: 'Filename must be between 1 and 255 characters' })
  filename: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString({ message: 'MIME type must be a string' })
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, {
    message: 'MIME type must be valid'
  })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber({}, { message: 'Size must be a number' })
  @Min(1, { message: 'Size must be at least 1 byte' })
  @Max(100 * 1024 * 1024, { message: 'Size cannot exceed 100MB' })
  size: number;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(1, 500, { message: 'Description must be between 1 and 500 characters' })
  @Trim()
  description?: string;
}

export class MetadataDto {
  @ApiPropertyOptional({ description: 'Custom metadata as key-value pairs' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Length(1, 50, { each: true, message: 'Each tag must be between 1 and 50 characters' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Notes or comments' })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @Length(1, 1000, { message: 'Notes must be between 1 and 1000 characters' })
  @Trim()
  notes?: string;
}

export class AuditDto {
  @ApiPropertyOptional({ description: 'User who created the record' })
  @IsOptional()
  @IsUUID(4, { message: 'Created by must be a valid UUID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'User who last updated the record' })
  @IsOptional()
  @IsUUID(4, { message: 'Updated by must be a valid UUID' })
  updatedBy?: string;

  @ApiPropertyOptional({ description: 'Reason for the change' })
  @IsOptional()
  @IsString({ message: 'Change reason must be a string' })
  @Length(1, 255, { message: 'Change reason must be between 1 and 255 characters' })
  @Trim()
  changeReason?: string;
}

export class TenantDto {
  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenant operations' })
  @IsOptional()
  @IsUUID(4, { message: 'Tenant ID must be a valid UUID' })
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Tenant slug for URL-friendly identification' })
  @IsOptional()
  @IsString({ message: 'Tenant slug must be a string' })
  @Length(3, 50, { message: 'Tenant slug must be between 3 and 50 characters' })
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'Tenant slug must be lowercase letters, numbers, and hyphens only'
  })
  tenantSlug?: string;
}