// path: backend/src/siat/entities/siat-prompt.entity.ts
// purpose: Entity for SIAT prompts
// dependencies: @prisma/client

export interface SiatPromptEntity {
  id: string;
  prompt: string;
  type: string;
  generatedCode?: string;
  success: boolean;
  errorMessage?: string;
  tenantId: string;
  userId: string;
  createdAt: Date;
}

export interface SiatPromptWithRelations extends SiatPromptEntity {
  tenant?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export enum SiatPromptType {
  MODULE_GENERATION = 'MODULE_GENERATION',
  COMPONENT_CREATION = 'COMPONENT_CREATION',
  WORKFLOW_DESIGN = 'WORKFLOW_DESIGN',
  API_ENDPOINT = 'API_ENDPOINT',
  DATABASE_SCHEMA = 'DATABASE_SCHEMA',
  FRONTEND_PAGE = 'FRONTEND_PAGE',
  INTEGRATION = 'INTEGRATION',
  REPORT = 'REPORT'
}