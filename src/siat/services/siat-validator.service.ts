// path: backend/src/siat/services/siat-validator.service.ts
// purpose: Validation service for SIAT generated code and prompts
// dependencies: @nestjs/common, typescript, eslint

import { Injectable, Logger } from '@nestjs/common';
import * as ts from 'typescript';

@Injectable()
export class SiatValidatorService {
  private readonly logger = new Logger(SiatValidatorService.name);

  async validatePrompt(prompt: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Basic prompt validation
      if (!prompt || prompt.trim().length < 10) {
        errors.push('Prompt must be at least 10 characters long');
      }

      if (prompt.length > 2000) {
        errors.push('Prompt must be less than 2000 characters');
      }

      // Check for potentially dangerous content
      const dangerousPatterns = [
        /eval\s*\(/i,
        /function\s*\(\s*\)\s*\{.*\}/i,
        /new\s+Function/i,
        /setTimeout\s*\(/i,
        /setInterval\s*\(/i,
        /document\./i,
        /window\./i,
        /process\./i,
        /require\s*\(/i,
        /import\s+.*from/i,
        /__proto__/i,
        /constructor/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(prompt)) {
          errors.push(`Potentially unsafe content detected: ${pattern.source}`);
        }
      }

      // Check for SQL injection patterns
      const sqlPatterns = [
        /drop\s+table/i,
        /delete\s+from/i,
        /truncate\s+table/i,
        /alter\s+table/i,
        /create\s+table/i,
        /insert\s+into/i,
        /update\s+.*set/i,
        /union\s+select/i,
        /--/,
        /\/\*/,
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(prompt)) {
          errors.push(`Potentially unsafe SQL pattern detected: ${pattern.source}`);
        }
      }

      // Validate prompt structure
      if (!this.hasValidStructure(prompt)) {
        errors.push('Prompt should describe what you want to create, including entities, operations, and requirements');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error(`Prompt validation error: ${error.message}`, error.stack);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }

  async validateGeneratedCode(generatedCode: any): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!generatedCode || !generatedCode.code) {
        errors.push('No code generated');
        return { isValid: false, errors, warnings };
      }

      const code = generatedCode.code;

      // TypeScript syntax validation
      const syntaxValidation = this.validateTypeScriptSyntax(code);
      if (!syntaxValidation.isValid) {
        errors.push(...syntaxValidation.errors);
      }

      // Security validation
      const securityValidation = this.validateCodeSecurity(code);
      if (!securityValidation.isValid) {
        errors.push(...securityValidation.errors);
      }
      warnings.push(...securityValidation.warnings);

      // Code quality validation
      const qualityValidation = this.validateCodeQuality(code);
      warnings.push(...qualityValidation.warnings);

      // Architecture validation
      const architectureValidation = this.validateArchitecture(code);
      if (!architectureValidation.isValid) {
        warnings.push(...architectureValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Code validation error: ${error.message}`, error.stack);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings,
      };
    }
  }

  private hasValidStructure(prompt: string): boolean {
    // Check for basic structure indicators
    const hasAction = /\b(create|build|generate|make|add|implement|develop)\b/i.test(prompt);
    const hasEntity = /\b(user|customer|product|order|form|table|dashboard|report|api|module|component)\b/i.test(prompt);
    const hasRequirement = /\b(with|that|should|must|need|require|include|have)\b/i.test(prompt);

    return hasAction && hasEntity && hasRequirement;
  }

  private validateTypeScriptSyntax(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const transpileResult = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.Latest,
          moduleResolution: ts.ModuleResolutionKind.NodeNext,
          strict: false,
          skipLibCheck: true,
        },
        reportDiagnostics: true,
      });

      const diagnostics = transpileResult.diagnostics ?? [];

      for (const diagnostic of diagnostics) {
        if (diagnostic.file) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          errors.push(`Line ${line + 1}, Column ${character + 1}: ${message}`);
        } else {
          errors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`TypeScript validation failed: ${error.message}`],
      };
    }
  }

  private validateCodeSecurity(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Dangerous patterns that should cause errors
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: 'Use of eval() is prohibited' },
      { pattern: /new\s+Function/g, message: 'Dynamic function creation is prohibited' },
      { pattern: /process\.exit/g, message: 'Process manipulation is prohibited' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/g, message: 'Child process execution is prohibited' },
      { pattern: /require\s*\(\s*['"]fs['"]\s*\)/g, message: 'File system access is prohibited' },
      { pattern: /require\s*\(\s*['"]os['"]\s*\)/g, message: 'OS module access is prohibited' },
      { pattern: /\.exec\s*\(/g, message: 'Command execution is prohibited' },
      { pattern: /\.spawn\s*\(/g, message: 'Process spawning is prohibited' },
    ];

    // Suspicious patterns that should cause warnings
    const suspiciousPatterns = [
      { pattern: /setTimeout\s*\(/g, message: 'Use of setTimeout detected - ensure timeout limits' },
      { pattern: /setInterval\s*\(/g, message: 'Use of setInterval detected - ensure cleanup' },
      { pattern: /fetch\s*\(/g, message: 'External API calls detected - ensure proper validation' },
      { pattern: /XMLHttpRequest/g, message: 'XMLHttpRequest usage detected - consider using approved HTTP clients' },
      { pattern: /localStorage/g, message: 'LocalStorage usage detected - ensure data sanitization' },
      { pattern: /sessionStorage/g, message: 'SessionStorage usage detected - ensure data sanitization' },
      { pattern: /innerHTML/g, message: 'innerHTML usage detected - potential XSS risk' },
      { pattern: /document\.write/g, message: 'document.write usage detected - potential XSS risk' },
    ];

    // Check for dangerous patterns
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Check for suspicious patterns
    for (const { pattern, message } of suspiciousPatterns) {
      if (pattern.test(code)) {
        warnings.push(message);
      }
    }

    // Check for hardcoded secrets
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(code)) {
        warnings.push('Potential hardcoded secret detected - use environment variables');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateCodeQuality(code: string): { warnings: string[] } {
    const warnings: string[] = [];

    // Check for code quality issues
    if (code.length > 10000) {
      warnings.push('Generated code is very long - consider breaking into smaller modules');
    }

    // Check for proper error handling
    if (!code.includes('try') && !code.includes('catch')) {
      warnings.push('No error handling detected - consider adding try-catch blocks');
    }

    // Check for logging
    if (!code.includes('console.log') && !code.includes('logger')) {
      warnings.push('No logging detected - consider adding logging for debugging');
    }

    // Check for documentation
    if (!code.includes('/**') && !code.includes('//')) {
      warnings.push('No documentation detected - consider adding comments');
    }

    // Check for type annotations
    if (code.includes('any') && code.split('any').length > 3) {
      warnings.push('Excessive use of "any" type - consider using specific types');
    }

    return { warnings };
  }

  private validateArchitecture(code: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check for proper separation of concerns
    if (code.includes('@Controller') && code.includes('prisma.')) {
      warnings.push('Controller directly accessing database - consider using services');
    }

    // Check for proper dependency injection
    if (code.includes('new ') && !code.includes('constructor')) {
      warnings.push('Direct instantiation detected - consider using dependency injection');
    }

    // Check for proper validation
    if (code.includes('@Body()') && !code.includes('@IsString') && !code.includes('validate')) {
      warnings.push('Request body without validation detected - consider adding validation');
    }

    // Check for proper response structure
    if (code.includes('return ') && !code.includes('success') && !code.includes('data')) {
      warnings.push('Inconsistent response structure - consider using standard response format');
    }

    return {
      isValid: true, // Architecture issues are warnings, not errors
      warnings,
    };
  }

  async validateFlowExecution(flow: any, inputData: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate flow structure
      if (!flow.steps || !Array.isArray(flow.steps)) {
        errors.push('Flow must have steps array');
      }

      if (flow.steps && flow.steps.length === 0) {
        errors.push('Flow must have at least one step');
      }

      // Validate step structure
      if (flow.steps) {
        for (const step of flow.steps) {
          if (!step.id || !step.type) {
            errors.push(`Step missing required fields: ${JSON.stringify(step)}`);
          }

          // Validate step configuration
          if (step.type === 'transform' && !step.config?.transformCode) {
            errors.push(`Transform step ${step.id} missing transformCode`);
          }

          if (step.type === 'condition' && !step.config?.condition) {
            errors.push(`Condition step ${step.id} missing condition`);
          }
        }
      }

      // Validate input data
      if (inputData && typeof inputData !== 'object') {
        errors.push('Input data must be an object');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error(`Flow validation error: ${error.message}`, error.stack);
      return {
        isValid: false,
        errors: [`Flow validation error: ${error.message}`],
      };
    }
  }
}
