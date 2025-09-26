// path: backend/src/siat/entities/siat-flow.entity.ts
// purpose: Entity for SIAT flows
// dependencies: @prisma/client

export interface SiatFlowEntity {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  prompt: string;
  generatedCode?: string;
  config: any;
  steps: any;
  tags: string[];
  isPublic: boolean;
  tenantId: string;
  createdBy?: string;
  lastExecutedAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SiatFlowWithRelations extends SiatFlowEntity {
  tenant?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  executions?: Array<{
    id: string;
    status: string;
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
  }>;
}
