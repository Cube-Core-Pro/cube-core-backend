// path: backend/src/modules/automation/dto/automation-query.dto.ts
// purpose: Common query DTO for automation endpoints
// dependencies: class-validator, class-transformer

import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by type',
    example: 'workflow',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'finance',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    example: 'high',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({
    description: 'Filter by provider (for integrations)',
    example: 'salesforce',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Filter by triggered by (for executions)',
    example: 'manual',
  })
  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @ApiPropertyOptional({
    description: 'Search query',
    example: 'approval workflow',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Time period for analytics',
    example: 'month',
    enum: ['hour', 'day', 'week', 'month', 'quarter', 'year'],
  })
  @IsOptional()
  @IsString()
  period?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

  @ApiPropertyOptional({
    description: 'Modules to include in analytics',
    example: ['workflows', 'processes'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({
    description: 'Metrics to include',
    example: ['performance', 'reliability'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Number of items to return',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}