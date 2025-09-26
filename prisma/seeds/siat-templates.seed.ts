// path: backend/prisma/seeds/siat-templates.seed.ts
// purpose: Seed system SIAT templates
// dependencies: @prisma/client

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSiatTemplates() {
  console.log('🌱 Seeding SIAT templates...');

  // Create system tenant if it doesn't exist
  const systemTenant = await prisma.tenant.upsert({
    where: { id: 'system' },
    update: {},
    create: {
      id: 'system',
      name: 'System',
      domain: 'system.cubecore.ai',
      status: 'ACTIVE',
      settings: {},
      features: {}
    }
  });

  // Create system user if it doesn't exist
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@cubecore.ai' },
    update: {},
    create: {
      id: 'system',
      email: 'system@cubecore.ai',
      name: 'System',
      password: '$2b$10$system.hash.placeholder', // Placeholder hash
      tenantId: 'system',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      isEmailVerified: true
    }
  });

  const systemTemplates = [
    {
      name: 'NestJS Controller Template',
      description: 'Standard NestJS controller with CRUD operations',
      type: 'CONTROLLER',
      template: {
        structure: 'nestjs-controller',
        imports: [
          '@nestjs/common',
          '@nestjs/swagger',
          'class-validator'
        ],
        decorators: ['@Controller', '@ApiTags', '@UseGuards'],
        methods: ['create', 'findAll', 'findOne', 'update', 'remove'],
        authentication: true,
        authorization: true,
        swagger: true
      },
      tags: ['nestjs', 'controller', 'crud', 'api'],
      isSystem: true
    },
    {
      name: 'NestJS Service Template',
      description: 'Standard NestJS service with database operations',
      type: 'SERVICE',
      template: {
        structure: 'nestjs-service',
        imports: [
          '@nestjs/common',
          '@prisma/client'
        ],
        decorators: ['@Injectable'],
        methods: ['create', 'findAll', 'findOne', 'update', 'remove'],
        database: 'prisma',
        errorHandling: true,
        logging: true
      },
      tags: ['nestjs', 'service', 'database', 'prisma'],
      isSystem: true
    },
    {
      name: 'DTO Template',
      description: 'Data Transfer Object with validation',
      type: 'DTO',
      template: {
        structure: 'dto',
        imports: [
          'class-validator',
          'class-transformer',
          '@nestjs/swagger'
        ],
        validation: true,
        swagger: true,
        transformations: true
      },
      tags: ['dto', 'validation', 'swagger'],
      isSystem: true
    },
    {
      name: 'React Component Template',
      description: 'React functional component with TypeScript',
      type: 'COMPONENT',
      template: {
        structure: 'react-component',
        imports: [
          'react',
          '@types/react'
        ],
        typescript: true,
        hooks: ['useState', 'useEffect'],
        styling: 'tailwind',
        props: true
      },
      tags: ['react', 'component', 'typescript', 'tailwind'],
      isSystem: true
    },
    {
      name: 'Next.js Page Template',
      description: 'Next.js page component with App Router',
      type: 'PAGE',
      template: {
        structure: 'nextjs-page',
        imports: [
          'react',
          'next/navigation'
        ],
        router: 'app-router',
        metadata: true,
        seo: true,
        layout: true
      },
      tags: ['nextjs', 'page', 'app-router', 'seo'],
      isSystem: true
    },
    {
      name: 'Prisma Entity Template',
      description: 'Prisma model definition with relationships',
      type: 'ENTITY',
      template: {
        structure: 'prisma-model',
        fields: ['id', 'createdAt', 'updatedAt'],
        relationships: true,
        indexes: true,
        constraints: true,
        softDelete: true
      },
      tags: ['prisma', 'entity', 'database', 'model'],
      isSystem: true
    },
    {
      name: 'Auth Guard Template',
      description: 'NestJS authentication guard',
      type: 'GUARD',
      template: {
        structure: 'nestjs-guard',
        imports: [
          '@nestjs/common',
          '@nestjs/jwt'
        ],
        authentication: 'jwt',
        authorization: true,
        roles: true
      },
      tags: ['nestjs', 'guard', 'auth', 'jwt'],
      isSystem: true
    },
    {
      name: 'API Integration Template',
      description: 'External API integration service',
      type: 'INTEGRATION',
      template: {
        structure: 'api-integration',
        imports: [
          '@nestjs/common',
          '@nestjs/axios',
          'rxjs'
        ],
        httpClient: 'axios',
        errorHandling: true,
        retry: true,
        caching: true
      },
      tags: ['integration', 'api', 'axios', 'http'],
      isSystem: true
    },
    {
      name: 'Custom Hook Template',
      description: 'React custom hook with TypeScript',
      type: 'HOOK',
      template: {
        structure: 'react-hook',
        imports: [
          'react'
        ],
        typescript: true,
        stateManagement: true,
        sideEffects: true
      },
      tags: ['react', 'hook', 'typescript', 'state'],
      isSystem: true
    },
    {
      name: 'Utility Function Template',
      description: 'Utility function with TypeScript',
      type: 'UTILITY',
      template: {
        structure: 'utility-function',
        typescript: true,
        testing: true,
        documentation: true,
        errorHandling: true
      },
      tags: ['utility', 'function', 'typescript', 'helper'],
      isSystem: true
    }
  ];

  for (const template of systemTemplates) {
    // Check if template already exists
    const existingTemplate = await prisma.siatTemplate.findFirst({
      where: {
        name: template.name,
        isSystem: true
      }
    });

    if (existingTemplate) {
      // Update existing template
      await prisma.siatTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          description: template.description,
          type: template.type,
          template: template.template,
          tags: template.tags,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new template
      await prisma.siatTemplate.create({
        data: {
          ...template,
          tenantId: 'system', // Special tenant ID for system templates
          createdBy: 'system'
        }
      });
    }
  }

  console.log(`✅ Seeded ${systemTemplates.length} SIAT templates`);
}

if (require.main === module) {
  seedSiatTemplates()
    .catch((e) => {
      console.error('❌ Error seeding SIAT templates:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}