import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateCheckDepositDto {
  @IsString()
  accountId!: string;

  @IsPositive()
  amount!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  checkNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  submittedAt?: string;
}

export class CreateDisputeDto {
  @IsString()
  transactionId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateDisputeDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateMandateDto {
  @IsString()
  debtorId!: string;

  @IsString()
  creditorId!: string;

  @IsString()
  reference!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsISO8601()
  signatureDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateMandateDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsISO8601()
  signatureDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateRestrictionGroupDto {
  @IsString()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  entries!: string[];

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateRestrictionGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entries?: string[];

  @IsOptional()
  @IsString()
  status?: string;
}

export class RespondRecallDto {
  @IsString()
  decision!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SimulationPayloadDto {
  @IsString()
  kind!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class RestrictionGroupQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entries?: string[];
}

export class ListQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class CreateRecallDto {
  @IsString()
  paymentId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreatePaymentTypedDto {
  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
