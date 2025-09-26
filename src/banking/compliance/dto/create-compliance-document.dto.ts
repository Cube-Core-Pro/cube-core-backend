// path: src/banking/compliance/dto/create-compliance-document.dto.ts
// purpose: DTO for creating compliance documents
// dependencies: class-validator, class-transformer

import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ComplianceDocumentType {
  ID_DOCUMENT = 'ID_DOCUMENT',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
  UTILITY_BILL = 'UTILITY_BILL',
  BANK_STATEMENT = 'BANK_STATEMENT',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  ARTICLES_OF_INCORPORATION = 'ARTICLES_OF_INCORPORATION',
  BENEFICIAL_OWNERSHIP_DECLARATION = 'BENEFICIAL_OWNERSHIP_DECLARATION',
  SOURCE_OF_FUNDS = 'SOURCE_OF_FUNDS',
  TAX_RETURN = 'TAX_RETURN',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  OTHER = 'OTHER'
}

export enum ComplianceDocumentStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
}

export class CreateComplianceDocumentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Document type', enum: ComplianceDocumentType })
  @IsEnum(ComplianceDocumentType)
  documentType: ComplianceDocumentType;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fileSize?: number;

  @ApiProperty({ description: 'MIME type', required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ description: 'Document status', enum: ComplianceDocumentStatus, default: ComplianceDocumentStatus.PENDING })
  @IsEnum(ComplianceDocumentStatus)
  @IsOptional()
  status?: ComplianceDocumentStatus = ComplianceDocumentStatus.PENDING;

  @ApiProperty({ description: 'When the document was verified', required: false })
  @IsOptional()
  verifiedAt?: Date;

  @ApiProperty({ description: 'User ID who verified the document', required: false })
  @IsString()
  @IsOptional()
  verifiedBy?: string;

  @ApiProperty({ description: 'When the document expires', required: false })
  @IsOptional()
  expiresAt?: Date;
}