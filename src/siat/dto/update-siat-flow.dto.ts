// path: backend/src/siat/dto/update-siat-flow.dto.ts
// purpose: DTO for updating SIAT flows
// dependencies: class-validator, @nestjs/swagger

import { PartialType } from '@nestjs/swagger';
import { CreateSiatFlowDto } from './create-siat-flow.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSiatFlowDto extends PartialType(CreateSiatFlowDto) {
  @ApiPropertyOptional({ description: 'Status of the flow' })
  @IsOptional()
  @IsString()
  status?: string;
}