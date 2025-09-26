import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Create default tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: 'default-tenant' },
      update: {},
      create: {
        id: 'default-tenant',
        name: 'Default Tenant',
      },
    });

    console.log('✅ Default tenant created');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@localhost' },
      update: {},
      create: {
        email: 'admin@localhost',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        tenantId: tenant.id,
        roles: ['admin'],
        emailVerifiedAt: new Date(),
        isEmailVerified: true,
      },
    });

    console.log('✅ Admin user created');

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'DATABASE_INITIALIZED',
        // Remove entityType field - not in schema
        userId: adminUser.id,
        tenantId: tenant.id,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        },
      },
    });

    console.log('✅ Audit log created');
    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });