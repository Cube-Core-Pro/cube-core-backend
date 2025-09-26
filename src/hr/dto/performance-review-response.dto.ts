// path: src/hr/dto/performance-review-response.dto.ts
// purpose: Structured response DTO for performance review operations
// dependencies: class-validator, swagger

import { ApiProperty } from '@nestjs/swagger';
import { PerformanceReviewEntity } from '../entities/performance-review.entity';

export class PerformanceReviewResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: 'object' })
  data?: PerformanceReviewEntity;

  @ApiProperty({ example: 'Performance review created successfully' })
  message?: string;
}