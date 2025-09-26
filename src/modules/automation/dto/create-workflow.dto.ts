// path: backend/src/modules/automation/dto/create-workflow.dto.ts
// purpose: DTO for creating workflows
// dependencies: class-validator, class-transformer

import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowTriggerDto {
  @ApiProperty({
    description: 'Trigger ID',
    example: 'manual_trigger',
  })
  @IsString()
  @IsNotEmpty()
  triggerId: string;

  @ApiProperty({
    description: 'Trigger type',
    example: 'MANUAL',
    enum: ['MANUAL', 'TIME_BASED', 'EVENT_BASED', 'CONDITION_BASED'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'MANUAL' | 'TIME_BASED' | 'EVENT_BASED' | 'CONDITION_BASED';

  @ApiProperty({
    description: 'Trigger configuration',
    example: { schedule: '0 9 * * 1-5' },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Whether trigger is enabled',
    example: true,
  })
  @IsOptional()
  enabled?: boolean;
}

export class WorkflowStepDto {
  @ApiPropertyOptional({
    description: 'Step ID',
    example: 'step_1',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Step name',
    example: 'Send notification',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Step type',
    example: 'action',
    enum: ['action', 'condition', 'loop', 'parallel', 'wait', 'human_task', 'subworkflow'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'wait' | 'human_task' | 'subworkflow';

  @ApiPropertyOptional({
    description: 'Step order',
    example: 1,
  })
  @IsOptional()
  order?: number;

  @ApiProperty({
    description: 'Step configuration',
    example: { actionType: 'email', recipients: ['user@example.com'] },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Dependencies (step IDs)',
    example: [],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class WorkflowVariableDto {
  @ApiProperty({
    description: 'Variable name',
    example: 'approver_email',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Variable type',
    example: 'string',
    enum: ['string', 'number', 'boolean', 'object', 'array'],
  })
  @IsString()
  @IsNotEmpty()
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';

  @ApiPropertyOptional({
    description: 'Default value',
    example: 'admin@company.com',
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'Variable description',
    example: 'Email of the approver',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether variable contains sensitive data',
    example: false,
  })
  @IsOptional()
  isSecret?: boolean;
}

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Workflow name',
    example: 'Purchase Approval Workflow',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Workflow description',
    example: 'Automates the purchase approval process',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Workflow triggers',
    type: [WorkflowTriggerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  triggers: WorkflowTriggerDto[];

  @ApiProperty({
    description: 'Workflow steps',
    type: [WorkflowStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: 'Workflow variables',
    type: [WorkflowVariableDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowVariableDto)
  variables?: WorkflowVariableDto[];

  @ApiPropertyOptional({
    description: 'Error handling configuration',
    example: { onError: 'stop', notificationRecipients: ['admin@company.com'] },
  })
  @IsOptional()
  @IsObject()
  errorHandling?: any;

  @ApiPropertyOptional({
    description: 'Workflow metadata',
    example: { tags: ['approval', 'finance'], category: 'finance' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}