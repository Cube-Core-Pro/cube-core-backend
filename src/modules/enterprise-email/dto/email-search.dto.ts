// path: backend/src/modules/enterprise-email/dto/email-search.dto.ts
// purpose: DTO for searching emails
// dependencies: class-validator, swagger

import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class EmailSearchDto {
  @ApiProperty({ description: 'Search query', required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ description: 'Search in from field', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ description: 'Search in subject field', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Filter by tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Has attachments filter', required: false })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  @ApiProperty({ description: 'Date range filter', required: false })
  @IsOptional()
  @IsObject()
  dateRange?: {
    from: Date;
    to: Date;
  };

  @ApiProperty({ description: 'Results limit', required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ description: 'Results offset', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}