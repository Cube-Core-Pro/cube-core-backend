// path: src/hr/dto/create-performance-review.dto.ts
// purpose: DTO for creating performance reviews
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewType {
  ANNUAL = 'ANNUAL',
  QUARTERLY = 'QUARTERLY',
  PROBATIONARY = 'PROBATIONARY',
  PROJECT_BASED = 'PROJECT_BASED'
}

export enum ReviewStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED'
}

export class CreatePerformanceReviewDto {
  @IsString()
  employeeId: string;

  @IsString()
  reviewerId: string;

  @IsString()
  period: string;

  @IsOptional()
  @IsEnum(ReviewType)
  type?: ReviewType;

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  overallRating?: number;

  @IsOptional()
  goals?: any;

  @IsOptional()
  achievements?: any;

  @IsOptional()
  areasForImprovement?: any;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  employeeComments?: string;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}