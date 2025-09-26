// path: backend/src/modules/collaboration/dto/collaboration-metrics-query.dto.ts
// purpose: DTO for collaboration metrics query parameters
// dependencies: class-validator, class-transformer, swagger

import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CollaborationMetricsQueryDto {
  @ApiProperty({
    description: 'Start date for metrics range',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  from?: Date;

  @ApiProperty({
    description: 'End date for metrics range',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  to?: Date;
}