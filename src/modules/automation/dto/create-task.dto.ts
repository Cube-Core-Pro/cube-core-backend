// path: backend/src/modules/automation/dto/create-task.dto.ts
// purpose: DTO for creating scheduled tasks
// dependencies: class-validator, class-transformer

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsEnum, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task name',
    example: 'Daily Report Generation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Generate daily sales report and send to management',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Task type',
    example: 'cron',
    enum: ['cron', 'interval', 'timeout', 'workflow', 'process', 'notification', 'cleanup', 'report'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['cron', 'interval', 'timeout', 'workflow', 'process', 'notification', 'cleanup', 'report'])
  type: 'cron' | 'interval' | 'timeout' | 'workflow' | 'process' | 'notification' | 'cleanup' | 'report';

  @ApiProperty({
    description: 'Task category',
    example: 'business',
    enum: ['system', 'business', 'maintenance', 'analytics', 'security', 'compliance'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['system', 'business', 'maintenance', 'analytics', 'security', 'compliance'])
  category: 'system' | 'business' | 'maintenance' | 'analytics' | 'security' | 'compliance';

  @ApiProperty({
    description: 'Task schedule configuration',
    example: {
      type: 'cron',
      expression: '0 9 * * 1-5',
      timezone: 'UTC'
    },
  })
  @IsObject()
  schedule: any;

  @ApiPropertyOptional({
    description: 'Cron expression for scheduling',
    example: '0 9 * * 1-5',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({
    description: 'Execute once at specific time',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  executeAt?: Date;

  @ApiProperty({
    description: 'Task action configuration',
    example: {
      type: 'workflow',
      workflowId: 'wf_123',
      parameters: { reportType: 'daily' }
    },
  })
  @IsObject()
  action: any;

  @ApiPropertyOptional({
    description: 'Task priority',
    example: 'high',
    enum: ['low', 'normal', 'high', 'critical'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['low', 'normal', 'high', 'critical'])
  priority?: 'low' | 'normal' | 'high' | 'critical';

  @ApiPropertyOptional({
    description: 'Whether task is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    example: 3,
  })
  @IsOptional()
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Retry delay in milliseconds',
    example: 30000,
  })
  @IsOptional()
  retryDelay?: number;

  @ApiPropertyOptional({
    description: 'Task timeout in milliseconds',
    example: 300000,
  })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Notification settings',
    example: {
      onSuccess: { enabled: true, recipients: ['admin@company.com'] },
      onFailure: { enabled: true, recipients: ['admin@company.com'] }
    },
  })
  @IsOptional()
  @IsObject()
  notifications?: any;

  @ApiPropertyOptional({
    description: 'Task conditions for conditional execution',
    example: { condition: 'data.sales > 1000', dataSource: 'daily_sales' },
  })
  @IsOptional()
  @IsObject()
  conditions?: any;

  @ApiPropertyOptional({
    description: 'Task dependencies (task IDs)',
    example: ['task_1', 'task_2'],
    type: [String],
  })
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Task metadata',
    example: { tags: ['reporting', 'daily'], department: 'sales' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}