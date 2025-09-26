// path: backend/src/siat/dto/create-siat-prompt.dto.ts
// purpose: DTO for creating SIAT prompts
// dependencies: class-validator, class-transformer

import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiatPromptDto {
  @ApiProperty({ description: 'The AI prompt text' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Type of the prompt' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Generated code from the prompt' })
  @IsOptional()
  @IsString()
  generatedCode?: string;

  @ApiPropertyOptional({ description: 'Error message if generation failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}