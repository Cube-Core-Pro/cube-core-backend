// path: backend/src/siat/dto/siat.dto.ts
// purpose: DTOs for SIAT (No-Code AI Builder) module
// dependencies: class-validator, swagger, class-transformer

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsObject, 
  IsArray, 
  IsBoolean,
  IsUUID,
  ValidateNested,
  Length,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDto } from '../../common/dto/base.dto';

export enum SiatFlowType {
  CRUD = 'CRUD',
  WORKFLOW = 'WORKFLOW',
  REPORT = 'REPORT',
  DASHBOARD = 'DASHBOARD',
  API = 'API',
  FORM = 'FORM',
  AUTOMATION = 'AUTOMATION',
  INTEGRATION = 'INTEGRATION'
}

export enum SiatFlowStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  TESTING = 'TESTING',
  DEPLOYED = 'DEPLOYED',
  ERROR = 'ERROR',
  ARCHIVED = 'ARCHIVED'
}

export enum SiatExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export class SiatFlowStepDto {
  @ApiProperty({ description: 'Step ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: 'Step type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Step configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Next step IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextSteps?: string[];

  @ApiPropertyOptional({ description: 'Conditions for step execution' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class CreateSiatFlowDto {
  @ApiProperty({ description: 'Flow name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Flow description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Flow type', enum: SiatFlowType })
  @IsEnum(SiatFlowType)
  type: SiatFlowType;

  @ApiProperty({ description: 'AI prompt for generation' })
  @IsString()
  @Length(10, 2000)
  prompt: string;

  @ApiPropertyOptional({ description: 'Flow configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Flow steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiatFlowStepDto)
  steps?: SiatFlowStepDto[];

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is flow public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateSiatFlowDto {
  @ApiPropertyOptional({ description: 'Flow name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Flow description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Flow configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Flow steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiatFlowStepDto)
  steps?: SiatFlowStepDto[];

  @ApiPropertyOptional({ description: 'Flow status', enum: SiatFlowStatus })
  @IsOptional()
  @IsEnum(SiatFlowStatus)
  status?: SiatFlowStatus;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is flow public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class GenerateModuleDto {
  @ApiProperty({ description: 'Module name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: 'AI prompt for module generation' })
  @IsString()
  @Length(10, 2000)
  prompt: string;

  @ApiProperty({ description: 'Module type', enum: SiatFlowType })
  @IsEnum(SiatFlowType)
  type: SiatFlowType;

  @ApiPropertyOptional({ description: 'Additional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Target framework' })
  @IsOptional()
  @IsString()
  framework?: string;

  @ApiPropertyOptional({ description: 'Include tests' })
  @IsOptional()
  @IsBoolean()
  includeTests?: boolean;

  @ApiPropertyOptional({ description: 'Include documentation' })
  @IsOptional()
  @IsBoolean()
  includeDocs?: boolean;
}

export class DeployModuleDto {
  @ApiProperty({ description: 'Flow ID to deploy' })
  @IsUUID()
  flowId: string;

  @ApiPropertyOptional({ description: 'Deployment environment' })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ description: 'Deployment configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Auto-start after deployment' })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}

export class SiatFlowResponseDto extends BaseDto {
  @ApiProperty({ description: 'Flow name' })
  name: string;

  @ApiProperty({ description: 'Flow description' })
  description?: string;

  @ApiProperty({ description: 'Flow type', enum: SiatFlowType })
  type: SiatFlowType;

  @ApiProperty({ description: 'Flow status', enum: SiatFlowStatus })
  status: SiatFlowStatus;

  @ApiProperty({ description: 'Original AI prompt' })
  prompt: string;

  @ApiProperty({ description: 'Generated code' })
  generatedCode?: string;

  @ApiProperty({ description: 'Flow configuration' })
  config: Record<string, any>;

  @ApiProperty({ description: 'Flow steps' })
  steps: SiatFlowStepDto[];

  @ApiProperty({ description: 'Tags' })
  tags: string[];

  @ApiProperty({ description: 'Is flow public' })
  isPublic: boolean;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId: string;

  @ApiProperty({ description: 'Creator user ID' })
  createdBy: string;

  @ApiProperty({ description: 'Last execution date' })
  lastExecutedAt?: Date;

  @ApiProperty({ description: 'Execution count' })
  executionCount: number;
}

export class SiatExecutionResponseDto extends BaseDto {
  @ApiProperty({ description: 'Flow ID' })
  flowId: string;

  @ApiProperty({ description: 'Execution status', enum: SiatExecutionStatus })
  status: SiatExecutionStatus;

  @ApiProperty({ description: 'Input data' })
  inputData: Record<string, any>;

  @ApiProperty({ description: 'Output data' })
  outputData?: Record<string, any>;

  @ApiProperty({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiProperty({ description: 'Execution start time' })
  startedAt: Date;

  @ApiProperty({ description: 'Execution end time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Execution duration in milliseconds' })
  duration?: number;

  @ApiProperty({ description: 'Executed by user ID' })
  executedBy: string;
}