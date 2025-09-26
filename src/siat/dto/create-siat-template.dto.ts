// path: backend/src/siat/dto/create-siat-template.dto.ts
// purpose: DTO for creating SIAT templates
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiatTemplateDto {
  @ApiProperty({ description: 'Name of the template' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the template' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Type of the template' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Template configuration object' })
  @IsObject()
  template: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tags for categorization', default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @ApiPropertyOptional({ description: 'Whether this is a system template', default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean = false;
}