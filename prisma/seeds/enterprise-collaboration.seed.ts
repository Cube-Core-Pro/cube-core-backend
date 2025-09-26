// path: backend/prisma/seeds/enterprise-collaboration.seed.ts
// purpose: Seed data for enterprise collaboration modules (Office, Video, WebMail, RDP)
// dependencies: Prisma, existing tenant and user data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding enterprise collaboration modules...');

  // Get the first tenant and system admin user
  const tenant = await prisma.tenant.findFirst({
    where: { name: 'CUBE CORE Enterprise' },
  });

  if (!tenant) {
    console.log('❌ No tenant found. Please run basic seeds first.');
    return;
  }

  const systemAdmin = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      role: 'SYSTEM_ADMIN',
    },
  });

  if (!systemAdmin) {
    console.log('❌ No system admin found. Please run basic seeds first.');
    return;
  }

  console.log(`📄 Using tenant: ${tenant.name} and user: ${systemAdmin.name}`);

  // 1. Office Suite - Create folders and documents
  console.log('📁 Seeding Office Suite...');

  // Create root folders
  const documentsFolder = await prisma.officeFolder.upsert({
    where: { id: 'office-documents-root' },
    update: {},
    create: {
      id: 'office-documents-root',
      name: 'Documents',
      description: 'Root folder for all documents',
      path: '/Documents',
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  const templatesFolder = await prisma.officeFolder.upsert({
    where: { id: 'office-templates-root' },
    update: {},
    create: {
      id: 'office-templates-root',
      name: 'Templates',
      description: 'Document templates',
      path: '/Templates',
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  // Create sample documents
  const sampleDocument = await prisma.officeDocument.upsert({
    where: { id: 'sample-document-1' },
    update: {},
    create: {
      id: 'sample-document-1',
      title: 'Company Handbook',
      description: 'Employee handbook and policies',
      type: 'DOCUMENT',
      format: 'DOCX',
      content: {
        title: 'Company Handbook',
        sections: [
          {
            id: 'intro',
            type: 'paragraph',
            content: 'Welcome to CUBE CORE Enterprise. This handbook contains important information about our company policies and procedures.',
          },
          {
            id: 'policies',
            type: 'heading',
            content: 'Company Policies',
          },
        ],
        metadata: {
          wordCount: 25,
          characterCount: 150,
          pageCount: 1,
        },
      },
      folderId: documentsFolder.id,
      tags: ['handbook', 'policies', 'hr'],
      isPublic: true,
      allowCollaboration: true,
      version: 1,
      size: 1024,
      checksum: 'abc123def456',
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  const sampleSpreadsheet = await prisma.officeDocument.upsert({
    where: { id: 'sample-spreadsheet-1' },
    update: {},
    create: {
      id: 'sample-spreadsheet-1',
      title: 'Q1 Budget Analysis',
      description: 'First quarter budget analysis and projections',
      type: 'SPREADSHEET',
      format: 'XLSX',
      content: {
        sheets: [
          {
            id: 'sheet1',
            name: 'Budget',
            rows: 100,
            columns: 26,
            cells: {
              '1,1': { value: 'Item', format: { bold: true } },
              '1,2': { value: 'Budget', format: { bold: true } },
              '1,3': { value: 'Actual', format: { bold: true } },
              '2,1': { value: 'Revenue' },
              '2,2': { value: 100000 },
              '2,3': { value: 95000 },
            },
          },
        ],
        activeSheetId: 'sheet1',
      },
      folderId: documentsFolder.id,
      tags: ['budget', 'finance', 'q1'],
      isPublic: false,
      allowCollaboration: true,
      version: 1,
      size: 2048,
      checksum: 'def456ghi789',
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  // Create document template
  const documentTemplate = await prisma.officeDocument.upsert({
    where: { id: 'template-meeting-notes' },
    update: {},
    create: {
      id: 'template-meeting-notes',
      title: 'Meeting Notes Template',
      description: 'Standard template for meeting notes',
      type: 'TEMPLATE',
      format: 'DOCX',
      content: {
        title: 'Meeting Notes - {{meeting_title}}',
        sections: [
          {
            id: 'header',
            type: 'heading',
            content: 'Meeting: {{meeting_title}}',
          },
          {
            id: 'date',
            type: 'paragraph',
            content: 'Date: {{meeting_date}}',
          },
          {
            id: 'attendees',
            type: 'paragraph',
            content: 'Attendees: {{attendees}}',
          },
          {
            id: 'agenda',
            type: 'heading',
            content: 'Agenda',
          },
          {
            id: 'notes',
            type: 'heading',
            content: 'Notes',
          },
          {
            id: 'action-items',
            type: 'heading',
            content: 'Action Items',
          },
        ],
      },
      folderId: templatesFolder.id,
      tags: ['template', 'meeting', 'notes'],
      isPublic: true,
      allowCollaboration: false,
      version: 1,
      size: 512,
      checksum: 'template123',
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  console.log('✅ Office Suite seeded successfully');

  // 2. Video Conferencing - Create sample meetings
  console.log('🎥 Seeding Video Conferencing...');

  const sampleMeeting = await prisma.videoMeeting.upsert({
    where: { id: 'meeting-weekly-standup' },
    update: {},
    create: {
      id: 'meeting-weekly-standup',
      title: 'Weekly Team Standup',
      description: 'Weekly team standup meeting to discuss progress and blockers',
      type: 'RECURRING',
      status: 'SCHEDULED',
      meetingId: 'standup-' + Date.now(),
      password: 'standup123',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30,
      timezone: 'UTC',
      joinUrl: 'https://meet.cubecore.com/standup-' + Date.now(),
      hostUrl: 'https://meet.cubecore.com/host/standup-' + Date.now(),
      participants: [systemAdmin.id],
      recurrence: {
        frequency: 'WEEKLY',
        interval: 1,
        daysOfWeek: ['MONDAY'],
      },
      settings: {
        waitingRoom: true,
        recordingEnabled: true,
        chatEnabled: true,
        screenSharingEnabled: true,
        allowUnmute: true,
        allowVideo: true,
        maxParticipants: 50,
      },
      tags: ['standup', 'weekly', 'team'],
      agenda: '1. What did you work on last week?\n2. What are you working on this week?\n3. Any blockers?',
      tenantId: tenant.id,
      hostId: systemAdmin.id,
    },
  });

  const sampleWebinar = await prisma.videoMeeting.upsert({
    where: { id: 'webinar-product-demo' },
    update: {},
    create: {
      id: 'webinar-product-demo',
      title: 'CUBE CORE Product Demo',
      description: 'Live demonstration of CUBE CORE enterprise features',
      type: 'WEBINAR',
      status: 'SCHEDULED',
      meetingId: 'demo-' + Date.now(),
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      duration: 60,
      timezone: 'UTC',
      joinUrl: 'https://meet.cubecore.com/demo-' + Date.now(),
      hostUrl: 'https://meet.cubecore.com/host/demo-' + Date.now(),
      participants: [],
      settings: {
        waitingRoom: true,
        recordingEnabled: true,
        chatEnabled: true,
        screenSharingEnabled: true,
        allowUnmute: false,
        allowVideo: false,
        maxParticipants: 500,
        isPublic: true,
      },
      tags: ['webinar', 'demo', 'product'],
      agenda: '1. Introduction to CUBE CORE\n2. Core Features Demo\n3. Enterprise Modules\n4. Q&A Session',
      tenantId: tenant.id,
      hostId: systemAdmin.id,
    },
  });

  console.log('✅ Video Conferencing seeded successfully');

  // 3. WebMail - Create sample emails and folders
  console.log('📧 Seeding Enterprise WebMail...');

  // Create email folders
  const inboxFolder = await prisma.emailFolder.upsert({
    where: { id: 'inbox-folder' },
    update: {},
    create: {
      id: 'inbox-folder',
      name: 'Inbox',
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  const sentFolder = await prisma.emailFolder.upsert({
    where: { id: 'sent-folder' },
    update: {},
    create: {
      id: 'sent-folder',
      name: 'Sent',
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  const projectsFolder = await prisma.emailFolder.upsert({
    where: { id: 'projects-folder' },
    update: {},
    create: {
      id: 'projects-folder',
      name: 'Projects',
      parentId: inboxFolder.id,
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  // Create email templates
  const welcomeTemplate = await prisma.emailTemplate.upsert({
    where: { id: 'template-welcome' },
    update: {},
    create: {
      id: 'template-welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}!',
      body: `
        <h1>Welcome to {{company_name}}!</h1>
        <p>Dear {{user_name}},</p>
        <p>We're excited to have you join our team. Here are some important details to get you started:</p>
        <ul>
          <li>Your login credentials have been sent separately</li>
          <li>Please review the employee handbook</li>
          <li>Your first day orientation is scheduled for {{start_date}}</li>
        </ul>
        <p>If you have any questions, please don't hesitate to reach out.</p>
        <p>Best regards,<br>{{sender_name}}</p>
      `,
      htmlBody: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Welcome to {{company_name}}!</h1>
            <p>Dear {{user_name}},</p>
            <p>We're excited to have you join our team. Here are some important details to get you started:</p>
            <ul>
              <li>Your login credentials have been sent separately</li>
              <li>Please review the employee handbook</li>
              <li>Your first day orientation is scheduled for {{start_date}}</li>
            </ul>
            <p>If you have any questions, please don't hesitate to reach out.</p>
            <p>Best regards,<br>{{sender_name}}</p>
          </body>
        </html>
      `,
      variables: [
        { name: 'company_name', type: 'TEXT', required: true },
        { name: 'user_name', type: 'TEXT', required: true },
        { name: 'start_date', type: 'DATE', required: true },
        { name: 'sender_name', type: 'TEXT', required: true },
      ],
      category: 'HR',
      isSystem: true,
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  // Create sample emails
  const sampleEmail = await prisma.enterpriseEmail.upsert({
    where: { id: 'email-welcome-sample' },
    update: {},
    create: {
      id: 'email-welcome-sample',
      messageId: 'welcome-' + Date.now() + '@cubecore.com',
      subject: 'Welcome to CUBE CORE Enterprise!',
      body: 'Welcome to our enterprise platform. We\'re excited to have you on board!',
      htmlBody: '<h1>Welcome to CUBE CORE Enterprise!</h1><p>Welcome to our enterprise platform. We\'re excited to have you on board!</p>',
      from: 'admin@cubecore.com',
      to: [systemAdmin.email],
      cc: [],
      bcc: [],
      priority: 'NORMAL',
      type: 'RECEIVED',
      attachments: [],
      tags: ['welcome', 'onboarding'],
      folderId: inboxFolder.id,
      isRead: false,
      isStarred: true,
      sentAt: new Date(),
      templateId: welcomeTemplate.id,
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  console.log('✅ Enterprise WebMail seeded successfully');

  // 4. Remote Desktop Access - Create sample sessions
  console.log('🖥️ Seeding Remote Desktop Access...');

  const developmentSession = await prisma.remoteSession.upsert({
    where: { id: 'session-dev-environment' },
    update: {},
    create: {
      id: 'session-dev-environment',
      name: 'Development Environment',
      description: 'Ubuntu development environment with full IDE setup',
      type: 'VDI',
      status: 'PENDING',
      sessionId: 'dev-' + Date.now(),
      operatingSystem: 'UBUNTU_22_04',
      instanceSize: 'LARGE',
      duration: 480, // 8 hours
      connectionUrl: 'https://rdp.cubecore.com/dev-' + Date.now(),
      vncPort: 5901,
      sshPort: 22,
      settings: {
        resolution: '1920x1080',
        colorDepth: 24,
        enableAudio: true,
        enableClipboard: true,
        enableFileTransfer: true,
        enablePrinting: false,
        enableRecording: true,
      },
      allowedUsers: [systemAdmin.id],
      tags: ['development', 'ubuntu', 'ide'],
      applications: ['vscode', 'git', 'docker', 'nodejs', 'python'],
      environmentVariables: {
        NODE_ENV: 'development',
        EDITOR: 'code',
      },
      securitySettings: {
        enableEncryption: true,
        encryptionLevel: 'HIGH',
        sessionTimeout: 480,
        idleTimeout: 60,
      },
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  const windowsSession = await prisma.remoteSession.upsert({
    where: { id: 'session-windows-office' },
    update: {},
    create: {
      id: 'session-windows-office',
      name: 'Windows Office Suite',
      description: 'Windows 11 with Microsoft Office suite',
      type: 'VDI',
      status: 'PENDING',
      sessionId: 'win-' + Date.now(),
      operatingSystem: 'WINDOWS_11',
      instanceSize: 'MEDIUM',
      duration: 240, // 4 hours
      connectionUrl: 'https://rdp.cubecore.com/win-' + Date.now(),
      rdpPort: 3389,
      settings: {
        resolution: '1920x1080',
        colorDepth: 32,
        enableAudio: true,
        enableClipboard: true,
        enableFileTransfer: true,
        enablePrinting: true,
        enableRecording: false,
      },
      allowedUsers: [systemAdmin.id],
      tags: ['windows', 'office', 'productivity'],
      applications: ['word', 'excel', 'powerpoint', 'outlook', 'teams'],
      environmentVariables: {},
      securitySettings: {
        enableEncryption: true,
        encryptionLevel: 'MEDIUM',
        sessionTimeout: 240,
        idleTimeout: 30,
      },
      tenantId: tenant.id,
      userId: systemAdmin.id,
    },
  });

  // Create session template
  const sessionTemplate = await prisma.sessionTemplate.upsert({
    where: { id: 'template-dev-environment' },
    update: {},
    create: {
      id: 'template-dev-environment',
      name: 'Standard Development Environment',
      description: 'Pre-configured development environment with common tools',
      type: 'VDI',
      configuration: {
        operatingSystem: 'UBUNTU_22_04',
        instanceSize: 'LARGE',
        applications: ['vscode', 'git', 'docker', 'nodejs', 'python', 'postgresql'],
        settings: {
          resolution: '1920x1080',
          enableAudio: true,
          enableClipboard: true,
          enableFileTransfer: true,
        },
      },
      category: 'Development',
      isShared: true,
      tags: ['development', 'template', 'ubuntu'],
      tenantId: tenant.id,
      createdBy: systemAdmin.id,
    },
  });

  console.log('✅ Remote Desktop Access seeded successfully');

  console.log('✅ Enterprise collaboration modules seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding enterprise collaboration modules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });