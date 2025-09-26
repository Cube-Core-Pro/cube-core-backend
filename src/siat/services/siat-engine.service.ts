// path: backend/src/siat/services/siat-engine.service.ts
// purpose: Core SIAT AI engine service
// dependencies: @nestjs/common, openai, prisma

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  SiatEngineInterface, 
  SiatGenerationResult, 
  SiatValidationResult, 
  SiatExecutionResult,
  SiatContext 
} from '../interfaces/siat-engine.interface';
import { SiatModuleType } from '../interfaces/siat-module.interface';

@Injectable()
export class SiatEngineService implements SiatEngineInterface {
  private readonly logger = new Logger(SiatEngineService.name);

  constructor(private prisma: PrismaService) {}

  async generateCode(
    prompt: string, 
    type: string, 
    context?: SiatContext
  ): Promise<SiatGenerationResult> {
    try {
      this.logger.log(`Generating code for type: ${type}`);
      
      // Get template for the specified type
      const template = await this.getTemplate(type, context?.tenantId);
      
      // Process the prompt with AI
      const generatedCode = await this.processPromptWithAI(prompt, type, template, context);
      
      // Validate the generated code
      const validation = await this.validateCode(generatedCode, type);
      
      if (!validation.isValid) {
        return {
          success: false,
          error: `Generated code validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Save the prompt and result
      await this.savePromptResult(prompt, type, generatedCode, true, context);

      return {
        success: true,
        code: generatedCode,
        metadata: {
          language: this.getLanguageForType(type),
          framework: this.getFrameworkForType(type),
          dependencies: this.getDependenciesForType(type),
          estimatedComplexity: this.calculateComplexity(generatedCode)
        }
      };
    } catch (error) {
      this.logger.error(`Code generation failed: ${error.message}`);
      
      // Save failed attempt
      await this.savePromptResult(prompt, type, null, false, context, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateCode(code: string, type: string): Promise<SiatValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Basic syntax validation
      if (!code || code.trim().length === 0) {
        errors.push('Generated code is empty');
        return { isValid: false, errors, warnings, suggestions };
      }

      // Type-specific validations
      switch (type) {
        case SiatModuleType.CONTROLLER:
          this.validateController(code, errors, warnings, suggestions);
          break;
        case SiatModuleType.SERVICE:
          this.validateService(code, errors, warnings, suggestions);
          break;
        case SiatModuleType.ENTITY:
          this.validateEntity(code, errors, warnings, suggestions);
          break;
        case SiatModuleType.DTO:
          this.validateDto(code, errors, warnings, suggestions);
          break;
        default:
          this.validateGeneric(code, errors, warnings, suggestions);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { isValid: false, errors, warnings, suggestions };
    }
  }

  async executeFlow(flowId: string, inputData: any): Promise<SiatExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      logs.push(`Starting execution of flow: ${flowId}`);
      
      // Get flow details
      const flow = await this.prisma.siatFlow.findUnique({
        where: { id: flowId },
        include: { executions: true }
      });

      if (!flow) {
        throw new Error(`Flow not found: ${flowId}`);
      }

      logs.push(`Found flow: ${flow.name}`);

      // Create execution record
      const execution = await this.prisma.siatExecution.create({
        data: {
          flowId,
          status: 'RUNNING',
          inputData,
          executedBy: inputData.userId || 'system',
          tenantId: flow.tenantId,
          startedAt: new Date()
        }
      });

      logs.push(`Created execution record: ${execution.id}`);

      // Execute flow steps
      const result = await this.executeFlowSteps(flow, inputData, logs);

      // Update execution record
      const duration = Date.now() - startTime;
      await this.prisma.siatExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          outputData: result,
          completedAt: new Date(),
          duration
        }
      });

      // Update flow execution count
      await this.prisma.siatFlow.update({
        where: { id: flowId },
        data: {
          lastExecutedAt: new Date(),
          executionCount: { increment: 1 }
        }
      });

      logs.push(`Flow execution completed successfully`);

      return {
        success: true,
        output: result,
        duration,
        logs
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logs.push(`Flow execution failed: ${error.message}`);

      // Update execution record with error
      try {
        await this.prisma.siatExecution.updateMany({
          where: { 
            flowId,
            status: 'RUNNING',
            startedAt: { gte: new Date(startTime) }
          },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
            duration
          }
        });
      } catch (updateError) {
        this.logger.error(`Failed to update execution record: ${updateError.message}`);
      }

      return {
        success: false,
        error: error.message,
        duration,
        logs
      };
    }
  }

  async optimizeCode(code: string, type: string): Promise<string> {
    try {
      // Implement code optimization using AI and static analysis
      
      // Apply basic optimizations based on code type
      let optimizedCode = code;
      
      switch (type.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          optimizedCode = await this.optimizeJavaScript(code);
          break;
        case 'python':
          optimizedCode = await this.optimizePython(code);
          break;
        case 'sql':
          optimizedCode = await this.optimizeSQL(code);
          break;
        default:
          optimizedCode = await this.optimizeGeneric(code);
      }
      
      // Apply AI-based optimizations
      optimizedCode = await this.applyAIOptimizations(optimizedCode, type);
      
      // Apply security optimizations
      optimizedCode = await this.applySecurityOptimizations(optimizedCode, type);
      
      // Validate optimized code
      const isValid = await this.validateOptimizedCode(optimizedCode, type);
      if (!isValid) {
        this.logger.warn('Optimization produced invalid code, returning original');
        return code;
      }
      
      this.logger.log(`Code optimization completed for ${type}: ${code.length} -> ${optimizedCode.length} chars`);
      return optimizedCode;
    } catch (error) {
      this.logger.error('Error optimizing code', error);
      return code; // Return original code on error
    }
  }

  async analyzeCodeSecurity(code: string, type: string): Promise<{
    securityScore: number;
    vulnerabilities: string[];
    recommendations: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    let securityScore = 100;

    // Check for common security vulnerabilities
    const securityChecks = [
      this.checkSQLInjection(code),
      this.checkXSSVulnerabilities(code),
      this.checkHardcodedSecrets(code),
      this.checkInsecureRandomness(code),
      this.checkUnsafeEval(code),
      this.checkMissingValidation(code),
      this.checkInsecureHTTP(code),
      this.checkWeakCrypto(code)
    ];

    for (const check of securityChecks) {
      const result = await check;
      if (result.hasIssue) {
        vulnerabilities.push(result.description);
        recommendations.push(result.recommendation);
        securityScore -= result.severity;
      }
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (securityScore >= 90) riskLevel = 'LOW';
    else if (securityScore >= 70) riskLevel = 'MEDIUM';
    else if (securityScore >= 50) riskLevel = 'HIGH';
    else riskLevel = 'CRITICAL';

    return {
      securityScore: Math.max(0, securityScore),
      vulnerabilities,
      recommendations,
      riskLevel
    };
  }

  private async applySecurityOptimizations(code: string, type: string): Promise<string> {
    let secureCode = code;

    // Remove potential security issues
    secureCode = secureCode.replace(/eval\s*\(/g, '// SECURITY: eval() removed - ');
    secureCode = secureCode.replace(/innerHTML\s*=/g, 'textContent =');
    secureCode = secureCode.replace(/document\.write\s*\(/g, '// SECURITY: document.write() removed - ');
    
    // Add input validation where missing
    if (type.toLowerCase().includes('controller') && !secureCode.includes('validate')) {
      secureCode = secureCode.replace(
        /@Body\(\)\s+(\w+):/g, 
        '@Body(ValidationPipe) $1:'
      );
    }

    // Ensure HTTPS in URLs
    secureCode = secureCode.replace(/http:\/\//g, 'https://');

    return secureCode;
  }

  private async checkSQLInjection(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasDirectQuery = /query\s*\(\s*[`'"]\s*SELECT.*\$\{/.test(code);
    const hasStringConcatenation = /SELECT.*\+.*\+/.test(code);
    
    if (hasDirectQuery || hasStringConcatenation) {
      return {
        hasIssue: true,
        description: 'Potential SQL injection vulnerability detected',
        recommendation: 'Use parameterized queries or ORM methods instead of string concatenation',
        severity: 25
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkXSSVulnerabilities(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasInnerHTML = /innerHTML\s*=/.test(code);
    const hasDocumentWrite = /document\.write\s*\(/.test(code);
    
    if (hasInnerHTML || hasDocumentWrite) {
      return {
        hasIssue: true,
        description: 'Potential XSS vulnerability detected',
        recommendation: 'Use textContent or sanitize HTML content before rendering',
        severity: 20
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkHardcodedSecrets(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i
    ];
    
    for (const pattern of secretPatterns) {
      if (pattern.test(code)) {
        return {
          hasIssue: true,
          description: 'Hardcoded secrets detected in code',
          recommendation: 'Use environment variables or secure configuration management',
          severity: 30
        };
      }
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkInsecureRandomness(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasWeakRandom = /Math\.random\(\)/.test(code) && /password|token|key|secret/i.test(code);
    
    if (hasWeakRandom) {
      return {
        hasIssue: true,
        description: 'Weak randomness used for security-sensitive operations',
        recommendation: 'Use crypto.randomBytes() or crypto.getRandomValues() for cryptographic randomness',
        severity: 15
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkUnsafeEval(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasEval = /eval\s*\(/.test(code);
    const hasFunction = /new\s+Function\s*\(/.test(code);
    
    if (hasEval || hasFunction) {
      return {
        hasIssue: true,
        description: 'Unsafe code execution detected (eval or Function constructor)',
        recommendation: 'Avoid eval() and Function constructor. Use safer alternatives like JSON.parse()',
        severity: 35
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkMissingValidation(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasInputs = /@Body|@Query|@Param/.test(code);
    const hasValidation = /@IsString|@IsNumber|@IsEmail|validate/.test(code);
    
    if (hasInputs && !hasValidation) {
      return {
        hasIssue: true,
        description: 'Missing input validation on API endpoints',
        recommendation: 'Add validation decorators (@IsString, @IsEmail, etc.) to DTOs',
        severity: 20
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkInsecureHTTP(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const hasHTTP = /http:\/\//.test(code);
    
    if (hasHTTP) {
      return {
        hasIssue: true,
        description: 'Insecure HTTP URLs detected',
        recommendation: 'Use HTTPS URLs for all external communications',
        severity: 10
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async checkWeakCrypto(code: string): Promise<{hasIssue: boolean; description: string; recommendation: string; severity: number}> {
    const weakAlgorithms = /md5|sha1|des|rc4/i.test(code);
    
    if (weakAlgorithms) {
      return {
        hasIssue: true,
        description: 'Weak cryptographic algorithms detected',
        recommendation: 'Use strong algorithms like SHA-256, AES-256, or bcrypt for hashing',
        severity: 25
      };
    }
    
    return { hasIssue: false, description: '', recommendation: '', severity: 0 };
  }

  private async optimizeJavaScript(code: string): Promise<string> {
    let optimized = code;
    
    // Remove unnecessary console.log statements
    optimized = optimized.replace(/console\.log\([^)]*\);?\s*/g, '');
    
    // Optimize variable declarations
    optimized = optimized.replace(/var\s+/g, 'const ');
    
    // Remove unnecessary semicolons
    optimized = optimized.replace(/;+/g, ';');
    
    // Optimize arrow functions
    optimized = optimized.replace(/function\s*\(([^)]*)\)\s*{/g, '($1) => {');
    
    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }

  private async optimizePython(code: string): Promise<string> {
    let optimized = code;
    
    // Remove unnecessary print statements
    optimized = optimized.replace(/print\([^)]*\)\s*/g, '');
    
    // Optimize imports
    optimized = optimized.replace(/^import\s+(\w+)\s*$/gm, 'import $1');
    
    // Remove extra blank lines
    optimized = optimized.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Optimize list comprehensions where possible
    optimized = this.optimizePythonListComprehensions(optimized);
    
    return optimized;
  }

  private async optimizeSQL(code: string): Promise<string> {
    let optimized = code;
    
    // Convert to uppercase keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING'];
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      optimized = optimized.replace(regex, keyword);
    });
    
    // Remove unnecessary spaces
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    // Optimize WHERE clauses
    optimized = optimized.replace(/WHERE\s+1\s*=\s*1\s+AND/gi, 'WHERE');
    
    return optimized;
  }

  private async optimizeGeneric(code: string): Promise<string> {
    let optimized = code;
    
    // Remove excessive whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    // Remove empty lines
    optimized = optimized.replace(/\n\s*\n/g, '\n');
    
    // Remove trailing spaces
    optimized = optimized.replace(/\s+$/gm, '');
    
    return optimized;
  }

  private optimizePythonListComprehensions(code: string): string {
    // Convert simple for loops to list comprehensions
    const forLoopPattern = /for\s+(\w+)\s+in\s+([^:]+):\s*\n\s*(\w+)\.append\(([^)]+)\)/g;
    return code.replace(forLoopPattern, '$3 = [$4 for $1 in $2]');
  }

  private async applyAIOptimizations(code: string, type: string): Promise<string> {
    // Simulate AI-based optimizations
    // In production, this would integrate with OpenAI or similar service
    
    const optimizations = [
      this.removeDeadCode(code),
      this.optimizeLoops(code),
      this.inlineSimpleFunctions(code),
      this.optimizeDataStructures(code),
    ];
    
    let optimized = code;
    for (const optimization of optimizations) {
      try {
        optimized = await optimization;
      } catch (error) {
        this.logger.warn('AI optimization step failed', error);
      }
    }
    
    return optimized;
  }

  private async removeDeadCode(code: string): Promise<string> {
    // Remove unreachable code after return statements
    return code.replace(/return[^;]*;[\s\S]*?(?=\n\s*}|\n\s*$)/g, (match) => {
      const returnStatement = match.match(/return[^;]*;/)[0];
      return returnStatement;
    });
  }

  private async optimizeLoops(code: string): Promise<string> {
    // Optimize simple for loops
    let optimized = code;
    
    // Convert for(let i=0; i<arr.length; i++) to for(const item of arr)
    const forLoopPattern = /for\s*\(\s*let\s+(\w+)\s*=\s*0\s*;\s*\1\s*<\s*(\w+)\.length\s*;\s*\1\+\+\s*\)\s*{([^}]*)}/g;
    optimized = optimized.replace(forLoopPattern, 'for(const item of $2) {$3}');
    
    return optimized;
  }

  private async inlineSimpleFunctions(code: string): Promise<string> {
    // Inline very simple functions (single return statement)
    const simpleFunctionPattern = /function\s+(\w+)\s*\([^)]*\)\s*{\s*return\s+([^;]+);\s*}/g;
    const functions = new Map();
    
    // Extract simple functions
    code.replace(simpleFunctionPattern, (match, name, body) => {
      functions.set(name, body);
      return '';
    });
    
    // Replace function calls with inlined code
    let optimized = code.replace(simpleFunctionPattern, '');
    functions.forEach((body, name) => {
      const callPattern = new RegExp(`\\b${name}\\s*\\([^)]*\\)`, 'g');
      optimized = optimized.replace(callPattern, `(${body})`);
    });
    
    return optimized;
  }

  private async optimizeDataStructures(code: string): Promise<string> {
    // Suggest more efficient data structures
    let optimized = code;
    
    // Replace Array.includes() with Set.has() for large arrays
    const includesPattern = /(\w+)\.includes\(/g;
    optimized = optimized.replace(includesPattern, 'new Set($1).has(');
    
    return optimized;
  }

  private async validateOptimizedCode(code: string, type: string): Promise<boolean> {
    try {
      switch (type.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          return this.validateJavaScript(code);
        case 'python':
          return this.validatePython(code);
        case 'sql':
          return this.validateSQL(code);
        default:
          return code.length > 0 && !code.includes('undefined') && !code.includes('null');
      }
    } catch (error) {
      this.logger.error('Code validation failed', error);
      return false;
    }
  }

  private validateJavaScript(code: string): boolean {
    // Basic syntax validation
    try {
      // Check for balanced brackets
      const brackets = { '(': ')', '[': ']', '{': '}' };
      const stack = [];
      
      for (const char of code) {
        if (brackets[char]) {
          stack.push(brackets[char]);
        } else if (Object.values(brackets).includes(char)) {
          if (stack.pop() !== char) return false;
        }
      }
      
      return stack.length === 0;
    } catch {
      return false;
    }
  }

  private validatePython(code: string): boolean {
    // Basic Python syntax validation
    const lines = code.split('\n');
    let indentLevel = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const currentIndent = line.length - line.trimStart().length;
      
      // Check indentation consistency
      if (trimmed.endsWith(':')) {
        indentLevel = currentIndent + 4;
      } else if (currentIndent < indentLevel && trimmed) {
        indentLevel = currentIndent;
      }
    }
    
    return true; // Basic validation passed
  }

  private validateSQL(code: string): boolean {
    // Basic SQL syntax validation
    const upperCode = code.toUpperCase();
    const hasSelect = upperCode.includes('SELECT');
    const hasFrom = upperCode.includes('FROM');
    
    // Basic structure check for SELECT statements
    if (hasSelect && !hasFrom) return false;
    
    return true;
  }



  private async processPromptWithAI(
    prompt: string, 
    type: string, 
    template: any, 
    context?: SiatContext
  ): Promise<string> {
    try {
      // Integrate with AI service for advanced code generation
      
      // Prepare the AI prompt with context and template
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, type, context, template);
      
      // Get AI response (simulated for now - in production, use OpenAI API)
      const aiResponse = await this.callAIService(enhancedPrompt, type);
      
      // Post-process the AI response
      const processedCode = this.postProcessAIResponse(aiResponse, type);
      
      // Validate the generated code
      const isValid = await this.validateGeneratedCode(processedCode, type);
      if (!isValid) {
        this.logger.warn('AI generated invalid code, falling back to template');
        return this.fallbackToTemplate(prompt, type, template, context);
      }
      
      this.logger.log(`AI code generation completed for ${type}`);
      return processedCode;
    } catch (error) {
      this.logger.error('AI code generation failed, falling back to template', error);
      return this.fallbackToTemplate(prompt, type, template, context);
    }
  }

  private buildEnhancedPrompt(prompt: string, type: string, context?: SiatContext, template?: any): string {
    let enhancedPrompt = `Generate ${type} code for the following requirement:\n\n${prompt}\n\n`;
    
    if (template) {
      enhancedPrompt += `Base template structure:\n${JSON.stringify(template, null, 2)}\n\n`;
    }
    
    if (context) {
      enhancedPrompt += `Context:\n`;
      if (context.variables) {
        enhancedPrompt += `Variables: ${JSON.stringify(context.variables)}\n`;
      }
      if (context.functions) {
        enhancedPrompt += `Available functions: ${context.functions.join(', ')}\n`;
      }
      if (context.libraries) {
        enhancedPrompt += `Libraries: ${context.libraries.join(', ')}\n`;
      }
      if (context.constraints) {
        enhancedPrompt += `Constraints: ${context.constraints.join(', ')}\n`;
      }
    }
    
    enhancedPrompt += `\nRequirements:
- Write clean, efficient, and well-documented code
- Follow best practices for ${type}
- Include error handling where appropriate
- Make the code production-ready
- Return only the code without explanations\n`;
    
    return enhancedPrompt;
  }

  private async callAIService(prompt: string, type: string): Promise<string> {
    // Enhanced AI service call with multiple provider support
    try {
      // Try primary AI service (OpenAI GPT-4)
      const primaryResult = await this.callOpenAI(prompt, type);
      if (primaryResult) return primaryResult;
    } catch (error) {
      this.logger.warn('Primary AI service failed, trying fallback', error);
    }

    try {
      // Fallback to Claude/Anthropic
      const fallbackResult = await this.callClaude(prompt, type);
      if (fallbackResult) return fallbackResult;
    } catch (error) {
      this.logger.warn('Fallback AI service failed, using local generation', error);
    }

    // Final fallback to local template-based generation
    return this.generateLocalCode(prompt, type);
  }

  private async callOpenAI(prompt: string, type: string): Promise<string | null> {
    // Placeholder for OpenAI integration
    // In production, this would use the OpenAI SDK
    const enhancedPrompt = this.buildOpenAIPrompt(prompt, type);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Return null to trigger fallback (in production, return actual AI response)
    return null;
  }

  private async callClaude(prompt: string, type: string): Promise<string | null> {
    // Placeholder for Claude/Anthropic integration
    const enhancedPrompt = this.buildClaudePrompt(prompt, type);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Return null to trigger fallback (in production, return actual AI response)
    return null;
  }

  private generateLocalCode(prompt: string, type: string): string {
    const templates = this.getAdvancedCodeTemplates(type);
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    return this.customizeTemplate(selectedTemplate, prompt);
  }

  private buildOpenAIPrompt(prompt: string, type: string): string {
    return `You are an expert ${type} developer. Generate production-ready code for: ${prompt}
    
Requirements:
- Use TypeScript with strict typing
- Follow NestJS best practices
- Include comprehensive error handling
- Add proper documentation
- Implement security best practices
- Return only the code without explanations`;
  }

  private buildClaudePrompt(prompt: string, type: string): string {
    return `As a senior software architect, create ${type} code for: ${prompt}

Focus on:
- Clean architecture principles
- SOLID design patterns
- Comprehensive testing approach
- Performance optimization
- Maintainable code structure`;
  }

  private getAdvancedCodeTemplates(type: string): string[] {
    switch (type.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        return [
          `class AdvancedProcessor {
  constructor(config = {}) {
    this.config = { 
      batchSize: 100, 
      timeout: 5000, 
      retries: 3,
      ...config 
    };
    this.cache = new Map();
  }
  
  async processWithRetry(data, operation) {
    let attempts = 0;
    
    while (attempts < this.config.retries) {
      try {
        return await this.executeOperation(data, operation);
      } catch (error) {
        attempts++;
        if (attempts >= this.config.retries) throw error;
        await this.delay(1000 * attempts);
      }
    }
  }
  
  async executeOperation(data, operation) {
    const cacheKey = this.generateCacheKey(data, operation);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await operation(data);
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  generateCacheKey(data, operation) {
    return \`\${JSON.stringify(data)}_\${operation.name}\`;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}`
        ];
      
      case 'python':
        return [
          `import asyncio
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ProcessingConfig:
    batch_size: int = 100
    timeout: float = 5.0
    retries: int = 3
    enable_cache: bool = True

class AdvancedProcessor:
    def __init__(self, config: Optional[ProcessingConfig] = None):
        self.config = config or ProcessingConfig()
        self.cache = {}
        self.logger = logging.getLogger(__name__)
    
    async def process_with_retry(self, data: Any, operation: callable) -> Any:
        """Process data with retry logic and error handling."""
        attempts = 0
        
        while attempts < self.config.retries:
            try:
                return await self.execute_operation(data, operation)
            except Exception as e:
                attempts += 1
                if attempts >= self.config.retries:
                    self.logger.error(f"Operation failed after {attempts} attempts: {e}")
                    raise
                
                await asyncio.sleep(1.0 * attempts)
    
    async def execute_operation(self, data: Any, operation: callable) -> Any:
        """Execute operation with caching support."""
        cache_key = self.generate_cache_key(data, operation)
        
        if self.config.enable_cache and cache_key in self.cache:
            return self.cache[cache_key]
        
        result = await operation(data)
        
        if self.config.enable_cache:
            self.cache[cache_key] = result
        
        return result
    
    def generate_cache_key(self, data: Any, operation: callable) -> str:
        """Generate cache key for data and operation."""
        return f"{hash(str(data))}_{operation.__name__}"
    
    async def process_batch(self, items: List[Any], operation: callable) -> List[Any]:
        """Process items in batches."""
        results = []
        
        for i in range(0, len(items), self.config.batch_size):
            batch = items[i:i + self.config.batch_size]
            batch_results = await asyncio.gather(
                *[self.process_with_retry(item, operation) for item in batch],
                return_exceptions=True
            )
            results.extend(batch_results)
        
        return results`
        ];
      
      case 'sql':
        return [
          `-- Advanced data processing query with CTEs and window functions
WITH data_preparation AS (
    SELECT 
        id,
        name,
        category,
        amount,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY amount DESC) as rank_in_category,
        LAG(amount) OVER (PARTITION BY category ORDER BY created_at) as previous_amount,
        AVG(amount) OVER (PARTITION BY category ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg
    FROM transactions
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
),
category_stats AS (
    SELECT 
        category,
        COUNT(*) as total_transactions,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        STDDEV(amount) as amount_stddev,
        MIN(created_at) as first_transaction,
        MAX(created_at) as last_transaction
    FROM data_preparation
    GROUP BY category
),
anomaly_detection AS (
    SELECT 
        dp.*,
        cs.avg_amount,
        cs.amount_stddev,
        CASE 
            WHEN ABS(dp.amount - cs.avg_amount) > 2 * cs.amount_stddev 
            THEN 'ANOMALY'
            ELSE 'NORMAL'
        END as anomaly_flag
    FROM data_preparation dp
    JOIN category_stats cs ON dp.category = cs.category
)
SELECT 
    ad.id,
    ad.name,
    ad.category,
    ad.amount,
    ad.rank_in_category,
    ad.moving_avg,
    ad.anomaly_flag,
    cs.total_transactions,
    cs.avg_amount as category_avg,
    ROUND(
        (ad.amount - cs.avg_amount) / NULLIF(cs.amount_stddev, 0) * 100, 2
    ) as z_score_percentage
FROM anomaly_detection ad
JOIN category_stats cs ON ad.category = cs.category
WHERE ad.rank_in_category <= 10
ORDER BY ad.category, ad.rank_in_category;`
        ];
      
      default:
        return [
          `// Advanced generic code template
class GenericProcessor {
  constructor(options = {}) {
    this.options = {
      debug: false,
      timeout: 30000,
      ...options
    };
  }
  
  async process(input) {
    const startTime = Date.now();
    
    try {
      this.log('Processing started');
      
      const result = await this.executeWithTimeout(
        () => this.performProcessing(input),
        this.options.timeout
      );
      
      this.log(\`Processing completed in \${Date.now() - startTime}ms\`);
      return result;
    } catch (error) {
      this.log(\`Processing failed: \${error.message}\`);
      throw error;
    }
  }
  
  async performProcessing(input) {
    // Implementation here
    return { processed: true, input, timestamp: new Date() };
  }
  
  async executeWithTimeout(operation, timeout) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ]);
  }
  
  log(message) {
    if (this.options.debug) {
      console.log(\`[\${new Date().toISOString()}] \${message}\`);
    }
  }
}`
        ];
    }
  }

  private customizeTemplate(template: string, prompt: string): string {
    // Customize the template based on the prompt
    let customized = template;
    
    // Extract key terms from the prompt
    const keywords = this.extractKeywords(prompt);
    
    // Replace generic names with more specific ones based on keywords
    keywords.forEach(keyword => {
      const capitalizedKeyword = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      customized = customized.replace(/Generic/g, capitalizedKeyword);
      customized = customized.replace(/Advanced/g, `Enhanced${capitalizedKeyword}`);
      customized = customized.replace(/data/gi, keyword);
      customized = customized.replace(/item/gi, `${keyword}Item`);
    });
    
    return customized;
  }

  private extractKeywords(prompt: string): string[] {
    // Simple keyword extraction
    const words = prompt.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'with', 'that', 'this', 'from', 'they', 'have', 'will', 'code', 'function'].includes(word)
    );
    
    return keywords.slice(0, 2); // Take first 2 keywords
  }

  private postProcessAIResponse(response: string, type: string): string {
    let processed = response;
    
    // Remove any markdown code blocks
    processed = processed.replace(/```[\w]*\n?/g, '');
    processed = processed.replace(/```/g, '');
    
    // Clean up extra whitespace
    processed = processed.trim();
    
    // Add type-specific post-processing
    switch (type.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        // Ensure proper semicolons and formatting
        processed = this.formatJavaScript(processed);
        break;
      
      case 'python':
        // Ensure proper indentation
        processed = this.formatPython(processed);
        break;
      
      case 'sql':
        // Ensure proper SQL formatting
        processed = processed.replace(/;?\s*$/, ';');
        break;
    }
    
    return processed;
  }

  private formatJavaScript(code: string): string {
    // Basic JavaScript formatting
    let formatted = code;
    
    // Add missing semicolons
    formatted = formatted.replace(/([^;{}\s])\s*\n/g, '$1;\n');
    
    // Fix spacing around operators
    formatted = formatted.replace(/([^=!<>])=([^=])/g, '$1 = $2');
    formatted = formatted.replace(/([^=!<>])==([^=])/g, '$1 == $2');
    
    return formatted;
  }

  private formatPython(code: string): string {
    const lines = code.split('\n');
    let indentLevel = 0;
    const fixedLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        fixedLines.push('');
        continue;
      }
      
      // Decrease indent for certain keywords
      if (trimmed.startsWith('except') || trimmed.startsWith('finally') || 
          trimmed.startsWith('elif') || trimmed.startsWith('else')) {
        indentLevel = Math.max(0, indentLevel - 4);
      }
      
      // Add proper indentation
      fixedLines.push(' '.repeat(indentLevel) + trimmed);
      
      // Increase indent after colons
      if (trimmed.endsWith(':')) {
        indentLevel += 4;
      }
    }
    
    return fixedLines.join('\n');
  }

  private async validateGeneratedCode(code: string, type: string): Promise<boolean> {
    // Use the same validation as optimization
    return this.validateOptimizedCode(code, type);
  }

  private fallbackToTemplate(prompt: string, type: string, template: any, context?: SiatContext): string {
    // Fallback to original template processing
    const baseTemplate = this.getBaseTemplate(type);
    const processedTemplate = this.processTemplate(baseTemplate, {
      prompt,
      type,
      context,
      timestamp: new Date().toISOString()
    });

    return processedTemplate;
  }

  private async getTemplate(type: string, tenantId?: string): Promise<any> {
    if (tenantId) {
      const template = await this.prisma.siatTemplate.findFirst({
        where: { type, tenantId }
      });
      if (template) return template.template;
    }

    // Return system template
    const systemTemplate = await this.prisma.siatTemplate.findFirst({
      where: { type, isSystem: true }
    });
    
    return systemTemplate?.template || {};
  }

  private async savePromptResult(
    prompt: string,
    type: string,
    generatedCode: string | null,
    success: boolean,
    context?: SiatContext,
    errorMessage?: string
  ): Promise<void> {
    if (!context?.tenantId || !context?.userId) return;

    await this.prisma.siatPrompt.create({
      data: {
        prompt,
        type,
        generatedCode,
        success,
        errorMessage,
        tenantId: context.tenantId,
        userId: context.userId
      }
    });
  }

  private async executeFlowSteps(flow: any, inputData: any, logs: string[]): Promise<any> {
    const steps = Array.isArray(flow.steps) ? flow.steps : [];
    let currentData = inputData;

    for (const [index, step] of steps.entries()) {
      logs.push(`Executing step ${index + 1}: ${step.name || 'Unnamed step'}`);
      
      // Execute step based on type
      currentData = await this.executeStep(step, currentData, logs);
    }

    return currentData;
  }

  private async executeStep(step: any, inputData: any, logs: string[]): Promise<any> {
    // TODO: Implement step execution logic based on step type
    logs.push(`Step executed: ${step.type || 'unknown'}`);
    return inputData;
  }

  private validateController(code: string, errors: string[], warnings: string[], _suggestions: string[]): void {
    if (!code.includes('@Controller')) {
      errors.push('Controller must have @Controller decorator');
    }
    if (!code.includes('export class')) {
      errors.push('Controller must export a class');
    }
    if (!code.includes('@Get') && !code.includes('@Post') && !code.includes('@Put') && !code.includes('@Delete')) {
      warnings.push('Controller should have at least one HTTP method decorator');
    }
  }

  private validateService(code: string, errors: string[], _warnings: string[], _suggestions: string[]): void {
    if (!code.includes('@Injectable')) {
      errors.push('Service must have @Injectable decorator');
    }
    if (!code.includes('export class')) {
      errors.push('Service must export a class');
    }
  }

  private validateEntity(code: string, errors: string[], _warnings: string[], _suggestions: string[]): void {
    if (!code.includes('export interface') && !code.includes('export class')) {
      errors.push('Entity must export an interface or class');
    }
  }

  private validateDto(code: string, errors: string[], warnings: string[], _suggestions: string[]): void {
    if (!code.includes('export class')) {
      errors.push('DTO must export a class');
    }
    if (!code.includes('@IsString') && !code.includes('@IsNumber') && !code.includes('@IsBoolean')) {
      warnings.push('DTO should use validation decorators');
    }
  }

  private validateGeneric(code: string, errors: string[], warnings: string[], _suggestions: string[]): void {
    if (code.includes('TODO') || code.includes('FIXME')) {
      warnings.push('Code contains TODO or FIXME comments');
    }
  }

  private getLanguageForType(_type: string): string {
    return 'typescript';
  }

  private getFrameworkForType(type: string): string {
    if (type.includes('CONTROLLER') || type.includes('SERVICE')) {
      return 'nestjs';
    }
    if (type.includes('COMPONENT') || type.includes('PAGE')) {
      return 'react';
    }
    return 'generic';
  }

  private getDependenciesForType(type: string): string[] {
    const baseDeps = ['@nestjs/common'];
    
    switch (type) {
      case SiatModuleType.CONTROLLER:
        return [...baseDeps, '@nestjs/swagger', 'class-validator'];
      case SiatModuleType.SERVICE:
        return [...baseDeps, '@prisma/client'];
      case SiatModuleType.DTO:
        return ['class-validator', 'class-transformer', '@nestjs/swagger'];
      default:
        return baseDeps;
    }
  }

  private calculateComplexity(code: string): number {
    // Advanced complexity calculation using multiple metrics
    const metrics = this.calculateCodeMetrics(code);
    
    // Weighted complexity score
    const complexityScore = 
      (metrics.lines * 0.1) +
      (metrics.functions * 2) +
      (metrics.conditions * 3) +
      (metrics.loops * 2.5) +
      (metrics.nestedBlocks * 4) +
      (metrics.dependencies * 1.5) +
      (metrics.asyncOperations * 2);
    
    return Math.round(complexityScore);
  }

  private calculateCodeMetrics(code: string): {
    lines: number;
    functions: number;
    conditions: number;
    loops: number;
    nestedBlocks: number;
    dependencies: number;
    asyncOperations: number;
    maintainabilityIndex: number;
    testCoverage: number;
  } {
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    const functions = (code.match(/function|=>/g) || []).length;
    const conditions = (code.match(/if|switch|for|while|catch/g) || []).length;
    const loops = (code.match(/for|while|forEach|map|filter|reduce/g) || []).length;
    const nestedBlocks = this.countNestedBlocks(code);
    const dependencies = (code.match(/import|require/g) || []).length;
    const asyncOperations = (code.match(/async|await|Promise|then|catch/g) || []).length;
    
    // Calculate maintainability index (simplified version)
    const maintainabilityIndex = Math.max(0, 171 - 5.2 * Math.log(lines) - 0.23 * conditions - 16.2 * Math.log(functions + 1));
    
    // Estimate test coverage based on code patterns
    const testCoverage = this.estimateTestCoverage(code);

    return {
      lines,
      functions,
      conditions,
      loops,
      nestedBlocks,
      dependencies,
      asyncOperations,
      maintainabilityIndex: Math.round(maintainabilityIndex),
      testCoverage
    };
  }

  private countNestedBlocks(code: string): number {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === '}') {
        currentNesting--;
      }
    }
    
    return maxNesting;
  }

  private estimateTestCoverage(code: string): number {
    // Estimate test coverage based on code patterns
    let coverage = 0;
    
    // Base coverage for having functions
    if (code.includes('function') || code.includes('=>')) coverage += 20;
    
    // Additional coverage for error handling
    if (code.includes('try') && code.includes('catch')) coverage += 15;
    
    // Coverage for validation
    if (code.includes('validate') || code.includes('check')) coverage += 10;
    
    // Coverage for async operations
    if (code.includes('async') && code.includes('await')) coverage += 10;
    
    // Coverage for type checking
    if (code.includes('typeof') || code.includes('instanceof')) coverage += 5;
    
    // Coverage for edge cases
    if (code.includes('null') || code.includes('undefined')) coverage += 10;
    
    // Coverage for logging
    if (code.includes('log') || code.includes('console')) coverage += 5;
    
    return Math.min(100, coverage);
  }

  private getBaseTemplate(type: string): string {
    const templates = {
      [SiatModuleType.CONTROLLER]: `
import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('{{name}}')
@Controller('{{path}}')
export class {{className}}Controller {
  constructor(private readonly {{serviceName}}: {{ServiceClass}}) {}

  @Get()
  @ApiOperation({ summary: 'Get all {{entities}}' })
  @ApiResponse({ status: 200, description: 'List of {{entities}}' })
  async findAll() {
    return this.{{serviceName}}.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get {{entity}} by ID' })
  async findOne(@Param('id') id: string) {
    return this.{{serviceName}}.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new {{entity}}' })
  async create(@Body() createDto: Create{{EntityClass}}Dto) {
    return this.{{serviceName}}.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update {{entity}}' })
  async update(@Param('id') id: string, @Body() updateDto: Update{{EntityClass}}Dto) {
    return this.{{serviceName}}.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete {{entity}}' })
  async remove(@Param('id') id: string) {
    return this.{{serviceName}}.remove(id);
  }
}`,
      [SiatModuleType.SERVICE]: `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class {{className}}Service {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.{{modelName}}.findMany({
      where: { deletedAt: null }
    });
  }

  async findOne(id: string) {
    const {{entityName}} = await this.prisma.{{modelName}}.findUnique({
      where: { id }
    });
    
    if (!{{entityName}}) {
      throw new NotFoundException('{{EntityClass}} not found');
    }
    
    return {{entityName}};
  }

  async create(data: any) {
    return this.prisma.{{modelName}}.create({
      data
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id); // Check if exists
    
    return this.prisma.{{modelName}}.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists
    
    return this.prisma.{{modelName}}.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}`,
      [SiatModuleType.DTO]: `
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{{className}}Dto {
  @ApiProperty({ description: '{{description}}' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;
}`
    };

    return templates[type] || '// Generated code placeholder';
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value));
    }
    
    return processed;
  }
}