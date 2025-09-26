// path: src/common/dto/validation-error-response.dto.ts
// purpose: Structured validation error response DTO
// dependencies: class-validator, swagger

import { ApiProperty } from '@nestjs/swagger';

export class ValidationErrorDto {
  @ApiProperty({ example: 'supplierCode' })
  field: string;

  @ApiProperty({ example: 'Supplier code already exists' })
  message: string;

  @ApiProperty({ example: 'DUPLICATE_VALUE' })
  code: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ type: [ValidationErrorDto] })
  errors: ValidationErrorDto[];
}