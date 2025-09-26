// path: backend/src/modules/automation/dto/create-business-process.dto.ts
// purpose: DTO for creating business processes
// dependencies: class-validator, class-transformer

import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessStageDto {
  @ApiProperty({
    description: 'Stage name',
    example: 'Review',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Stage description',
    example: 'Document review stage',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Stage order',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Stage type',
    example: 'human_task',
    enum: ['human_task', 'automated', 'approval', 'notification', 'data_entry'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'human_task' | 'automated' | 'approval' | 'notification' | 'data_entry';

  @ApiProperty({
    description: 'Stage configuration',
    example: { assignedTo: 'manager', timeLimit: 3600000 },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Approval required',
    example: true,
  })
  @IsOptional()
  requiresApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Next stages (stage names)',
    example: ['Approval'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextStages?: string[];
}

export class ProcessSLADto {
  @ApiProperty({
    description: 'Target duration in milliseconds',
    example: 86400000,
  })
  targetDuration: number;

  @ApiProperty({
    description: 'Warning threshold percentage',
    example: 80,
  })
  warningThreshold: number;

  @ApiProperty({
    description: 'Critical threshold percentage',
    example: 95,
  })
  criticalThreshold: number;

  @ApiPropertyOptional({
    description: 'Escalation configuration',
    example: { escalateTo: 'manager', notificationMethod: 'email' },
  })
  @IsOptional()
  @IsObject()
  escalation?: any;
}

export class ProcessParticipantDto {
  @ApiProperty({
    description: 'Participant role',
    example: 'initiator',
    enum: ['initiator', 'approver', 'reviewer', 'observer'],
  })
  @IsString()
  @IsNotEmpty()
  role: 'initiator' | 'approver' | 'reviewer' | 'observer';

  @ApiProperty({
    description: 'User or group ID',
    example: 'user123',
  })
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiProperty({
    description: 'Participant type',
    example: 'user',
    enum: ['user', 'group', 'role'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'user' | 'group' | 'role';

  @ApiPropertyOptional({
    description: 'Permissions',
    example: ['read', 'write', 'approve'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class CreateBusinessProcessDto {
  @ApiProperty({
    description: 'Process name',
    example: 'Employee Onboarding',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Process description',
    example: 'Complete employee onboarding process',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Process category',
    example: 'hr',
    enum: ['finance', 'hr', 'sales', 'operations', 'compliance', 'procurement', 'manufacturing', 'logistics'],
  })
  @IsString()
  @IsNotEmpty()
  category: 'finance' | 'hr' | 'sales' | 'operations' | 'compliance' | 'procurement' | 'manufacturing' | 'logistics';

  @ApiProperty({
    description: 'Process type',
    example: 'semi_automated',
    enum: ['manual', 'semi_automated', 'fully_automated'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'manual' | 'semi_automated' | 'fully_automated';

  @ApiProperty({
    description: 'Process stages',
    type: [ProcessStageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessStageDto)
  stages: ProcessStageDto[];

  @ApiPropertyOptional({
    description: 'Process SLA configuration',
    type: ProcessSLADto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessSLADto)
  sla?: ProcessSLADto;

  @ApiPropertyOptional({
    description: 'Process participants',
    type: [ProcessParticipantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessParticipantDto)
  participants?: ProcessParticipantDto[];

  @ApiPropertyOptional({
    description: 'Process triggers',
    example: [{ type: 'manual', configuration: {} }],
  })
  @IsOptional()
  @IsArray()
  triggers?: any[];

  @ApiPropertyOptional({
    description: 'Form template for data collection',
    example: { fields: [{ name: 'employeeName', type: 'text', required: true }] },
  })
  @IsOptional()
  @IsObject()
  formTemplate?: any;

  @ApiPropertyOptional({
    description: 'Notification settings',
    example: { enabled: true, recipients: ['hr@company.com'] },
  })
  @IsOptional()
  @IsObject()
  notifications?: any;

  @ApiPropertyOptional({
    description: 'Process metadata',
    example: { tags: ['hr', 'onboarding'], priority: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}