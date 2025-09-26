// path: backend/src/siat/entities/siat-template.entity.ts
// purpose: Entity for SIAT templates
// dependencies: @prisma/client

export interface SiatTemplateEntity {
  id: string;
  name: string;
  description?: string;
  type: string;
  template: any;
  tags: string[];
  isSystem: boolean;
  tenantId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface SiatTemplateWithRelations extends SiatTemplateEntity {
  tenant?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export enum SiatTemplateType {
  WORKFLOW = 'WORKFLOW',
  COMPONENT = 'COMPONENT',
  MODULE = 'MODULE',
  INTEGRATION = 'INTEGRATION',
  REPORT = 'REPORT',
  DASHBOARD = 'DASHBOARD'
}
