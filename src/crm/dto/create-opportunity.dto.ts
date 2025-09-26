import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum OpportunityStage {
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export enum OpportunityPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export class CreateOpportunityDto {
  @ApiProperty({ description: 'Opportunity name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Opportunity description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Contact ID associated with this opportunity' })
  @IsUUID()
  contactId: string;

  @ApiProperty({ description: 'Opportunity value/amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: OpportunityStage, description: 'Opportunity stage' })
  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @ApiPropertyOptional({ enum: OpportunityPriority, description: 'Opportunity priority' })
  @IsOptional()
  @IsEnum(OpportunityPriority)
  priority?: OpportunityPriority;

  @ApiPropertyOptional({ description: 'Probability of closing (0-100)' })
  @IsOptional()
  @IsNumber()
  probability?: number;

  @ApiPropertyOptional({ description: 'Expected close date' })
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @ApiPropertyOptional({ description: 'Opportunity source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiPropertyOptional({ description: 'Opportunity notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Opportunity tags' })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Competitor information' })
  @IsOptional()
  @IsString()
  competitors?: string;

  @ApiPropertyOptional({ description: 'Next action required' })
  @IsOptional()
  @IsString()
  nextAction?: string;

  @ApiPropertyOptional({ description: 'Next action date' })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}