// path: backend/src/modules/automation/dto/create-integration.dto.ts
// purpose: DTO for creating system integrations
// dependencies: class-validator, class-transformer

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IntegrationEndpointDto {
  @ApiProperty({
    description: 'Endpoint name',
    example: 'create_user',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'HTTP method',
    example: 'POST',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @ApiProperty({
    description: 'Endpoint URL path',
    example: '/api/users',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({
    description: 'Request headers',
    example: { 'Content-Type': 'application/json' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Query parameters',
    example: { format: 'json' },
  })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Request body template',
    example: { name: '{{user.name}}', email: '{{user.email}}' },
  })
  @IsOptional()
  @IsObject()
  bodyTemplate?: any;

  @ApiPropertyOptional({
    description: 'Response mapping configuration',
    example: { userId: 'data.id', status: 'success' },
  })
  @IsOptional()
  @IsObject()
  responseMapping?: any;
}

export class IntegrationAuthDto {
  @ApiProperty({
    description: 'Authentication type',
    example: 'api_key',
    enum: ['api_key', 'bearer_token', 'basic_auth', 'oauth2', 'custom'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['api_key', 'bearer_token', 'basic_auth', 'oauth2', 'custom'])
  type: 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth2' | 'custom';

  @ApiProperty({
    description: 'Authentication configuration',
    example: { keyName: 'X-API-Key', keyValue: 'secret_key_123' },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Token refresh configuration',
    example: { refreshUrl: '/auth/refresh', expiryField: 'expires_in' },
  })
  @IsOptional()
  @IsObject()
  refreshConfig?: any;
}

export class IntegrationMappingDto {
  @ApiProperty({
    description: 'Source field path',
    example: 'user.firstName',
  })
  @IsString()
  @IsNotEmpty()
  sourceField: string;

  @ApiProperty({
    description: 'Target field path',
    example: 'name',
  })
  @IsString()
  @IsNotEmpty()
  targetField: string;

  @ApiPropertyOptional({
    description: 'Data transformation function',
    example: 'uppercase',
    enum: ['uppercase', 'lowercase', 'capitalize', 'trim', 'format_date', 'custom'],
  })
  @IsOptional()
  @IsString()
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'trim' | 'format_date' | 'custom';

  @ApiPropertyOptional({
    description: 'Default value if source is empty',
    example: 'Unknown',
  })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({
    description: 'Whether field is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class CreateIntegrationDto {
  @ApiProperty({
    description: 'Integration name',
    example: 'Salesforce CRM Integration',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Integration description',
    example: 'Two-way sync with Salesforce CRM system',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Integration type',
    example: 'rest_api',
    enum: ['webhook', 'rest_api', 'graphql', 'soap', 'database', 'file_transfer', 'message_queue', 'event_stream'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['webhook', 'rest_api', 'graphql', 'soap', 'database', 'file_transfer', 'message_queue', 'event_stream'])
  type: 'webhook' | 'rest_api' | 'graphql' | 'soap' | 'database' | 'file_transfer' | 'message_queue' | 'event_stream';

  @ApiProperty({
    description: 'Integration category',
    example: 'crm',
    enum: ['erp', 'crm', 'hrms', 'finance', 'marketing', 'support', 'analytics', 'security', 'communication', 'storage'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['erp', 'crm', 'hrms', 'finance', 'marketing', 'support', 'analytics', 'security', 'communication', 'storage'])
  category: 'erp' | 'crm' | 'hrms' | 'finance' | 'marketing' | 'support' | 'analytics' | 'security' | 'communication' | 'storage';

  @ApiProperty({
    description: 'Integration provider',
    example: 'Salesforce',
  })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({
    description: 'Integration configuration',
    example: {
      baseUrl: 'https://api.salesforce.com/v1',
      endpoints: [],
      timeout: 30000
    },
  })
  @IsObject()
  configuration: any;

  @ApiPropertyOptional({
    description: 'Authentication configuration',
    type: IntegrationAuthDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegrationAuthDto)
  authentication?: IntegrationAuthDto;

  @ApiPropertyOptional({
    description: 'Available endpoints',
    type: [IntegrationEndpointDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationEndpointDto)
  endpoints?: IntegrationEndpointDto[];

  @ApiPropertyOptional({
    description: 'Data field mappings',
    type: [IntegrationMappingDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegrationMappingDto)
  mappings?: IntegrationMappingDto[];

  @ApiPropertyOptional({
    description: 'Rate limiting configuration',
    example: { requestsPerMinute: 100, burstLimit: 20 },
  })
  @IsOptional()
  @IsObject()
  rateLimiting?: any;

  @ApiPropertyOptional({
    description: 'Retry configuration',
    example: { maxRetries: 3, retryDelay: 1000, backoffMultiplier: 2 },
  })
  @IsOptional()
  @IsObject()
  retryConfig?: any;

  @ApiPropertyOptional({
    description: 'Timeout configuration in milliseconds',
    example: 30000,
  })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Whether integration is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Health check configuration',
    example: { endpoint: '/health', interval: 300000 },
  })
  @IsOptional()
  @IsObject()
  healthCheck?: any;

  @ApiPropertyOptional({
    description: 'Integration metadata',
    example: { tags: ['crm', 'sales'], version: '1.0' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Webhook configuration for webhook integrations',
    example: { url: 'https://api.company.com/webhooks/salesforce', secret: 'webhook_secret' },
  })
  @IsOptional()
  @IsObject()
  webhookConfig?: any;

  @ApiPropertyOptional({
    description: 'Data synchronization settings',
    example: { mode: 'bidirectional', frequency: 'real_time' },
  })
  @IsOptional()
  @IsObject()
  syncSettings?: any;
}