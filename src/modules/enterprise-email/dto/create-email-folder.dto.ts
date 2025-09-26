// path: backend/src/modules/enterprise-email/dto/create-email-folder.dto.ts
// purpose: DTO for creating email folders
// dependencies: class-validator, swagger

import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmailFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Parent folder ID', required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}