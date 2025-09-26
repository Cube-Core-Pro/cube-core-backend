// path: src/banking/accounting/dto/create-journal-entry.dto.ts
// purpose: DTO for creating journal entries
// dependencies: class-validator, class-transformer

import { IsString, IsArray, IsEnum, IsNumber, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export class JournalEntryLineDto {
  @ApiProperty({ description: 'Account code' })
  @IsString()
  accountCode: string;

  @ApiProperty({ description: 'Line description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Debit amount', required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  debitAmount?: number;

  @ApiProperty({ description: 'Credit amount', required: false, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditAmount?: number;
}

export class CreateJournalEntryDto {
  @ApiProperty({ description: 'Journal entry number', required: false })
  @IsString()
  @IsOptional()
  entryNumber?: string;

  @ApiProperty({ description: 'Entry date' })
  date: Date;

  @ApiProperty({ description: 'Entry description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Reference number or document', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ description: 'Entry status', enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  @IsEnum(JournalEntryStatus)
  @IsOptional()
  status?: JournalEntryStatus = JournalEntryStatus.DRAFT;

  @ApiProperty({ description: 'User ID who created the entry' })
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Journal entry lines', type: [JournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}