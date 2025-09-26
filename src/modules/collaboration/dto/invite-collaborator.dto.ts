// path: backend/src/modules/collaboration/dto/invite-collaborator.dto.ts
// purpose: DTO for inviting collaborators to documents
// dependencies: class-validator, class-transformer, swagger

import { IsEmail, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InviteCollaboratorDto {
  @ApiProperty({
    description: 'Email address of the collaborator to invite',
    example: 'collaborator@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Permission level to grant',
    enum: ['READ', 'WRITE', 'COMMENT', 'ADMIN'],
    example: 'WRITE',
  })
  @IsString()
  @IsIn(['READ', 'WRITE', 'COMMENT', 'ADMIN'])
  permission: string;

  @ApiProperty({
    description: 'Optional invitation message',
    required: false,
    example: 'Please review this document and provide your feedback.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    description: 'Invitation expiration date',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  @Type(() => Date)
  expiresAt?: Date;
}