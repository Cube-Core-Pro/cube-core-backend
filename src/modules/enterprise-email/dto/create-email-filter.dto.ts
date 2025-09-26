// path: backend/src/modules/enterprise-email/dto/create-email-filter.dto.ts
// purpose: DTO for creating email filters
// dependencies: class-validator, swagger

import { IsString, IsOptional, IsObject, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmailFilterDto {
  @ApiProperty({ description: 'Filter name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Filter description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Filter conditions' })
  @IsObject()
  conditions: Record<string, any>;

  @ApiProperty({ description: 'Filter actions' })
  @IsObject()
  actions: Record<string, any>;

  @ApiProperty({ description: 'Filter priority', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({ description: 'Is filter active', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}