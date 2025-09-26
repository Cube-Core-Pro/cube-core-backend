// path: backend/src/siat/interfaces/siat-engine.interface.ts
// purpose: Interface for SIAT AI engine
// dependencies: none

export interface SiatEngineInterface {
  generateCode(prompt: string, type: string, context?: any): Promise<SiatGenerationResult>;
  validateCode(code: string, type: string): Promise<SiatValidationResult>;
  executeFlow(flowId: string, inputData: any): Promise<SiatExecutionResult>;
  optimizeCode(code: string, type: string): Promise<string>;
  analyzeCodeSecurity(code: string, type: string): Promise<SiatSecurityAnalysisResult>;
}

export interface SiatGenerationResult {
  success: boolean;
  code?: string;
  error?: string;
  metadata?: {
    language: string;
    framework: string;
    dependencies: string[];
    estimatedComplexity: number;
    codeMetrics?: SiatCodeMetrics;
    securityAnalysis?: SiatSecurityAnalysisResult;
  };
}

export interface SiatValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface SiatExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  logs: string[];
}

export interface SiatContext {
  tenantId: string;
  userId: string;
  projectStructure?: any;
  existingModules?: string[];
  dependencies?: string[];
  variables?: Record<string, any>;
  functions?: string[];
  libraries?: string[];
  constraints?: string[];
  preferences?: {
    language: string;
    framework: string;
    codeStyle: string;
  };
}

export interface SiatSecurityAnalysisResult {
  securityScore: number;
  vulnerabilities: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SiatCodeMetrics {
  lines: number;
  functions: number;
  conditions: number;
  loops: number;
  nestedBlocks: number;
  dependencies: number;
  asyncOperations: number;
  maintainabilityIndex: number;
  testCoverage: number;
}

export interface SiatPerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface SiatAIProvider {
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
}

export interface SiatOptimizationResult {
  originalCode: string;
  optimizedCode: string;
  improvements: string[];
  performanceGain: number;
  securityImprovements: string[];
  maintainabilityScore: number;
}