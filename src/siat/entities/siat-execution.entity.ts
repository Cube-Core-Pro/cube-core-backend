// path: backend/src/siat/entities/siat-execution.entity.ts
// purpose: Entity for SIAT executions
// dependencies: @prisma/client

export interface SiatExecutionEntity {
  id: string;
  flowId: string;
  status: string;
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  executedBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiatExecutionWithRelations extends SiatExecutionEntity {
  flow?: {
    id: string;
    name: string;
    type: string;
  };
  executor?: {
    id: string;
    name: string;
    email: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
}

export enum SiatExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}