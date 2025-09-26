// path: backend/src/modules/automation/dto/create-rule.dto.ts
// purpose: DTO for creating business rules
// dependencies: class-validator, class-transformer

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RuleConditionDto {
  @ApiProperty({
    description: 'Condition field/property to check',
    example: 'user.department',
  })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({
    description: 'Comparison operator',
    example: 'equals',
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in', 'exists'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in', 'exists'])
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in' | 'exists';

  @ApiProperty({
    description: 'Value to compare against',
    example: 'sales',
  })
  value: any;

  @ApiPropertyOptional({
    description: 'Data type of the field',
    example: 'string',
    enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['string', 'number', 'boolean', 'date', 'array', 'object'])
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

export class RuleActionDto {
  @ApiProperty({
    description: 'Action type',
    example: 'send_notification',
    enum: ['send_notification', 'set_value', 'trigger_workflow', 'call_api', 'log_event', 'block_action'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['send_notification', 'set_value', 'trigger_workflow', 'call_api', 'log_event', 'block_action'])
  type: 'send_notification' | 'set_value' | 'trigger_workflow' | 'call_api' | 'log_event' | 'block_action';

  @ApiProperty({
    description: 'Action configuration',
    example: {
      message: 'High value transaction detected',
      recipients: ['security@company.com']
    },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Action order/priority',
    example: 1,
  })
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether action should stop further rule processing',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  stopOnExecution?: boolean;
}

export class CreateRuleDto {
  @ApiProperty({
    description: 'Rule name',
    example: 'High Value Transaction Alert',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Rule description',
    example: 'Alert when transaction amount exceeds threshold',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Rule category',
    example: 'security',
    enum: ['validation', 'transformation', 'routing', 'approval', 'escalation', 'pricing', 'compliance', 'security'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['validation', 'transformation', 'routing', 'approval', 'escalation', 'pricing', 'compliance', 'security'])
  category: 'validation' | 'transformation' | 'routing' | 'approval' | 'escalation' | 'pricing' | 'compliance' | 'security';

  @ApiProperty({
    description: 'Rule conditions',
    type: [RuleConditionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions: RuleConditionDto[];

  @ApiProperty({
    description: 'Actions to execute when rule matches',
    type: [RuleActionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions: RuleActionDto[];

  @ApiPropertyOptional({
    description: 'Logic operator for multiple conditions',
    example: 'AND',
    enum: ['AND', 'OR'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['AND', 'OR'])
  logicOperator?: 'AND' | 'OR';

  @ApiPropertyOptional({
    description: 'Rule priority (higher numbers execute first)',
    example: 100,
  })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Whether rule is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Event types that trigger this rule',
    example: ['transaction.created', 'user.login'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerEvents?: string[];

  @ApiPropertyOptional({
    description: 'Rule execution context',
    example: 'real_time',
    enum: ['real_time', 'batch', 'on_demand'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['real_time', 'batch', 'on_demand'])
  executionContext?: 'real_time' | 'batch' | 'on_demand';

  @ApiPropertyOptional({
    description: 'Rule metadata',
    example: { tags: ['security', 'finance'], severity: 'high' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Rule expiration date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  expiresAt?: Date;
}