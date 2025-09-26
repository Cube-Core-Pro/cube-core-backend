// path: backend/src/modules/enterprise-email/dto/bulk-email-action.dto.ts
// purpose: DTO for bulk email actions
// dependencies: class-validator, swagger

import { IsArray, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkEmailAction {
  MARK_READ = 'MARK_READ',
  MARK_UNREAD = 'MARK_UNREAD',
  DELETE = 'DELETE',
  MOVE_TO_FOLDER = 'MOVE_TO_FOLDER',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  MARK_SPAM = 'MARK_SPAM',
  MARK_NOT_SPAM = 'MARK_NOT_SPAM'
}

export class BulkEmailActionDto {
  @ApiProperty({ description: 'Email IDs to perform action on' })
  @IsArray()
  @IsString({ each: true })
  emailIds: string[];

  @ApiProperty({ 
    description: 'Action to perform',
    enum: BulkEmailAction
  })
  @IsEnum(BulkEmailAction)
  action: BulkEmailAction;

  @ApiProperty({ description: 'Action parameters (e.g., folder ID, tag name)', required: false })
  parameters?: Record<string, any>;
}