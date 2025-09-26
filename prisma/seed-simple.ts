// path: backend/prisma/seed-simple.ts
// purpose: Simple seed for basic data
// dependencies: @prisma/client, bcrypt

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple database seeding...');

  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: 'CUBE CORE Enterprise' },
    update: {},
    create: {
      id: 'tenant-default',
      name: 'CUBE CORE Enterprise',
      domain: 'cubecore.local',
      status: 'ACTIVE',
      subscriptionPlan: 'ENTERPRISE_PLUS',
      maxUsers: 1000,
      features: {
        modules: ['CRM', 'ERP', 'CSM', 'Banking', 'SIAT', 'Analytics']
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD'
      }
    }
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create system roles
  const adminRole = await prisma.role.upsert({
    where: { 
      name_tenantId: { 
        name: 'ADMIN', 
        tenantId: tenant.id 
      } 
    },
    update: {},
    create: {
      name: 'ADMIN',
      tenantId: tenant.id,
      description: 'Administrator with full access',
      isSystemRole: true,
      permissions: {
        modules: ['*']
      }
    }
  });

  await prisma.role.upsert({
    where: { 
      name_tenantId: { 
        name: 'USER', 
        tenantId: tenant.id 
      } 
    },
    update: {},
    create: {
      name: 'USER',
      tenantId: tenant.id,
      description: 'Standard user',
      isSystemRole: true,
      permissions: {
        modules: ['Dashboard']
      }
    }
  });

  console.log('✅ Created system roles');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cubecore.com' },
    update: {},
    create: {
      email: 'admin@cubecore.com',
      name: 'System Administrator',
      firstName: 'System',
      lastName: 'Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
      isEmailVerified: true,
      preferences: {
        theme: 'light',
        language: 'en'
      }
    }
  });

  // Assign admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId_tenantId: {
        userId: adminUser.id,
        roleId: adminRole.id,
        tenantId: tenant.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      tenantId: tenant.id
    }
  });

  console.log('✅ Created admin user');

  console.log('✅ Skipped i18n entries (table not ready)');

  console.log('🎉 Simple database seeding completed!');
  console.log('\n🔐 Default Login:');
  console.log('- Email: admin@cubecore.com');
  console.log('- Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });