// path: backend/src/siat/services/siat-deployment.service.ts
// purpose: Deployment service for SIAT generated modules
// dependencies: @nestjs/common, fs, path

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SiatDeploymentService {
  private readonly logger = new Logger(SiatDeploymentService.name);
  private readonly deploymentPath: string;

  constructor(private readonly configService: ConfigService) {
    this.deploymentPath = this.configService.get('SIAT_DEPLOYMENT_PATH', './generated-modules');
  }

  async deployFlow(flow: any, config?: any): Promise<{ success: boolean; message: string; deploymentId?: string }> {
    try {
      this.logger.log(`Deploying flow: ${flow.id}`);

      // Validate flow before deployment
      if (!flow.generatedCode) {
        throw new Error('Flow has no generated code to deploy');
      }

      if (flow.status !== 'GENERATED') {
        throw new Error('Flow must be in GENERATED status to deploy');
      }

      // Create deployment directory
      const deploymentId = `${flow.id}-${Date.now()}`;
      const deploymentDir = path.join(this.deploymentPath, deploymentId);
      
      await this.ensureDirectoryExists(deploymentDir);

      // Write generated code to files
      await this.writeGeneratedFiles(deploymentDir, flow, config);

      // Create deployment manifest
      await this.createDeploymentManifest(deploymentDir, flow, deploymentId);

      // Validate deployment
      const validationResult = await this.validateDeployment(deploymentDir);
      if (!validationResult.isValid) {
        throw new Error(`Deployment validation failed: ${validationResult.errors.join(', ')}`);
      }

      // In a real implementation, this would:
      // 1. Build the module
      // 2. Run tests
      // 3. Deploy to target environment
      // 4. Register with module registry
      // 5. Update routing/discovery

      this.logger.log(`Flow deployed successfully: ${deploymentId}`);

      return {
        success: true,
        message: 'Flow deployed successfully',
        deploymentId,
      };
    } catch (error) {
      this.logger.error(`Deployment failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Deployment failed: ${error.message}`,
      };
    }
  }

  async undeployFlow(deploymentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const deploymentDir = path.join(this.deploymentPath, deploymentId);
      
      // Check if deployment exists
      try {
        await fs.access(deploymentDir);
      } catch {
        return {
          success: false,
          message: 'Deployment not found',
        };
      }

      // Remove deployment directory
      await fs.rm(deploymentDir, { recursive: true, force: true });

      this.logger.log(`Flow undeployed successfully: ${deploymentId}`);

      return {
        success: true,
        message: 'Flow undeployed successfully',
      };
    } catch (error) {
      this.logger.error(`Undeployment failed: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Undeployment failed: ${error.message}`,
      };
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<{ status: string; details: any }> {
    try {
      const deploymentDir = path.join(this.deploymentPath, deploymentId);
      const manifestPath = path.join(deploymentDir, 'deployment.json');

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        return {
          status: 'deployed',
          details: {
            deploymentId,
            flowId: manifest.flowId,
            deployedAt: manifest.deployedAt,
            version: manifest.version,
            files: manifest.files,
          },
        };
      } catch {
        return {
          status: 'not_found',
          details: null,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get deployment status: ${error.message}`, error.stack);
      return {
        status: 'error',
        details: { error: error.message },
      };
    }
  }

  async listDeployments(): Promise<{ deployments: any[] }> {
    try {
      await this.ensureDirectoryExists(this.deploymentPath);
      const entries = await fs.readdir(this.deploymentPath, { withFileTypes: true });
      
      const deployments = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(this.deploymentPath, entry.name, 'deployment.json');
          
          try {
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            deployments.push({
              deploymentId: entry.name,
              ...manifest,
            });
          } catch {
            // Skip invalid deployments
          }
        }
      }

      return { deployments };
    } catch (error) {
      this.logger.error(`Failed to list deployments: ${error.message}`, error.stack);
      return { deployments: [] };
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async writeGeneratedFiles(deploymentDir: string, flow: any, config?: any): Promise<void> {
    const files = this.parseGeneratedCode(flow.generatedCode, flow.type);

    for (const file of files) {
      const filePath = path.join(deploymentDir, file.path);
      const fileDir = path.dirname(filePath);
      
      await this.ensureDirectoryExists(fileDir);
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Write package.json if it's a Node.js module
    if (flow.type === 'API' || flow.type === 'CRUD') {
      await this.writePackageJson(deploymentDir, flow);
    }

    // Write Docker files for containerized deployment
    if (config?.containerized) {
      await this.writeDockerFiles(deploymentDir, flow);
    }
  }

  private parseGeneratedCode(generatedCode: string, flowType: string): { path: string; content: string }[] {
    const files = [];

    // Basic file structure based on flow type
    switch (flowType) {
      case 'CRUD':
      case 'API':
        files.push({
          path: 'src/module.ts',
          content: generatedCode,
        });
        files.push({
          path: 'src/index.ts',
          content: this.generateIndexFile(flowType),
        });
        break;

      case 'FORM':
      case 'DASHBOARD':
        files.push({
          path: 'src/component.tsx',
          content: generatedCode,
        });
        files.push({
          path: 'src/index.ts',
          content: `export { default } from './component';`,
        });
        break;

      case 'WORKFLOW':
        files.push({
          path: 'src/workflow.ts',
          content: generatedCode,
        });
        files.push({
          path: 'src/index.ts',
          content: `export { GeneratedWorkflow as default } from './workflow';`,
        });
        break;

      default:
        files.push({
          path: 'src/generated.ts',
          content: generatedCode,
        });
        files.push({
          path: 'src/index.ts',
          content: `export * from './generated';`,
        });
    }

    // Add TypeScript configuration
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      }, null, 2),
    });

    return files;
  }

  private generateIndexFile(flowType: string): string {
    switch (flowType) {
      case 'CRUD':
        return `
import { Module } from '@nestjs/common';
import { GeneratedController, GeneratedService } from './module';

@Module({
  controllers: [GeneratedController],
  providers: [GeneratedService],
  exports: [GeneratedService],
})
export class GeneratedModule {}

export * from './module';
`;

      case 'API':
        return `
import { Module } from '@nestjs/common';
import { GeneratedApiController } from './module';

@Module({
  controllers: [GeneratedApiController],
})
export class GeneratedApiModule {}

export * from './module';
`;

      default:
        return `export * from './module';`;
    }
  }

  private async writePackageJson(deploymentDir: string, flow: any): Promise<void> {
    const packageJson = {
      name: `generated-module-${flow.id}`,
      version: '1.0.0',
      description: `Generated module: ${flow.name}`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'ts-node src/index.ts',
        test: 'jest',
      },
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@nestjs/platform-express': '^10.0.0',
        'reflect-metadata': '^0.1.13',
        'rxjs': '^7.8.0',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'ts-node': '^10.9.0',
        'jest': '^29.0.0',
        '@types/jest': '^29.0.0',
      },
      keywords: ['generated', 'siat', 'cube-core'],
      author: 'SIAT Generator',
      license: 'MIT',
    };

    const packagePath = path.join(deploymentDir, 'package.json');
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');
  }

  private async writeDockerFiles(deploymentDir: string, _flow: any): Promise<void> {
    const dockerfile = `
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["npm", "start"]
`;

    const dockerignore = `
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
.coverage/
src
tsconfig.json
`;

    await fs.writeFile(path.join(deploymentDir, 'Dockerfile'), dockerfile, 'utf-8');
    await fs.writeFile(path.join(deploymentDir, '.dockerignore'), dockerignore, 'utf-8');
  }

  private async createDeploymentManifest(deploymentDir: string, flow: any, deploymentId: string): Promise<void> {
    const manifest = {
      deploymentId,
      flowId: flow.id,
      flowName: flow.name,
      flowType: flow.type,
      version: '1.0.0',
      deployedAt: new Date().toISOString(),
      status: 'deployed',
      files: await this.getDeploymentFiles(deploymentDir),
      config: flow.config,
      metadata: {
        generatedAt: flow.config?.generatedAt,
        prompt: flow.prompt,
        tags: flow.tags,
      },
    };

    const manifestPath = path.join(deploymentDir, 'deployment.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  private async getDeploymentFiles(deploymentDir: string): Promise<string[]> {
    const files = [];
    
    async function scanDirectory(dir: string, basePath = ''): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    }

    await scanDirectory(deploymentDir);
    return files;
  }

  private async validateDeployment(deploymentDir: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors = [];

    try {
      // Check required files
      const requiredFiles = ['deployment.json', 'package.json', 'tsconfig.json'];
      
      for (const file of requiredFiles) {
        const filePath = path.join(deploymentDir, file);
        try {
          await fs.access(filePath);
        } catch {
          errors.push(`Required file missing: ${file}`);
        }
      }

      // Validate package.json
      try {
        const packagePath = path.join(deploymentDir, 'package.json');
        const packageContent = await fs.readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        
        if (!packageJson.name || !packageJson.version) {
          errors.push('Invalid package.json: missing name or version');
        }
      } catch (error) {
        errors.push(`Invalid package.json: ${error.message}`);
      }

      // Check source files exist
      const srcDir = path.join(deploymentDir, 'src');
      try {
        await fs.access(srcDir);
        const srcFiles = await fs.readdir(srcDir);
        if (srcFiles.length === 0) {
          errors.push('No source files found in src directory');
        }
      } catch {
        errors.push('Source directory not found');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
      };
    }
  }
}