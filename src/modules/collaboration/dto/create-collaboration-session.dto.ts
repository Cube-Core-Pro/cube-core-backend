// path: backend/src/modules/collaboration/dto/create-collaboration-session.dto.ts
// purpose: DTO for creating collaboration sessions
// dependencies: class-validator, class-transformer, swagger

import { IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCollaborationSessionDto {
  @ApiProperty({
    description: 'Session expiration date',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  expiresAt?: Date;
}