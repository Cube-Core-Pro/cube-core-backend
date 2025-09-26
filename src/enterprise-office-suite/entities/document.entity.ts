// path: backend/src/enterprise-office-suite/entities/document.entity.ts
// purpose: Entity for office documents
// dependencies: @prisma/client

export interface DocumentEntity {
  id: string;
  title: string;
  description?: string;
  type: string;
  format: string;
  content: Record<string, any>;
  templateId?: string;
  folderId?: string;
  tags: string[];
  isPublic: boolean;
  allowCollaboration: boolean;
  settings: Record<string, any>;
  version: number;
  size: number;
  checksum: string;
  tenantId: string;
  createdBy: string;
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface DocumentWithRelations extends DocumentEntity {
  tenant?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  lastModifier?: {
    id: string;
    name: string;
    email: string;
  };
  folder?: {
    id: string;
    name: string;
    path: string;
  };
  template?: {
    id: string;
    title: string;
    type: string;
  };
  collaborators?: Array<{
    id: string;
    userId: string;
    permission: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  versions?: Array<{
    id: string;
    version: number;
    changes: string;
    createdAt: Date;
    createdBy: string;
  }>;
  comments?: Array<{
    id: string;
    content: string;
    position?: Record<string, any>;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export enum DocumentPermission {
  READ = 'READ',
  WRITE = 'WRITE',
  COMMENT = 'COMMENT',
  ADMIN = 'ADMIN'
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}