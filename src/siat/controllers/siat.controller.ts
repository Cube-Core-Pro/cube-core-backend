// path: backend/src/siat/controllers/siat.controller.ts
// purpose: Main SIAT controller for AI code generation
// dependencies: @nestjs/common, @nestjs/swagger, guards, services

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  Query
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SiatEngineService } from '../services/siat-engine.service';
import { CreateSiatPromptDto } from '../dto/create-siat-prompt.dto';

@ApiTags('SIAT AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('siat')
export class SiatController {
  constructor(private readonly siatEngineService: SiatEngineService) {}

  @Post('generate')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Generate code from AI prompt',
    description: 'Use AI to generate code based on natural language prompts'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Code generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        metadata: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            framework: { type: 'string' },
            dependencies: { type: 'array', items: { type: 'string' } },
            estimatedComplexity: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid prompt or generation failed' 
  })
  async generateCode(
    @Body() createSiatPromptDto: CreateSiatPromptDto,
    @Request() req: any
  ) {
    const context = {
      tenantId: req.user.tenantId,
      userId: req.user.id,
      preferences: {
        language: 'typescript',
        framework: 'nestjs',
        codeStyle: 'standard'
      }
    };

    return this.siatEngineService.generateCode(
      createSiatPromptDto.prompt,
      createSiatPromptDto.type,
      context
    );
  }

  @Post('validate')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Validate generated code',
    description: 'Validate code syntax and structure'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Code validation completed',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async validateCode(
    @Body() body: { code: string; type: string }
  ) {
    return this.siatEngineService.validateCode(body.code, body.type);
  }

  @Post('optimize')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Optimize generated code',
    description: 'Use AI to optimize and improve code quality'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Code optimized successfully' 
  })
  async optimizeCode(
    @Body() body: { code: string; type: string }
  ) {
    const optimizedCode = await this.siatEngineService.optimizeCode(body.code, body.type);
    return { optimizedCode };
  }

  @Get('capabilities')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get SIAT capabilities',
    description: 'List available code generation types and features'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT capabilities' 
  })
  async getCapabilities() {
    return {
      supportedTypes: [
        'CONTROLLER',
        'SERVICE', 
        'DTO',
        'ENTITY',
        'GUARD',
        'MIDDLEWARE',
        'COMPONENT',
        'PAGE',
        'HOOK',
        'UTILITY',
        'INTEGRATION'
      ],
      supportedLanguages: ['typescript', 'javascript'],
      supportedFrameworks: ['nestjs', 'react', 'nextjs'],
      features: [
        'Code Generation',
        'Code Validation',
        'Code Optimization',
        'Template Management',
        'Flow Execution',
        'Multi-tenant Support'
      ]
    };
  }

  @Get('examples')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get example prompts',
    description: 'Get example prompts for different code generation types'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    type: String,
    description: 'Filter examples by type'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Example prompts' 
  })
  async getExamples(@Query('type') type?: string) {
    const examples = {
      CONTROLLER: [
        'Create a user management controller with CRUD operations',
        'Generate a product controller with search and filtering',
        'Build an order controller with payment integration'
      ],
      SERVICE: [
        'Create a user service with authentication logic',
        'Generate an email service with template support',
        'Build a notification service with multiple channels'
      ],
      DTO: [
        'Create a user registration DTO with validation',
        'Generate a product creation DTO with image upload',
        'Build an order DTO with payment information'
      ],
      COMPONENT: [
        'Create a user profile component with edit functionality',
        'Generate a product card component with actions',
        'Build a dashboard widget component'
      ],
      PAGE: [
        'Create a user dashboard page with analytics',
        'Generate a product listing page with filters',
        'Build a checkout page with payment form'
      ]
    };

    if (type && examples[type]) {
      return { type, examples: examples[type] };
    }

    return examples;
  }

  @Get('stats')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get SIAT usage statistics',
    description: 'Get statistics about SIAT usage for the current tenant'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'SIAT usage statistics' 
  })
  async getStats(@Request() _req: any) {
    // This would be implemented to get actual stats from the database
    return {
      totalPrompts: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      totalFlows: 0,
      activeFlows: 0,
      totalExecutions: 0,
      averageExecutionTime: 0,
      mostUsedTypes: [],
      recentActivity: []
    };
  }
}