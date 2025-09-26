// path: src/banking/fraud/dto/create-fraud-rule.dto.ts
// purpose: DTO for creating fraud rules
// dependencies: class-validator, class-transformer

import { IsString, IsBoolean, IsNumber, IsObject, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FraudRuleType {
  AMOUNT_THRESHOLD = 'AMOUNT_THRESHOLD',
  FREQUENCY_LIMIT = 'FREQUENCY_LIMIT',
  VELOCITY_CHECK = 'VELOCITY_CHECK',
  LOCATION_BASED = 'LOCATION_BASED',
  DEVICE_BASED = 'DEVICE_BASED',
  BEHAVIORAL = 'BEHAVIORAL',
  CUSTOM = 'CUSTOM'
}

export class CreateFraudRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Rule type', enum: FraudRuleType })
  @IsEnum(FraudRuleType)
  ruleType: FraudRuleType;

  @ApiProperty({ 
    description: 'Rule conditions (JSON object)',
    example: {
      maxAmount: 10000,
      maxTransactionsPerHour: 5,
      maxVelocityPerDay: 50000,
      allowedCountries: ['US', 'CA'],
      requiredDeviceRegistration: true
    }
  })
  @IsObject()
  conditions: Record<string, any>;

  @ApiProperty({ 
    description: 'Rule actions (JSON object)',
    example: {
      riskScore: 25,
      autoBlock: false,
      requireReview: true,
      notifyCompliance: true
    }
  })
  @IsObject()
  actions: Record<string, any>;

  @ApiProperty({ description: 'Whether the rule is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiProperty({ description: 'Rule priority (higher number = higher priority)', minimum: 1, maximum: 100, default: 1 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  priority?: number = 1;
}