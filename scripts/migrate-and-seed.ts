// path: backend/scripts/migrate-and-seed.ts
// purpose: Migration and seeding script for CUBE CORE enterprise modules
// dependencies: prisma, bcrypt, uuid

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting CUBE CORE migration and seeding...');

  try {
    // 1. Create default tenant if not exists
    const defaultTenant = await prisma.tenant.upsert({
      where: { subdomain: 'default' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'CUBE CORE Default',
        subdomain: 'default',
        domain: 'cubecore.com',
        status: 'ACTIVE',
        settings: {
          theme: 'default',
          features: {
            collaboration: true,
            videoConferencing: true,
            enterpriseEmail: true,
            remoteDesktop: true,
          },
        },
        billingPlan: 'ENTERPRISE',
        maxUsers: 10000,
      },
    });

    console.log('✅ Default tenant created/updated');

    // 2. Create system admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@cubecore.com' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@cubecore.com',
        firstName: 'System',
        lastName: 'Administrator',
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        tenantId: defaultTenant.id,
        role: 'SYSTEM_ADMIN',
      },
    });

    console.log('✅ System admin user created/updated');

    // 3. Create default roles
    const roles = [
      { name: 'SYSTEM_ADMIN', description: 'System Administrator with full access' },
      { name: 'TENANT_ADMIN', description: 'Tenant Administrator' },
      { name: 'USER', description: 'Standard User' },
      { name: 'VIEWER', description: 'Read-only User' },
      { name: 'COLLABORATION_ADMIN', description: 'Collaboration Administrator' },
      { name: 'VIDEO_HOST', description: 'Video Conference Host' },
      { name: 'EMAIL_ADMIN', description: 'Email Administrator' },
      { name: 'VDI_ADMIN', description: 'VDI Administrator' },
    ];

    for (const roleData of roles) {
      await prisma.role.upsert({
        where: { 
          name_tenantId: { 
            name: roleData.name, 
            tenantId: defaultTenant.id 
          } 
        },
        update: {},
        create: {
          ...roleData,
          tenantId: defaultTenant.id,
        },
      });
    }

    console.log('✅ Default roles created/updated');

    // 4. Create default email folders
    const emailFolders = [
      { name: 'Inbox', isSystem: true },
      { name: 'Sent', isSystem: true },
      { name: 'Drafts', isSystem: true },
      { name: 'Trash', isSystem: true },
      { name: 'Spam', isSystem: true },
      { name: 'Archive', isSystem: true },
    ];

    for (const folderData of emailFolders) {
      await prisma.emailFolder.upsert({
        where: {
          name_userId_tenantId: {
            name: folderData.name,
            userId: adminUser.id,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          ...folderData,
          userId: adminUser.id,
          tenantId: defaultTenant.id,
        },
      });
    }

    console.log('✅ Default email folders created/updated');

    // 5. Create default email signatures
    await prisma.emailSignature.upsert({
      where: {
        userId_tenantId: {
          userId: adminUser.id,
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        name: 'Default Signature',
        textContent: '\n\nBest regards,\nCUBE CORE Team',
        htmlContent: '<br><br><strong>Best regards,</strong><br>CUBE CORE Team',
        isDefault: true,
        userId: adminUser.id,
        tenantId: defaultTenant.id,
      },
    });

    console.log('✅ Default email signature created/updated');

    // 6. Create default VDI templates
    const vdiTemplates = [
      {
        name: 'Windows Desktop',
        description: 'Standard Windows desktop environment',
        type: 'WINDOWS_DESKTOP',
        resources: {
          cpu: 2,
          memory: 4096,
          storage: 50,
        },
        applications: ['Microsoft Office', 'Web Browser', 'File Manager'],
      },
      {
        name: 'Linux Desktop',
        description: 'Ubuntu desktop environment',
        type: 'LINUX_DESKTOP',
        resources: {
          cpu: 2,
          memory: 2048,
          storage: 30,
        },
        applications: ['LibreOffice', 'Firefox', 'Terminal'],
      },
      {
        name: 'Development Environment',
        description: 'Development environment with IDE and tools',
        type: 'DEVELOPMENT',
        resources: {
          cpu: 4,
          memory: 8192,
          storage: 100,
        },
        applications: ['VS Code', 'Docker', 'Git', 'Node.js', 'Python'],
      },
    ];

    for (const templateData of vdiTemplates) {
      await prisma.sessionTemplate.upsert({
        where: {
          name_tenantId: {
            name: templateData.name,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          ...templateData,
          tenantId: defaultTenant.id,
          createdBy: adminUser.id,
        },
      });
    }

    console.log('✅ Default VDI templates created/updated');

    // 7. Create default email filters
    const emailFilters = [
      {
        name: 'Spam Filter',
        description: 'Automatically move spam emails to spam folder',
        conditions: {
          isSpam: true,
        },
        actions: {
          moveToFolder: 'Spam',
          markAsRead: false,
        },
        isActive: true,
        priority: 1,
      },
      {
        name: 'Newsletter Filter',
        description: 'Filter newsletters and promotions',
        conditions: {
          subjectContains: ['newsletter', 'promotion', 'unsubscribe'],
        },
        actions: {
          addTag: 'Newsletter',
          markAsRead: false,
        },
        isActive: true,
        priority: 2,
      },
    ];

    for (const filterData of emailFilters) {
      await prisma.emailFilter.upsert({
        where: {
          name_userId_tenantId: {
            name: filterData.name,
            userId: adminUser.id,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          ...filterData,
          userId: adminUser.id,
          tenantId: defaultTenant.id,
        },
      });
    }

    console.log('✅ Default email filters created/updated');

    // 8. Create sample email templates
    const emailTemplates = [
      {
        name: 'Welcome Email',
        subject: 'Welcome to CUBE CORE',
        body: 'Welcome to CUBE CORE! We are excited to have you on board.',
        htmlBody: '<h1>Welcome to CUBE CORE!</h1><p>We are excited to have you on board.</p>',
        category: 'WELCOME',
        variables: ['firstName', 'lastName', 'companyName'],
      },
      {
        name: 'Meeting Invitation',
        subject: 'Meeting Invitation: {{meetingTitle}}',
        body: 'You are invited to join the meeting: {{meetingTitle}} on {{meetingDate}}',
        htmlBody: '<h2>Meeting Invitation</h2><p>You are invited to join the meeting: <strong>{{meetingTitle}}</strong> on {{meetingDate}}</p>',
        category: 'MEETING',
        variables: ['meetingTitle', 'meetingDate', 'meetingUrl'],
      },
    ];

    for (const templateData of emailTemplates) {
      await prisma.emailTemplate.upsert({
        where: {
          name_tenantId: {
            name: templateData.name,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          ...templateData,
          tenantId: defaultTenant.id,
          createdBy: adminUser.id,
        },
      });
    }

    console.log('✅ Default email templates created/updated');

    // 9. Update tenant with document permissions relation
    await prisma.tenant.update({
      where: { id: defaultTenant.id },
      data: {
        updatedAt: new Date(),
      },
    });

    console.log('✅ Tenant relations updated');

    console.log('🎉 Migration and seeding completed successfully!');
    console.log('📧 Admin credentials: admin@cubecore.com / Admin123!');

  } catch (error) {
    console.error('❌ Error during migration and seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });