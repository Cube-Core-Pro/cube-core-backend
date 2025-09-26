// path: src/banking/accounting/dto/create-tax-calculation.dto.ts
// purpose: DTO for creating tax calculations
// dependencies: class-validator, class-transformer

import { IsString, IsNumber, IsEnum, IsObject, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TaxType {
  INCOME_TAX = 'INCOME_TAX',
  SALES_TAX = 'SALES_TAX',
  VAT = 'VAT',
  PAYROLL_TAX = 'PAYROLL_TAX',
  PROPERTY_TAX = 'PROPERTY_TAX',
  EXCISE_TAX = 'EXCISE_TAX',
  WITHHOLDING_TAX = 'WITHHOLDING_TAX'
}

export enum TaxStatus {
  CALCULATED = 'CALCULATED',
  FILED = 'FILED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE'
}

export class CreateTaxCalculationDto {
  @ApiProperty({ description: 'Tax year' })
  @IsNumber()
  @Min(2000)
  taxYear: number;

  @ApiProperty({ description: 'Tax type', enum: TaxType })
  @IsEnum(TaxType)
  taxType: TaxType;

  @ApiProperty({ description: 'Tax jurisdiction (country/state code)' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Tax period (Q1, Q2, Q3, Q4, or ANNUAL)' })
  @IsString()
  taxPeriod: string;

  @ApiProperty({ description: 'Taxable income/base amount' })
  @IsNumber()
  taxableAmount: number;

  @ApiProperty({ description: 'Tax rate (as decimal, e.g., 0.21 for 21%)' })
  @IsNumber()
  @Min(0)
  taxRate: number;

  @ApiProperty({ description: 'Calculated tax amount' })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty({ description: 'Tax status', enum: TaxStatus, default: TaxStatus.CALCULATED })
  @IsEnum(TaxStatus)
  @IsOptional()
  status?: TaxStatus = TaxStatus.CALCULATED;

  @ApiProperty({ description: 'Tax calculation details (JSON object)' })
  @IsObject()
  calculationDetails: any;

  @ApiProperty({ description: 'Due date for tax payment' })
  dueDate: Date;

  @ApiProperty({ description: 'User ID who performed the calculation' })
  @IsString()
  calculatedBy: string;

  @ApiProperty({ description: 'Tax filing reference', required: false })
  @IsString()
  @IsOptional()
  filingReference?: string;

  @ApiProperty({ description: 'Date when tax was filed', required: false })
  @IsOptional()
  filedDate?: Date;

  @ApiProperty({ description: 'Date when tax was paid', required: false })
  @IsOptional()
  paidDate?: Date;
}