// path: backend/src/siat/dto/execute-siat-flow.dto.ts
// purpose: DTO for executing SIAT flows
// dependencies: class-validator, class-transformer

import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteSiatFlowDto {
  @ApiProperty({ description: 'ID of the flow to execute' })
  @IsString()
  flowId: string;

  @ApiPropertyOptional({ description: 'Input data for the execution', default: {} })
  @IsOptional()
  @IsObject()
  inputData?: Record<string, any> = {};
}