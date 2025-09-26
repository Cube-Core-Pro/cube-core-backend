// path: backend/src/siat/services/siat-flow.service.ts
// purpose: Service for managing SIAT flows
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSiatFlowDto } from '../dto/create-siat-flow.dto';
import { UpdateSiatFlowDto } from '../dto/update-siat-flow.dto';
import { ExecuteSiatFlowDto } from '../dto/execute-siat-flow.dto';
import { SiatFlowEntity, SiatFlowWithRelations } from '../entities/siat-flow.entity';
import { SiatEngineService } from './siat-engine.service';

@Injectable()
export class SiatFlowService {
  private readonly logger = new Logger(SiatFlowService.name);

  constructor(
    private prisma: PrismaService,
    private siatEngine: SiatEngineService
  ) {}

  async create(
    createSiatFlowDto: CreateSiatFlowDto,
    tenantId: string,
    userId: string
  ): Promise<SiatFlowEntity> {
    try {
      this.logger.log(`Creating SIAT flow: ${createSiatFlowDto.name}`);

      // Generate code from prompt if provided
      let generatedCode = createSiatFlowDto.generatedCode;
      if (createSiatFlowDto.prompt && !generatedCode) {
        const result = await this.siatEngine.generateCode(
          createSiatFlowDto.prompt,
          createSiatFlowDto.type,
          { tenantId, userId }
        );
        
        if (result.success) {
          generatedCode = result.code;
        } else {
          this.logger.warn(`Code generation failed: ${result.error}`);
        }
      }

      const flow = await this.prisma.siatFlow.create({
        data: {
          name: createSiatFlowDto.name,
          description: createSiatFlowDto.description,
          type: createSiatFlowDto.type,
          prompt: createSiatFlowDto.prompt,
          generatedCode,
          config: this.prepareJson(createSiatFlowDto.config ?? {}),
          steps: this.prepareJson(createSiatFlowDto.steps ?? []),
          tags: createSiatFlowDto.tags || [],
          isPublic: createSiatFlowDto.isPublic || false,
          tenantId,
          createdBy: userId,
          status: 'DRAFT'
        }
      });

      this.logger.log(`SIAT flow created successfully: ${flow.id}`);
      return this.mapFlow(flow);
    } catch (error) {
      this.logger.error(`Failed to create SIAT flow: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    includePublic: boolean = true
  ): Promise<SiatFlowWithRelations[]> {
    const whereCondition: any = {
      deletedAt: null,
      OR: [
        { tenantId },
        ...(includePublic ? [{ isPublic: true }] : [])
      ]
    };

    const flows = await this.prisma.siatFlow.findMany({
      where: whereCondition,
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        executions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            duration: true
          },
          orderBy: { startedAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return flows.map(flow => this.mapFlowWithRelations(flow));
  }

  async findOne(
    id: string,
    tenantId: string,
    _userId: string
  ): Promise<SiatFlowWithRelations> {
    const flow = await this.prisma.siatFlow.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { tenantId },
          { isPublic: true }
        ]
      },
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        executions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            duration: true,
            executor: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { startedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!flow) {
      throw new NotFoundException('SIAT flow not found');
    }

    return this.mapFlowWithRelations(flow);
  }

  async update(
    id: string,
    updateSiatFlowDto: UpdateSiatFlowDto,
    tenantId: string,
    userId: string
  ): Promise<SiatFlowEntity> {
    const flow = await this.findOne(id, tenantId, userId);

    // Check if user can edit this flow
    if (flow.tenantId !== tenantId && !flow.isPublic) {
      throw new ForbiddenException('You cannot edit this flow');
    }

    if (flow.createdBy !== userId && flow.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot edit this flow');
    }

    // Regenerate code if prompt changed
    let generatedCode = updateSiatFlowDto.generatedCode;
    if (updateSiatFlowDto.prompt && updateSiatFlowDto.prompt !== flow.prompt) {
      const result = await this.siatEngine.generateCode(
        updateSiatFlowDto.prompt,
        updateSiatFlowDto.type || flow.type,
        { tenantId, userId }
      );
      
      if (result.success) {
        generatedCode = result.code;
      }
    }

    const updateData: Prisma.SiatFlowUpdateInput = {
      updatedAt: new Date(),
    };

    if (updateSiatFlowDto.name !== undefined) updateData.name = updateSiatFlowDto.name;
    if (updateSiatFlowDto.description !== undefined) updateData.description = updateSiatFlowDto.description;
    if (updateSiatFlowDto.type !== undefined) updateData.type = updateSiatFlowDto.type;
    if (updateSiatFlowDto.prompt !== undefined) updateData.prompt = updateSiatFlowDto.prompt;
    if (generatedCode !== undefined) updateData.generatedCode = generatedCode;
    if (updateSiatFlowDto.config !== undefined) {
      updateData.config = this.prepareJson(updateSiatFlowDto.config);
    }
    if (updateSiatFlowDto.steps !== undefined) {
      updateData.steps = this.prepareJson(updateSiatFlowDto.steps);
    }
    if (updateSiatFlowDto.tags !== undefined) updateData.tags = updateSiatFlowDto.tags;
    if (updateSiatFlowDto.isPublic !== undefined) updateData.isPublic = updateSiatFlowDto.isPublic;
    if (updateSiatFlowDto.status !== undefined) updateData.status = updateSiatFlowDto.status;

    const updated = await this.prisma.siatFlow.update({
      where: { id },
      data: updateData,
    });

    return this.mapFlow(updated);
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const flow = await this.findOne(id, tenantId, userId);

    // Check if user can delete this flow
    if (flow.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot delete this flow');
    }

    if (flow.createdBy !== userId && flow.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot delete this flow');
    }

    await this.prisma.siatFlow.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    this.logger.log(`SIAT flow deleted: ${id}`);
  }

  async execute(
    executeSiatFlowDto: ExecuteSiatFlowDto,
    tenantId: string,
    userId: string
  ): Promise<any> {
    const flow = await this.findOne(executeSiatFlowDto.flowId, tenantId, userId);

    if (flow.status !== 'ACTIVE' && flow.status !== 'DRAFT') {
      throw new ForbiddenException('Flow is not in executable state');
    }

    this.logger.log(`Executing SIAT flow: ${flow.name} (${flow.id})`);

    const inputData = {
      ...executeSiatFlowDto.inputData,
      userId,
      tenantId
    };

    return this.siatEngine.executeFlow(flow.id, inputData);
  }

  async activate(id: string, tenantId: string, userId: string): Promise<SiatFlowEntity> {
    const flow = await this.findOne(id, tenantId, userId);

    if (flow.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot activate this flow');
    }

    // Validate the flow before activation
    if (!flow.generatedCode) {
      throw new ForbiddenException('Flow must have generated code before activation');
    }

    const validation = await this.siatEngine.validateCode(flow.generatedCode, flow.type);
    if (!validation.isValid) {
      throw new ForbiddenException(`Flow validation failed: ${validation.errors.join(', ')}`);
    }

    const updated = await this.prisma.siatFlow.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    return this.mapFlow(updated);
  }

  async deactivate(id: string, tenantId: string, userId: string): Promise<SiatFlowEntity> {
    const flow = await this.findOne(id, tenantId, userId);

    if (flow.tenantId !== tenantId) {
      throw new ForbiddenException('You cannot deactivate this flow');
    }

    const updated = await this.prisma.siatFlow.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    return this.mapFlow(updated);
  }

  async duplicate(id: string, tenantId: string, userId: string): Promise<SiatFlowEntity> {
    const originalFlow = await this.findOne(id, tenantId, userId);

    const duplicatedFlow = await this.prisma.siatFlow.create({
      data: {
        name: `${originalFlow.name} (Copy)`,
        description: originalFlow.description,
        type: originalFlow.type,
        prompt: originalFlow.prompt,
        generatedCode: originalFlow.generatedCode,
        config: this.prepareJson(originalFlow.config),
        steps: this.prepareJson(originalFlow.steps),
        tags: originalFlow.tags,
        isPublic: false, // Copies are private by default
        tenantId,
        createdBy: userId,
        status: 'DRAFT'
      }
    });

    this.logger.log(`SIAT flow duplicated: ${originalFlow.id} -> ${duplicatedFlow.id}`);
    return this.mapFlow(duplicatedFlow);
  }

  async getExecutionHistory(
    id: string,
    tenantId: string,
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const flow = await this.findOne(id, tenantId, userId);

    return this.prisma.siatExecution.findMany({
      where: { flowId: flow.id },
      include: {
        executor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: limit
    });
  }

  async getFlowsByTag(
    tag: string,
    tenantId: string,
    _userId: string
  ): Promise<SiatFlowWithRelations[]> {
    const flows = await this.prisma.siatFlow.findMany({
      where: {
        deletedAt: null,
        tags: { has: tag },
        OR: [
          { tenantId },
          { isPublic: true }
        ]
      },
      include: {
        tenant: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return flows.map(flow => this.mapFlowWithRelations(flow));
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

  private mapFlow(flow: any): SiatFlowEntity {
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
      tags: Array.isArray(flow.tags) ? flow.tags : [],
      isPublic: Boolean(flow.isPublic),
      tenantId: flow.tenantId,
      createdBy: flow.createdBy,
      lastExecutedAt: flow.lastExecutedAt ?? undefined,
      executionCount: flow.executionCount ?? 0,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    };
  }

  private mapFlowWithRelations(flow: any): SiatFlowWithRelations {
    return {
      ...this.mapFlow(flow),
      tenant: flow.tenant ? { ...flow.tenant } : undefined,
      creator: flow.creator ? { ...flow.creator } : undefined,
      executions: Array.isArray(flow.executions)
        ? flow.executions.map((execution: any) => ({
            ...execution,
            executor: execution.executor ? { ...execution.executor } : undefined,
          }))
        : undefined,
    };
  }

  async getFlowStats(tenantId: string): Promise<any> {
    const [totalFlows, activeFlows, totalExecutions, recentExecutions] = await Promise.all([
      this.prisma.siatFlow.count({
        where: { tenantId, deletedAt: null }
      }),
      this.prisma.siatFlow.count({
        where: { tenantId, deletedAt: null, status: 'ACTIVE' }
      }),
      this.prisma.siatExecution.count({
        where: { tenantId }
      }),
      this.prisma.siatExecution.count({
        where: {
          tenantId,
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      })
    ]);

    return {
      totalFlows,
      activeFlows,
      totalExecutions,
      recentExecutions,
      averageExecutionsPerFlow: totalFlows > 0 ? Math.round(totalExecutions / totalFlows) : 0
    };
  }
}
