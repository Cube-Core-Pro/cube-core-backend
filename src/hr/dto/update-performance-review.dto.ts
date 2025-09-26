// path: src/hr/dto/update-performance-review.dto.ts
// purpose: DTO for updating performance reviews
// dependencies: class-validator, swagger

import { PartialType } from '@nestjs/swagger';
import { CreatePerformanceReviewDto } from './create-performance-review.dto';

export class UpdatePerformanceReviewDto extends PartialType(CreatePerformanceReviewDto) {}