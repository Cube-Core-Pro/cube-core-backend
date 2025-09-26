#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function seedTestUsers() {
  console.log('🌱 Seeding test users for CUBE CORE...');

  try {
    // Create default tenant
    const defaultTenant = await prisma.tenant.upsert({
      where: { slug: 'cube-core-demo' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'CUBE CORE Demo',
        slug: 'cube-core-demo',
        domain: 'demo.cube-core.com',
        settings: {
          features: {
            webmail: true,
            ai: true,
            banking: true,
            crm: true,
            erp: true,
            pos: true,
          },
          limits: {
            users: 100,
            storage: 10737418240, // 10GB
            emailsPerHour: 1000,
          },
          security: {
            mfaRequired: false,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSymbols: false,
            },
          },
        },
        isActive: true,
      },
    });

    console.log(`✅ Created tenant: ${defaultTenant.name}`);

    // Hash password for all test users
    const hashedPassword = await bcrypt.hash('CubeCore2024!', 12);

    // Test users data
    const testUsers = [
      {
        email: 'admin@cube-core.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPERADMIN',
        department: 'IT',
        position: 'System Administrator',
      },
      {
        email: 'ceo@cube-core.com',
        firstName: 'Maria',
        lastName: 'Rodriguez',
        role: 'ADMIN',
        department: 'Executive',
        position: 'Chief Executive Officer',
      },
      {
        email: 'cto@cube-core.com',
        firstName: 'Carlos',
        lastName: 'Silva',
        role: 'ADMIN',
        department: 'Technology',
        position: 'Chief Technology Officer',
      },
      {
        email: 'sales@cube-core.com',
        firstName: 'Ana',
        lastName: 'Martinez',
        role: 'USER',
        department: 'Sales',
        position: 'Sales Manager',
      },
      {
        email: 'support@cube-core.com',
        firstName: 'Luis',
        lastName: 'Garcia',
        role: 'USER',
        department: 'Support',
        position: 'Customer Support Specialist',
      },
      {
        email: 'finance@cube-core.com',
        firstName: 'Isabella',
        lastName: 'Lopez',
        role: 'USER',
        department: 'Finance',
        position: 'Financial Analyst',
      },
      {
        email: 'hr@cube-core.com',
        firstName: 'Diego',
        lastName: 'Fernandez',
        role: 'USER',
        department: 'Human Resources',
        position: 'HR Manager',
      },
      {
        email: 'marketing@cube-core.com',
        firstName: 'Sofia',
        lastName: 'Morales',
        role: 'USER',
        department: 'Marketing',
        position: 'Marketing Coordinator',
      },
      {
        email: 'operations@cube-core.com',
        firstName: 'Miguel',
        lastName: 'Torres',
        role: 'USER',
        department: 'Operations',
        position: 'Operations Manager',
      },
      {
        email: 'developer@cube-core.com',
        firstName: 'Elena',
        lastName: 'Vargas',
        role: 'USER',
        department: 'Technology',
        position: 'Senior Developer',
      },
    ];

    // Create test users
    for (const userData of testUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          id: uuidv4(),
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isActive: true,
          isEmailVerified: true,
          tenantId: defaultTenant.id,
        },
      });

      console.log(`✅ Created user: ${user.email} (${userData.role})`);
    }

    // Create sample emails for demonstration
    const sampleEmails = [
      {
        fromEmail: 'ceo@cube-core.com',
        toEmail: 'admin@cube-core.com',
        subject: 'Q4 Planning Meeting',
        content: 'Hi, let\'s schedule our Q4 planning meeting for next week. Please check your calendar and let me know your availability.',
        folder: 'inbox',
        priority: 'high',
      },
      {
        fromEmail: 'sales@cube-core.com',
        toEmail: 'ceo@cube-core.com',
        subject: 'Monthly Sales Report',
        content: 'Please find attached the monthly sales report. We exceeded our targets by 15% this month!',
        folder: 'inbox',
        priority: 'normal',
      },
      {
        fromEmail: 'support@cube-core.com',
        toEmail: 'cto@cube-core.com',
        subject: 'System Maintenance Window',
        content: 'We need to schedule a maintenance window for the database upgrade. Proposed time: Sunday 2 AM - 6 AM.',
        folder: 'inbox',
        priority: 'normal',
      },
      {
        fromEmail: 'hr@cube-core.com',
        toEmail: 'admin@cube-core.com',
        subject: 'New Employee Onboarding',
        content: 'We have 3 new employees starting next Monday. Please prepare their accounts and access permissions.',
        folder: 'inbox',
        priority: 'normal',
      },
      {
        fromEmail: 'finance@cube-core.com',
        toEmail: 'ceo@cube-core.com',
        subject: 'Budget Review Required',
        content: 'The Q4 budget needs your review and approval. I\'ve highlighted the key changes in the attached document.',
        folder: 'inbox',
        priority: 'high',
      },
    ];

    // Get users for email creation
    const users = await prisma.user.findMany({
      where: { tenantId: defaultTenant.id },
    });

    const userMap = new Map(users.map(user => [user.email, user]));

    for (const emailData of sampleEmails) {
      const fromUser = userMap.get(emailData.fromEmail);
      const toUser = userMap.get(emailData.toEmail);

      if (fromUser && toUser) {
        await prisma.webmail.create({
          data: {
            id: uuidv4(),
            tenantId: defaultTenant.id,
            fromUserId: fromUser.id,
            toUserId: toUser.id,
            subject: emailData.subject,
            content: emailData.content,
            folder: emailData.folder,
            priority: emailData.priority,
            isRead: Math.random() > 0.5, // Random read status
            isStarred: Math.random() > 0.8, // 20% chance of being starred
            labels: [],
            attachments: [],
            metadata: {
              source: 'seed',
              createdAt: new Date(),
            },
          },
        });

        console.log(`✅ Created sample email: ${emailData.subject}`);
      }
    }

    console.log('\n🎉 Test users and data seeded successfully!');
    console.log('\n📧 Test User Credentials:');
    console.log('Email: admin@cube-core.com | Password: CubeCore2024! | Role: SUPERADMIN');
    console.log('Email: ceo@cube-core.com | Password: CubeCore2024! | Role: ADMIN');
    console.log('Email: cto@cube-core.com | Password: CubeCore2024! | Role: ADMIN');
    console.log('Email: sales@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: support@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: finance@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: hr@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: marketing@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: operations@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('Email: developer@cube-core.com | Password: CubeCore2024! | Role: USER');
    console.log('\n🌐 Tenant: cube-core-demo');
    console.log('🔗 API Base URL: http://localhost:3000/api/v1');
    console.log('📚 API Documentation: http://localhost:3000/api/docs');

  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestUsers();