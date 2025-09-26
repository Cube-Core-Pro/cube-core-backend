// path: backend/src/siat/siat.service.ts
// purpose: Main SIAT service for no-code AI module generation
// dependencies: @nestjs/common, prisma, redis, openai

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SiatFlowService } from './services/siat-flow.service';
import { SiatCodeGeneratorService } from './services/siat-code-generator.service';
import { SiatValidatorService } from './services/siat-validator.service';
import { SiatDeploymentService } from './services/siat-deployment.service';
import {
  CreateSiatFlowDto,
  UpdateSiatFlowDto,
  GenerateModuleDto,
  DeployModuleDto,
  SiatFlowResponseDto,
  SiatExecutionResponseDto,
  SiatFlowStatus,
  SiatExecutionStatus
} from './dto/siat.dto';
import { PaginationDto } from '../common/dto/base.dto';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { Fortune500SiatConfig } from '../types/fortune500-types';

@Injectable()
export class SiatService {
  private readonly logger = new Logger(SiatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly flowService: SiatFlowService,
    private readonly codeGenerator: SiatCodeGeneratorService,
    private readonly validator: SiatValidatorService,
    private readonly deployment: SiatDeploymentService
  ) {}

  async createFlow(
    createFlowDto: CreateSiatFlowDto,
    user: AuthenticatedUser
  ): Promise<SiatFlowResponseDto> {
    try {
      this.logger.log(`Creating SIAT flow: ${createFlowDto.name} for tenant: ${user.tenantId}`);

      // Validate the prompt and generate initial flow structure
      const validationResult = await this.validator.validatePrompt(createFlowDto.prompt);
      if (!validationResult.isValid) {
        throw new BadRequestException(`Invalid prompt: ${validationResult.errors.join(', ')}`);
      }

      // Generate flow structure from AI prompt
      const flowStructure = await this.codeGenerator.generateFlowStructure(
        createFlowDto.prompt,
        createFlowDto.type
      );

      // Create flow in database
      const flow = await this.prisma.siatFlow.create({
        data: {
          name: createFlowDto.name,
          description: createFlowDto.description,
          type: createFlowDto.type,
          status: SiatFlowStatus.GENERATING,
          prompt: createFlowDto.prompt,
          config: this.prepareJson(createFlowDto.config ?? {}),
          steps: this.prepareJson(flowStructure.steps ?? []),
          tags: createFlowDto.tags || [],
          isPublic: createFlowDto.isPublic || false,
          tenantId: user.tenantId,
          createdBy: user.id,
          executionCount: 0,
        },
      });

      // Start background code generation
      this.generateCodeInBackground(flow.id, createFlowDto.prompt, createFlowDto.type);

      return this.mapToResponseDto(flow);
    } catch (error) {
      this.logger.error(`Error creating SIAT flow: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getFlows(pagination: PaginationDto, tenantId: string) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [flows, total] = await Promise.all([
      this.prisma.siatFlow.findMany({
        where: { tenantId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.siatFlow.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);

    return {
      success: true,
      data: flows.map(flow => this.mapToResponseDto(flow)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFlow(id: string, tenantId: string): Promise<SiatFlowResponseDto> {
    const flow = await this.prisma.siatFlow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!flow) {
      throw new NotFoundException('SIAT flow not found');
    }

    return this.mapToResponseDto(flow);
  }

  async updateFlow(
    id: string,
    updateFlowDto: UpdateSiatFlowDto,
    user: AuthenticatedUser
  ): Promise<SiatFlowResponseDto> {
    const existingFlow = await this.prisma.siatFlow.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });

    if (!existingFlow) {
      throw new NotFoundException('SIAT flow not found');
    }

    const updatedFlow = await this.prisma.siatFlow.update({
      where: { id },
      data: this.buildFlowUpdateData(updateFlowDto, existingFlow, user),
    });

    return this.mapToResponseDto(updatedFlow);
  }

  async deleteFlow(id: string, tenantId: string) {
    const flow = await this.prisma.siatFlow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!flow) {
      throw new NotFoundException('SIAT flow not found');
    }

    await this.prisma.siatFlow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'SIAT flow deleted successfully' };
  }

  async generateModule(generateDto: GenerateModuleDto, user: AuthenticatedUser) {
    try {
      this.logger.log(`Generating module: ${generateDto.name} for tenant: ${user.tenantId}`);

      // Validate prompt
      const validationResult = await this.validator.validatePrompt(generateDto.prompt);
      if (!validationResult.isValid) {
        throw new BadRequestException(`Invalid prompt: ${validationResult.errors.join(', ')}`);
      }

      // Generate code using AI
      const generatedCode = await this.codeGenerator.generateModule(
        generateDto.prompt,
        generateDto.type,
        generateDto.config
      );

      // Validate generated code
      const codeValidation = await this.validator.validateGeneratedCode(generatedCode);
      if (!codeValidation.isValid) {
        throw new BadRequestException(`Generated code validation failed: ${codeValidation.errors.join(', ')}`);
      }

      return {
        success: true,
        data: {
          name: generateDto.name,
          type: generateDto.type,
          generatedCode,
          validation: codeValidation,
          framework: generateDto.framework || 'nestjs',
          includeTests: generateDto.includeTests || false,
          includeDocs: generateDto.includeDocs || false,
        },
      };
    } catch (error) {
      this.logger.error(`Error generating module: ${error.message}`, error.stack);
      throw error;
    }
  }

  async executeFlow(
    id: string,
    executionData: any,
    user: AuthenticatedUser
  ): Promise<SiatExecutionResponseDto> {
    try {
      const flow = await this.prisma.siatFlow.findFirst({
        where: { id, tenantId: user.tenantId, deletedAt: null },
      });

      if (!flow) {
        throw new NotFoundException('SIAT flow not found');
      }

      if (flow.status !== SiatFlowStatus.DEPLOYED) {
        throw new BadRequestException('Flow must be deployed before execution');
      }

      // Create execution record
      const execution = await this.prisma.siatExecution.create({
        data: {
          flowId: id,
          status: SiatExecutionStatus.RUNNING,
          inputData: executionData,
          startedAt: new Date(),
          executedBy: user.id,
          tenantId: user.tenantId,
        },
      });

      // Execute flow using flow service
      const result = await this.flowService.execute(
        { flowId: id, inputData: executionData },
        user.tenantId,
        user.id,
      );

      // Update execution with results
      const completedExecution = await this.prisma.siatExecution.update({
        where: { id: execution.id },
        data: {
          status: result.success ? SiatExecutionStatus.COMPLETED : SiatExecutionStatus.FAILED,
          outputData: result.data,
          errorMessage: result.error,
          completedAt: new Date(),
          duration: Date.now() - execution.startedAt.getTime(),
        },
      });

      // Update flow execution count
      await this.prisma.siatFlow.update({
        where: { id },
        data: {
          executionCount: { increment: 1 },
          lastExecutedAt: new Date(),
        },
      });

      return this.mapToExecutionResponseDto(completedExecution);
    } catch (error) {
      this.logger.error(`Error executing flow: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deployModule(deployDto: DeployModuleDto, user: AuthenticatedUser) {
    try {
      const flow = await this.prisma.siatFlow.findFirst({
        where: { id: deployDto.flowId, tenantId: user.tenantId, deletedAt: null },
      });

      if (!flow) {
        throw new NotFoundException('SIAT flow not found');
      }

      if (flow.status !== SiatFlowStatus.GENERATED) {
        throw new BadRequestException('Flow must be generated before deployment');
      }

      // Deploy using deployment service
      const deploymentResult = await this.deployment.deployFlow(flow, deployDto.config);

      if (deploymentResult.success) {
        await this.prisma.siatFlow.update({
          where: { id: deployDto.flowId },
          data: { status: SiatFlowStatus.DEPLOYED },
        });
      }

      return deploymentResult;
    } catch (error) {
      this.logger.error(`Error deploying module: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getTemplates(tenantId: string) {
    // Get predefined templates and user-created public templates
    const templates = await this.prisma.siatFlow.findMany({
      where: {
        OR: [
          { tenantId, isPublic: true },
          { tenantId: 'system' }, // System templates
        ],
        deletedAt: null,
        status: SiatFlowStatus.DEPLOYED,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: templates,
    };
  }

  async getExecutionHistory(flowId: string, pagination: PaginationDto, tenantId: string) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      this.prisma.siatExecution.findMany({
        where: { flowId, tenantId },
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.siatExecution.count({
        where: { flowId, tenantId },
      }),
    ]);

    return {
      success: true,
      data: executions.map(execution => this.mapToExecutionResponseDto(execution)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async generateCodeInBackground(flowId: string, prompt: string, type: string) {
    try {
      // Generate code using AI
      const generatedCode = await this.codeGenerator.generateModule(prompt, type);

      // Update flow with generated code
      await this.prisma.siatFlow.update({
        where: { id: flowId },
        data: {
          status: SiatFlowStatus.GENERATED,
          generatedCode: generatedCode.code,
          config: this.prepareJson({
            ...this.normalizeJsonObject(generatedCode.config),
            generatedAt: new Date(),
          }),
        },
      });

      this.logger.log(`Code generation completed for flow: ${flowId}`);
    } catch (error) {
      this.logger.error(`Code generation failed for flow: ${flowId}`, error.stack);

      await this.prisma.siatFlow.update({
        where: { id: flowId },
        data: {
          status: SiatFlowStatus.ERROR,
          config: this.prepareJson({
            error: error.message,
            errorAt: new Date(),
          }),
        },
      });
    }
  }

  private mapToResponseDto(flow: any): SiatFlowResponseDto {
    return {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      type: flow.type,
      status: flow.status,
      prompt: flow.prompt,
      generatedCode: flow.generatedCode,
      config: this.normalizeJsonObject(flow.config),
      steps: this.normalizeJsonArray(flow.steps),
      tags: flow.tags,
      isPublic: flow.isPublic,
      tenantId: flow.tenantId,
      createdBy: flow.createdBy,
      lastExecutedAt: flow.lastExecutedAt,
      executionCount: flow.executionCount,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    };
  }

  private mapToExecutionResponseDto(execution: any): SiatExecutionResponseDto {
    return {
      id: execution.id,
      flowId: execution.flowId,
      status: execution.status,
      inputData: this.normalizeJsonObject(execution.inputData),
      outputData: this.normalizeJsonObject(execution.outputData),
      errorMessage: execution.errorMessage,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration,
      executedBy: execution.executedBy,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }

  private buildFlowUpdateData(
    updateFlowDto: UpdateSiatFlowDto,
    _existingFlow: any,
    _user: AuthenticatedUser,
  ): Prisma.SiatFlowUpdateInput {
    const updateData: Prisma.SiatFlowUpdateInput = {
      updatedAt: new Date(),
    };

    const dto: any = updateFlowDto;

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.prompt !== undefined) updateData.prompt = dto.prompt;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;
    if (dto.generatedCode !== undefined) updateData.generatedCode = dto.generatedCode;
    if (dto.config !== undefined) {
      updateData.config = this.prepareJson(dto.config);
    }
    if (dto.steps !== undefined) {
      updateData.steps = this.prepareJson(dto.steps);
    }

    return updateData;
  }

  private prepareJson(value: unknown): Prisma.InputJsonValue {
    return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue;
  }

  private normalizeJsonObject(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private normalizeJsonArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }
}
