// path: src/scm/dto/create-purchase-order.dto.ts
// purpose: DTO for creating purchase orders
// dependencies: class-validator, class-transformer

import { IsString, IsDateString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export class PurchaseOrderLineDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  receivedQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalPrice?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  orderNumber: string;

  @IsString()
  supplierId: string;

  @IsString()
  createdById: string;

  @IsOptional()
  @IsString()
  approvedById?: string;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @Type(() => Number)
  @IsNumber()
  subtotal: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @Type(() => Number)
  @IsNumber()
  totalAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines: PurchaseOrderLineDto[];
}
