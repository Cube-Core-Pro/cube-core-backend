// path: src/scm/dto/supplier-response.dto.ts
// purpose: Structured response DTO for supplier operations
// dependencies: class-validator, swagger

import { ApiProperty } from '@nestjs/swagger';

export class SupplierDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  contactPerson?: string | null;

  @ApiProperty({ required: false, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  phone?: string | null;

  @ApiProperty({ required: false, type: Object, nullable: true })
  address?: any;

  @ApiProperty({ required: false, nullable: true })
  taxId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  paymentTerms?: string | null;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false, type: Number, nullable: true })
  rating?: number | null;

  @ApiProperty({ required: false, type: [String] })
  certifications?: string[];

  @ApiProperty({ required: false, nullable: true })
  notes?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SupplierResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: () => SupplierDto, required: false })
  data?: SupplierDto;

  @ApiProperty({ example: 'Supplier created successfully' })
  message?: string;
}
