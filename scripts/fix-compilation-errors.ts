#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const baseDir = path.join(__dirname, '../src');

// Fix system-check.ts
const systemCheckPath = path.join(__dirname, 'system-check.ts');
if (fs.existsSync(systemCheckPath)) {
  let content = fs.readFileSync(systemCheckPath, 'utf8');
  content = content.replace(/process\.env\.REDIS_URL/g, "process.env['REDIS_URL']");
  fs.writeFileSync(systemCheckPath, content);
  console.log('✅ Fixed system-check.ts');
}

// Create missing service files with proper structure
const servicesToCreate = [
  // AI Agents services
  'ai-agents/services/ai-agents.service.ts',
  
  // Blockchain services
  'blockchain/services/digital-identity.service.ts',
  'blockchain/services/smart-contract.service.ts',
  'blockchain/services/wallet.service.ts',
  'blockchain/services/transaction.service.ts',
  
  // All other missing services from modules
  'blockchain/eidas/eidas.service.ts',
  'blockchain/eidas/digital-wallet.service.ts',
  'blockchain/eidas/qualified-certificate.service.ts',
  'blockchain/eidas/electronic-signature.service.ts',
  'blockchain/eidas/identity-verification.service.ts',
  
  'blockchain/networks/ethereum.service.ts',
  'blockchain/networks/polygon.service.ts',
  'blockchain/networks/bsc.service.ts',
  'blockchain/networks/solana.service.ts',
  'blockchain/networks/cardano.service.ts',
  'blockchain/networks/hyperledger.service.ts',
];

const serviceTemplate = (className: string) => `
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ${className} {
  private readonly logger = new Logger(${className}.name);

  constructor() {
    this.logger.log('${className} initialized');
  }

  async initialize() {
    return { status: 'initialized', service: '${className}' };
  }
}
`;

servicesToCreate.forEach(servicePath => {
  const fullPath = path.join(baseDir, servicePath);
  const dir = path.dirname(fullPath);
  const fileName = path.basename(servicePath, '.ts');
  const className = fileName.split('-').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('').replace('.service', 'Service');

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create file if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, serviceTemplate(className));
    console.log(`✅ Created: ${servicePath}`);
  }
});

// Create missing controller files
const controllersToCreate = [
  'blockchain/controllers/digital-identity.controller.ts',
  'blockchain/controllers/smart-contract.controller.ts',
  'blockchain/controllers/nft.controller.ts',
  'blockchain/controllers/defi.controller.ts',
  
  'edge-computing/controllers/iot.controller.ts',
  'edge-computing/controllers/edge-analytics.controller.ts',
  'edge-computing/controllers/device-management.controller.ts',
  
  'gamification/controllers/metaverse.controller.ts',
  'gamification/controllers/achievements.controller.ts',
  'gamification/controllers/leaderboard.controller.ts',
  
  'sustainability/controllers/esg.controller.ts',
  'sustainability/controllers/carbon-tracking.controller.ts',
  'sustainability/controllers/circular-economy.controller.ts',
  
  'digital-health/controllers/telemedicine.controller.ts',
  'digital-health/controllers/health-records.controller.ts',
  'digital-health/controllers/wearable-devices.controller.ts',
  
  'education/controllers/learning-management.controller.ts',
  'education/controllers/assessment.controller.ts',
  'education/controllers/certification.controller.ts',
  
  'smart-manufacturing/controllers/production.controller.ts',
  'smart-manufacturing/controllers/quality-control.controller.ts',
  'smart-manufacturing/controllers/maintenance.controller.ts',
  
  'smart-cities/controllers/digital-government.controller.ts',
  'smart-cities/controllers/urban-planning.controller.ts',
  'smart-cities/controllers/public-services.controller.ts',
];

const controllerTemplate = (className: string, route: string) => `
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('${className.replace('Controller', '')}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${route}')
export class ${className} {
  @Get()
  @ApiOperation({ summary: 'Get ${route}' })
  async get() {
    return { message: '${className} endpoint - Coming soon' };
  }
}
`;

controllersToCreate.forEach(controllerPath => {
  const fullPath = path.join(baseDir, controllerPath);
  const dir = path.dirname(fullPath);
  const fileName = path.basename(controllerPath, '.ts');
  const className = fileName.split('-').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('').replace('.controller', 'Controller');
  const route = fileName.replace('.controller', '').replace(/([A-Z])/g, '-$1').toLowerCase().substring(1);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create file if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, controllerTemplate(className, route));
    console.log(`✅ Created: ${controllerPath}`);
  }
});

console.log('🎉 Compilation error fixes completed!');