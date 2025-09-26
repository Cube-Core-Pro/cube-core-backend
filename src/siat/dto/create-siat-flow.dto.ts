// path: backend/src/siat/dto/create-siat-flow.dto.ts
// purpose: DTO for creating SIAT flows
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiatFlowDto {
  @ApiProperty({ description: 'Name of the SIAT flow' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the SIAT flow' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Type of the flow', default: 'WORKFLOW' })
  @IsString()
  type: string = 'WORKFLOW';

  @ApiProperty({ description: 'AI prompt for generating the flow' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Generated code from the prompt' })
  @IsOptional()
  @IsString()
  generatedCode?: string;

  @ApiPropertyOptional({ description: 'Configuration object', default: {} })
  @IsOptional()
  @IsObject()
  config?: Record<string, any> = {};

  @ApiPropertyOptional({ description: 'Flow steps array', default: [] })
  @IsOptional()
  @IsArray()
  steps?: any[] = [];

  @ApiPropertyOptional({ description: 'Tags for categorization', default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @ApiPropertyOptional({ description: 'Whether the flow is public', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;
}