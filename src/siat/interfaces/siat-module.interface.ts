// path: backend/src/siat/interfaces/siat-module.interface.ts
// purpose: Interface for SIAT generated modules
// dependencies: none

export interface SiatModuleInterface {
  id: string;
  name: string;
  type: SiatModuleType;
  version: string;
  dependencies: string[];
  exports: SiatModuleExport[];
  metadata: SiatModuleMetadata;
}

export enum SiatModuleType {
  CONTROLLER = 'CONTROLLER',
  SERVICE = 'SERVICE',
  ENTITY = 'ENTITY',
  DTO = 'DTO',
  GUARD = 'GUARD',
  MIDDLEWARE = 'MIDDLEWARE',
  COMPONENT = 'COMPONENT',
  PAGE = 'PAGE',
  HOOK = 'HOOK',
  UTILITY = 'UTILITY',
  INTEGRATION = 'INTEGRATION'
}

export interface SiatModuleExport {
  name: string;
  type: 'class' | 'function' | 'constant' | 'interface' | 'type';
  description?: string;
}

export interface SiatModuleMetadata {
  author: string;
  createdAt: Date;
  description: string;
  tags: string[];
  complexity: number;
  testCoverage?: number;
  documentation?: string;
}

export interface SiatModuleTemplate {
  id: string;
  name: string;
  type: SiatModuleType;
  template: string;
  variables: SiatTemplateVariable[];
  examples: SiatTemplateExample[];
}

export interface SiatTemplateVariable {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description?: string;
}

export interface SiatTemplateExample {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: string;
}