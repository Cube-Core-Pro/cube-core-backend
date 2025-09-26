// path: backend/prisma/seed.ts
// purpose: Seed database with initial data for enterprise modules
// dependencies: @prisma/client, bcrypt

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

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
        modules: ['CRM', 'ERP', 'CSM', 'Banking', 'SIAT', 'Analytics', 'Projects', 'Documents', 'HR', 'Accounting', 'Quality', 'Supply', 'Assets', 'Risk', 'Compliance', 'AI', 'Chat', 'Reports', 'Integration', 'Monitoring'],
        gameChanging: ['Enterprise Office Suite', 'Enterprise WebMail', 'Tokenization & Blockchain', 'Remote Desktop', 'PCI DSS', 'Advanced Accounting CPA', 'AI Trading & Markets', 'No-Code AI Builder']
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        theme: 'light'
      }
    }
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create public tenant (for website leads)
  const publicTenantId = process.env.PUBLIC_TENANT_ID || 'public-tenant';
  const publicTenant = await prisma.tenant.upsert({
    where: { id: publicTenantId },
    update: {},
    create: {
      id: publicTenantId,
      name: 'Public Website',
      domain: 'public.cubecore.local',
      status: 'ACTIVE',
      subscriptionPlan: 'GROWTH',
      maxUsers: 50,
      features: {
        modules: ['CRM'],
        gameChanging: []
      },
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        language: 'en',
        theme: 'light'
      }
    }
  });
  console.log('✅ Ensured public tenant:', publicTenant.id);

  // Create system roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system access', isSystemRole: true },
    { name: 'ADMIN', description: 'Administrator with tenant-wide access', isSystemRole: true },
    { name: 'MANAGER', description: 'Manager with departmental access', isSystemRole: true },
    { name: 'USER', description: 'Standard user with basic access', isSystemRole: true },
    { name: 'VIEWER', description: 'Read-only access user', isSystemRole: true },
    { name: 'CRM_MANAGER', description: 'CRM Module Manager', isSystemRole: false },
    { name: 'ERP_MANAGER', description: 'ERP Module Manager', isSystemRole: false },
    { name: 'HR_MANAGER', description: 'HR Module Manager', isSystemRole: false },
    { name: 'FINANCE_MANAGER', description: 'Finance Module Manager', isSystemRole: false },
    { name: 'PROJECT_MANAGER', description: 'Project Manager', isSystemRole: false }
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { 
        name_tenantId: { 
          name: roleData.name, 
          tenantId: tenant.id 
        } 
      },
      update: {},
      create: {
        ...roleData,
        tenantId: tenant.id,
        permissions: {
          modules: roleData.name === 'SUPER_ADMIN' ? ['*'] : 
                   roleData.name === 'ADMIN' ? ['CRM', 'ERP', 'CSM', 'Banking', 'Analytics', 'Projects', 'Documents', 'HR', 'Accounting'] :
                   roleData.name.includes('_MANAGER') ? [roleData.name.split('_')[0]] : ['Dashboard']
        } as any
      }
    });
  }

  console.log('✅ Created system roles');

  // Create default users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const users = [
    {
      email: 'admin@cubecore.com',
      name: 'System Administrator',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      isEmailVerified: true
    },
    {
      email: 'manager@cubecore.com',
      name: 'Department Manager',
      firstName: 'Department',
      lastName: 'Manager',
      role: 'MANAGER',
      isEmailVerified: true
    },
    {
      email: 'user@cubecore.com',
      name: 'Standard User',
      firstName: 'Standard',
      lastName: 'User',
      role: 'USER',
      isEmailVerified: true
    }
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        tenantId: tenant.id,
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        }
      }
    });

    // Assign role to user
    const role = await prisma.role.findFirst({
      where: { name: userData.role, tenantId: tenant.id }
    });

    if (role) {
      await prisma.userRole.upsert({
        where: {
          id: `${user.id}-${role.id}`
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
          tenantId: tenant.id
        }
      });
    }
  }

  console.log('✅ Created default users');

  // Create ERP Modules
  const erpModules = [
    { name: 'CRM', description: 'Customer Relationship Management', category: 'SALES', isActive: true },
    { name: 'ERP', description: 'Enterprise Resource Planning', category: 'OPERATIONS', isActive: true },
    { name: 'CSM', description: 'Customer Success Management', category: 'CUSTOMER_SERVICE', isActive: true },
    { name: 'Banking', description: 'Banking and Financial Services', category: 'FINANCE', isActive: true },
    { name: 'SIAT', description: 'Integrated Tax Administration System', category: 'COMPLIANCE', isActive: true },
    { name: 'Analytics', description: 'Business Intelligence and Analytics', category: 'ANALYTICS', isActive: true },
    { name: 'Projects', description: 'Project Management', category: 'OPERATIONS', isActive: true },
    { name: 'Documents', description: 'Document Management System', category: 'OPERATIONS', isActive: true },
    { name: 'HR', description: 'Human Resources Management', category: 'HR', isActive: true },
    { name: 'Accounting', description: 'Advanced Accounting System', category: 'FINANCE', isActive: true },
    { name: 'Quality', description: 'Quality Management System', category: 'OPERATIONS', isActive: true },
    { name: 'Supply', description: 'Supply Chain Management', category: 'OPERATIONS', isActive: true },
    { name: 'Assets', description: 'Asset Management', category: 'OPERATIONS', isActive: true },
    { name: 'Risk', description: 'Risk Management', category: 'COMPLIANCE', isActive: true },
    { name: 'Compliance', description: 'Compliance Management', category: 'COMPLIANCE', isActive: true },
    { name: 'AI', description: 'Artificial Intelligence Platform', category: 'TECHNOLOGY', isActive: true },
    { name: 'Chat', description: 'Enterprise Communication', category: 'COMMUNICATION', isActive: true },
    { name: 'Reports', description: 'Advanced Reporting Engine', category: 'ANALYTICS', isActive: true },
    { name: 'Integration', description: 'Integration Hub', category: 'TECHNOLOGY', isActive: true },
    { name: 'Monitoring', description: 'System Monitoring and Alerts', category: 'TECHNOLOGY', isActive: true }
  ];

  for (const moduleData of erpModules) {
    await prisma.eRPModule.upsert({
      where: {
        id: `${tenant.id}-${moduleData.name}`
      },
      update: {},
      create: {
        id: `${tenant.id}-${moduleData.name}`,
        ...moduleData,
        tenantId: tenant.id,
        configuration: {
          features: ['basic', 'advanced'],
          permissions: ['read', 'write', 'admin']
        }
      }
    });
  }

  console.log('✅ Created ERP modules');

  // Create sample CRM data
  const crmContact = await prisma.cRMContact.upsert({
    where: {
      email: 'john.doe@example.com'
    },
    update: {},
    create: {
      tenantId: tenant.id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0123',
      company: 'Example Corp',
      position: 'CEO',
      leadScore: 85,
      lifecycle: 'PROSPECT',
      source: 'Website',
      tags: ['enterprise', 'high-value'],
      customFields: {
        industry: 'Technology',
        employees: '500-1000',
        revenue: '$50M-$100M'
      }
    }
  });

  console.log('✅ Created sample CRM data');

  // Create sample project
  await prisma.project.upsert({
    where: {
      id: 'project-cube-core-impl'
    },
    update: {},
    create: {
      id: 'project-cube-core-impl',
      tenantId: tenant.id,
      name: 'CUBE CORE Implementation',
      description: 'Complete implementation of CUBE CORE enterprise platform',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      budget: 500000,
      currency: 'USD',
      clientId: crmContact.id,
      tags: ['enterprise', 'implementation'],
      customFields: {
        methodology: 'Agile',
        team_size: 12,
        complexity: 'High'
      }
    }
  });

  console.log('✅ Created sample project');

  // Create Chart of Accounts
  const accounts = [
    { code: '1000', name: 'Assets', type: 'ASSET', category: 'CURRENT_ASSETS' },
    { code: '1100', name: 'Cash and Cash Equivalents', type: 'ASSET', category: 'CURRENT_ASSETS' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', category: 'CURRENT_ASSETS' },
    { code: '1300', name: 'Inventory', type: 'ASSET', category: 'CURRENT_ASSETS' },
    { code: '2000', name: 'Liabilities', type: 'LIABILITY', category: 'CURRENT_LIABILITIES' },
    { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', category: 'CURRENT_LIABILITIES' },
    { code: '3000', name: 'Equity', type: 'EQUITY', category: 'OWNERS_EQUITY' },
    { code: '4000', name: 'Revenue', type: 'REVENUE', category: 'OPERATING_REVENUE' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', category: 'COST_OF_SALES' },
    { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', category: 'OPERATING_EXPENSES' }
  ];

  for (const accountData of accounts) {
    await prisma.chartOfAccounts.upsert({
      where: {
        tenantId_accountCode: {
          tenantId: tenant.id,
          accountCode: accountData.code
        }
      },
      update: {},
      create: {
        ...accountData,
        tenantId: tenant.id,
        accountCode: accountData.code,
        isActive: true
      }
    });
  }

  console.log('✅ Created Chart of Accounts');

  // Create sample inventory items
  const inventoryItems = [
    {
      sku: 'LAPTOP-001',
      name: 'Business Laptop',
      description: 'High-performance business laptop',
      category: 'Electronics',
      brand: 'TechCorp',
      currentStock: 50,
      minimumStock: 10,
      reorderPoint: 15,
      reorderQuantity: 25,
      unitCost: 800,
      unitPrice: 1200
    },
    {
      sku: 'DESK-001',
      name: 'Office Desk',
      description: 'Ergonomic office desk',
      category: 'Furniture',
      brand: 'OfficePro',
      currentStock: 25,
      minimumStock: 5,
      reorderPoint: 8,
      reorderQuantity: 15,
      unitCost: 300,
      unitPrice: 450
    }
  ];

  for (const itemData of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: itemData.sku },
      update: {},
      create: {
        ...itemData,
        tenantId: tenant.id,
        tags: ['office', 'equipment']
      }
    });
  }

  console.log('✅ Created sample inventory items');

  // Create AI Models
  const aiModels = [
    {
      name: 'Customer Churn Prediction',
      description: 'Predicts customer churn probability',
      type: 'CLASSIFICATION',
      algorithm: 'RANDOM_FOREST',
      status: 'TRAINED',
      accuracy: 0.92,
      version: '1.0.0'
    },
    {
      name: 'Sales Forecasting',
      description: 'Forecasts sales for next quarter',
      type: 'REGRESSION',
      algorithm: 'NEURAL_NETWORK',
      status: 'TRAINED',
      accuracy: 0.87,
      version: '1.0.0'
    }
  ];

  for (const modelData of aiModels) {
    await prisma.aIModel.upsert({
      where: {
        id: `ai-model-${modelData.name.toLowerCase().replace(/\s+/g, '-')}`
      },
      update: {},
      create: {
        id: `ai-model-${modelData.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...modelData,
        tenantId: tenant.id,
        configuration: {
          features: ['feature1', 'feature2'],
          hyperparameters: { learning_rate: 0.01, epochs: 100 }
        }
      }
    });
  }

  console.log('✅ Created AI models');

  // Create system metrics and alert rules
  const alertRules = [
    {
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds 80%',
      metricName: 'cpu_usage_percent',
      condition: 'GREATER_THAN',
      threshold: 80,
      severity: 'HIGH'
    },
    {
      name: 'Low Disk Space',
      description: 'Alert when disk space is below 10%',
      metricName: 'disk_free_percent',
      condition: 'LESS_THAN',
      threshold: 10,
      severity: 'CRITICAL'
    },
    {
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds 5%',
      metricName: 'error_rate_percent',
      condition: 'GREATER_THAN',
      threshold: 5,
      severity: 'MEDIUM'
    }
  ];

  for (const ruleData of alertRules) {
    await prisma.alertRule.upsert({
      where: {
        id: `alert-rule-${ruleData.name.toLowerCase().replace(/\s+/g, '-')}`
      },
      update: {},
      create: {
        id: `alert-rule-${ruleData.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...ruleData,
        tenantId: tenant.id,
        notificationChannels: {
          email: ['admin@cubecore.com'],
          slack: ['#alerts'],
          webhook: []
        }
      }
    });
  }

  console.log('✅ Created alert rules');

  // Create i18n language entries
  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' }
  ];

  // Base translations for common UI elements
  const baseTranslations = {
    'dashboard.title': {
      es: 'Panel de Control',
      en: 'Dashboard',
      'pt-BR': 'Painel de Controle',
      fr: 'Tableau de Bord',
      de: 'Dashboard',
      it: 'Cruscotto'
    },
    'navigation.home': {
      es: 'Inicio',
      en: 'Home',
      'pt-BR': 'Início',
      fr: 'Accueil',
      de: 'Startseite',
      it: 'Home'
    },
    'navigation.analytics': {
      es: 'Análisis',
      en: 'Analytics',
      'pt-BR': 'Análises',
      fr: 'Analyses',
      de: 'Analytik',
      it: 'Analisi'
    },
    'navigation.projects': {
      es: 'Proyectos',
      en: 'Projects',
      'pt-BR': 'Projetos',
      fr: 'Projets',
      de: 'Projekte',
      it: 'Progetti'
    },
    'navigation.crm': {
      es: 'CRM',
      en: 'CRM',
      'pt-BR': 'CRM',
      fr: 'CRM',
      de: 'CRM',
      it: 'CRM'
    },
    'navigation.documents': {
      es: 'Documentos',
      en: 'Documents',
      'pt-BR': 'Documentos',
      fr: 'Documents',
      de: 'Dokumente',
      it: 'Documenti'
    },
    'common.save': {
      es: 'Guardar',
      en: 'Save',
      'pt-BR': 'Salvar',
      fr: 'Enregistrer',
      de: 'Speichern',
      it: 'Salva'
    },
    'common.cancel': {
      es: 'Cancelar',
      en: 'Cancel',
      'pt-BR': 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      it: 'Annulla'
    },
    'common.delete': {
      es: 'Eliminar',
      en: 'Delete',
      'pt-BR': 'Excluir',
      fr: 'Supprimer',
      de: 'Löschen',
      it: 'Elimina'
    },
    'common.edit': {
      es: 'Editar',
      en: 'Edit',
      'pt-BR': 'Editar',
      fr: 'Modifier',
      de: 'Bearbeiten',
      it: 'Modifica'
    },
    'common.create': {
      es: 'Crear',
      en: 'Create',
      'pt-BR': 'Criar',
      fr: 'Créer',
      de: 'Erstellen',
      it: 'Crea'
    }
  };

  // Insert language entries
  for (const key in baseTranslations) {
    for (const lang of languages) {
      const translations = baseTranslations[key as keyof typeof baseTranslations];
      const value = translations[lang.code as keyof typeof translations];
      if (value) {
        await prisma.$executeRaw`
          INSERT INTO languages (lang_code, lang_key, lang_value) 
          VALUES (${lang.code}, ${key}, ${value})
          ON CONFLICT (lang_code, lang_key) 
          DO UPDATE SET lang_value = EXCLUDED.lang_value
        `;
      }
    }
  }

  console.log('✅ Created i18n translations');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('- 1 Enterprise tenant created');
  console.log('- 10 System roles created');
  console.log('- 3 Default users created');
  console.log('- 20 ERP modules created');
  console.log('- Sample CRM, Project, and Inventory data created');
  console.log('- Chart of Accounts initialized');
  console.log('- AI models configured');
  console.log('- Alert rules established');
  console.log('- Multi-language support (6 languages) initialized');
  console.log('\n🔐 Default Login Credentials:');
  console.log('- Super Admin: admin@cubecore.com / admin123');
  console.log('- Manager: manager@cubecore.com / admin123');
  console.log('- User: user@cubecore.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
