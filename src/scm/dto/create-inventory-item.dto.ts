// path: src/scm/dto/create-inventory-item.dto.ts
// purpose: DTO for creating inventory items
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum TrackingMethod {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  AVERAGE = 'AVERAGE',
  SPECIFIC = 'SPECIFIC'
}

export class CreateInventoryItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  unitOfMeasure: string;

  @Type(() => Number)
  @IsNumber()
  currentStock: number;

  @Type(() => Number)
  @IsNumber()
  minimumStock: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maximumStock?: number;

  @Type(() => Number)
  @IsNumber()
  reorderPoint: number;

  @Type(() => Number)
  @IsNumber()
  unitCost: number;

  @Type(() => Number)
  @IsNumber()
  averageCost: number;

  @Type(() => Number)
  @IsNumber()
  lastCost: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(TrackingMethod)
  trackingMethod?: TrackingMethod;

  @IsOptional()
  attributes?: any;
}