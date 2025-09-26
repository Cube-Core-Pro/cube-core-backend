// path: backend/prisma/seeds/enterprise-modules.seed.ts
// purpose: Seed data for enterprise collaboration modules
// dependencies: prisma, faker

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedEnterpriseModules() {
  console.log('🌱 Seeding enterprise collaboration modules...');

  try {
    // Get the first tenant for seeding
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('❌ No tenant found for seeding');
      return;
    }

    // Get the first user for seeding
    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id }
    });
    if (!user) {
      console.log('❌ No user found for seeding');
      return;
    }

    // Seed Office Documents
    console.log('📄 Seeding office documents...');
    const officeDocuments = [
      {
        name: 'Q4 Financial Report.docx',
        type: 'DOCUMENT',
        content: JSON.stringify({
          title: 'Q4 Financial Report',
          body: 'This is the quarterly financial report for Q4 2024...',
          format: 'docx'
        }),
        size: 2048000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        version: 1,
        isShared: true,
        tenantId: tenant.id,
        createdBy: user.id
      },
      {
        name: 'Sales Analysis.xlsx',
        type: 'SPREADSHEET',
        content: JSON.stringify({
          sheets: [
            {
              name: 'Sales Data',
              data: [
                ['Month', 'Revenue', 'Units Sold'],
                ['Jan', 50000, 120],
                ['Feb', 65000, 150],
                ['Mar', 72000, 180]
              ]
            }
          ]
        }),
        size: 1024000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        version: 1,
        isShared: false,
        tenantId: tenant.id,
        createdBy: user.id
      },
      {
        name: 'Product Presentation.pptx',
        type: 'PRESENTATION',
        content: JSON.stringify({
          slides: [
            {
              title: 'Product Overview',
              content: 'Introduction to our new product line...'
            },
            {
              title: 'Market Analysis',
              content: 'Current market trends and opportunities...'
            }
          ]
        }),
        size: 5120000,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        version: 1,
        isShared: true,
        tenantId: tenant.id,
        createdBy: user.id
      }
    ];

    for (const doc of officeDocuments) {
      const existing = await prisma.officeDocument.findFirst({
        where: { 
          name: doc.name, 
          tenantId: doc.tenantId 
        }
      });
      
      if (!existing) {
        await prisma.officeDocument.create({
          data: doc
        });
      }
    }

    // Seed Office Folders
    console.log('📁 Seeding office folders...');
    const officeFolders = [
      {
        name: 'Financial Reports',
        description: 'Quarterly and annual financial reports',
        tenantId: tenant.id,
        createdBy: user.id
      },
      {
        name: 'Marketing Materials',
        description: 'Presentations and marketing documents',
        tenantId: tenant.id,
        createdBy: user.id
      },
      {
        name: 'HR Documents',
        description: 'Human resources policies and forms',
        tenantId: tenant.id,
        createdBy: user.id
      }
    ];

    for (const folder of officeFolders) {
      const existing = await prisma.officeFolder.findFirst({
        where: { 
          name: folder.name, 
          tenantId: folder.tenantId 
        }
      });
      
      if (!existing) {
        await prisma.officeFolder.create({
          data: folder
        });
      }
    }

    // Seed Enterprise Emails
    console.log('📧 Seeding enterprise emails...');
    const enterpriseEmails = [
      {
        messageId: 'msg-001-2024',
        subject: 'Q4 Financial Report Review',
        fromAddress: 'john.doe@company.com',
        fromName: 'John Doe',
        toAddresses: ['finance@company.com'],
        ccAddresses: ['management@company.com'],
        body: 'Please review the attached Q4 financial report and provide your feedback by end of week.',
        htmlBody: '<p>Please review the attached Q4 financial report and provide your feedback by end of week.</p>',
        isRead: false,
        isStarred: true,
        isFlagged: false,
        hasAttachments: true,
        folder: 'INBOX',
        priority: 'HIGH',
        labels: ['Finance', 'Urgent'],
        tenantId: tenant.id,
        userId: user.id
      },
      {
        messageId: 'msg-002-2024',
        subject: 'Team Meeting Tomorrow',
        fromAddress: 'jane.smith@company.com',
        fromName: 'Jane Smith',
        toAddresses: ['team@company.com'],
        body: 'Reminder about our team meeting tomorrow at 2 PM in the conference room.',
        htmlBody: '<p>Reminder about our team meeting tomorrow at 2 PM in the conference room.</p>',
        isRead: true,
        isStarred: false,
        isFlagged: false,
        hasAttachments: false,
        folder: 'INBOX',
        priority: 'NORMAL',
        labels: ['Meeting'],
        tenantId: tenant.id,
        userId: user.id
      }
    ];

    for (const email of enterpriseEmails) {
      const existing = await prisma.enterpriseEmail.findFirst({
        where: { 
          messageId: email.messageId, 
          tenantId: email.tenantId 
        }
      });
      
      if (!existing) {
        await prisma.enterpriseEmail.create({
          data: email
        });
      }
    }

    // Seed Email Folders
    console.log('📂 Seeding email folders...');
    const emailFolders = [
      {
        name: 'Projects',
        type: 'CUSTOM',
        tenantId: tenant.id,
        userId: user.id
      },
      {
        name: 'Clients',
        type: 'CUSTOM',
        tenantId: tenant.id,
        userId: user.id
      },
      {
        name: 'Archive 2023',
        type: 'CUSTOM',
        tenantId: tenant.id,
        userId: user.id
      }
    ];

    for (const folder of emailFolders) {
      const existing = await prisma.emailFolder.findFirst({
        where: { 
          name: folder.name, 
          userId: folder.userId 
        }
      });
      
      if (!existing) {
        await prisma.emailFolder.create({
          data: folder
        });
      }
    }

    // Seed Video Meetings
    console.log('🎥 Seeding video meetings...');
    const videoMeetings = [
      {
        title: 'Weekly Team Standup',
        description: 'Weekly team sync and updates',
        meetingId: 'MTG-001-2024',
        password: 'team123',
        scheduledAt: new Date('2024-01-16T10:00:00'),
        duration: 30,
        status: 'SCHEDULED',
        type: 'RECURRING',
        maxParticipants: 50,
        isRecording: false,
        settings: {
          enableVideo: true,
          enableAudio: true,
          enableChat: true,
          enableScreenShare: true,
          enableBreakoutRooms: false,
          requirePassword: true,
          allowJoinBeforeHost: false,
          muteParticipantsOnEntry: true
        },
        tenantId: tenant.id,
        hostId: user.id
      },
      {
        title: 'Client Presentation',
        description: 'Q4 results presentation to client',
        meetingId: 'MTG-002-2024',
        scheduledAt: new Date('2024-01-16T14:00:00'),
        duration: 60,
        status: 'SCHEDULED',
        type: 'SCHEDULED',
        maxParticipants: 25,
        isRecording: true,
        settings: {
          enableVideo: true,
          enableAudio: true,
          enableChat: false,
          enableScreenShare: true,
          enableBreakoutRooms: false,
          requirePassword: false,
          allowJoinBeforeHost: false,
          muteParticipantsOnEntry: true
        },
        tenantId: tenant.id,
        hostId: user.id
      }
    ];

    for (const meeting of videoMeetings) {
      const existing = await prisma.videoMeeting.findFirst({
        where: { 
          meetingId: meeting.meetingId, 
          tenantId: meeting.tenantId 
        }
      });
      
      if (!existing) {
        await prisma.videoMeeting.create({
          data: meeting
        });
      }
    }

    // Seed Remote Sessions
    console.log('🖥️ Seeding remote desktop sessions...');
    const remoteSessions = [
      {
        name: 'Development Environment',
        description: 'Windows 11 development setup with Visual Studio',
        type: 'VDI',
        status: 'ACTIVE',
        sessionId: 'VDI-DEV-001',
        operatingSystem: 'WINDOWS_11',
        instanceSize: 'LARGE',
        duration: 480,
        connectionUrl: 'https://rdp.cubecore.ai/connect/vdi/VDI-DEV-001',
        settings: {
          enableClipboard: true,
          enableFileTransfer: true,
          enableAudio: false,
          enablePrinting: true,
          enableMultiMonitor: true,
          screenWidth: 1920,
          screenHeight: 1080,
          colorDepth: 32,
          recordSession: false,
          isPersistent: true
        },
        allowedUsers: [],
        tags: ['Development', 'Windows'],
        applications: ['Visual Studio', 'Git', 'Docker'],
        environmentVariables: {},
        securitySettings: {},
        startedAt: new Date('2024-01-15T09:00:00'),
        lastAccessedAt: new Date('2024-01-15T14:30:00'),
        tenantId: tenant.id,
        userId: user.id
      },
      {
        name: 'Ubuntu Testing Environment',
        description: 'Linux environment for testing and development',
        type: 'VNC',
        status: 'PENDING',
        sessionId: 'VNC-TEST-003',
        operatingSystem: 'UBUNTU_22_04',
        instanceSize: 'MEDIUM',
        duration: 360,
        connectionUrl: 'https://rdp.cubecore.ai/connect/vnc/VNC-TEST-003',
        vncPort: 5901,
        settings: {
          enableClipboard: true,
          enableFileTransfer: true,
          enableAudio: false,
          enablePrinting: false,
          enableMultiMonitor: false,
          screenWidth: 1600,
          screenHeight: 900,
          colorDepth: 24,
          recordSession: false,
          isPersistent: false
        },
        allowedUsers: [],
        tags: ['Testing', 'Linux'],
        applications: ['Node.js', 'Python', 'Docker'],
        environmentVariables: {},
        securitySettings: {},
        tenantId: tenant.id,
        userId: user.id
      }
    ];

    for (const session of remoteSessions) {
      const existing = await prisma.remoteSession.findFirst({
        where: { 
          sessionId: session.sessionId
        }
      });
      
      if (!existing) {
        await prisma.remoteSession.create({
          data: session
        });
      }
    }

    console.log('✅ Enterprise collaboration modules seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding enterprise modules:', error);
    throw error;
  }
}

if (require.main === module) {
  seedEnterpriseModules()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}