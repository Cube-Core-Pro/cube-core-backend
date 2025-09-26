// path: backend/prisma/seeds/simple-enterprise.seed.ts
// purpose: Simple seed data for enterprise collaboration modules
// dependencies: prisma

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSimpleEnterpriseModules() {
  console.log('🌱 Seeding simple enterprise collaboration modules...');

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

    console.log(`📄 Using tenant: ${tenant.name} and user: ${user.name}`);

    // Simple seed for Video Meetings
    console.log('🎥 Seeding video meetings...');
    const existingMeeting = await prisma.videoMeeting.findFirst({
      where: { meetingId: 'MTG-001-2024' }
    });

    if (!existingMeeting) {
      await prisma.videoMeeting.create({
        data: {
          title: 'Weekly Team Standup',
          description: 'Weekly team sync and updates',
          meetingId: 'MTG-001-2024',
          password: 'team123',
          startTime: new Date('2024-01-16T10:00:00'),
          duration: 30,
          status: 'SCHEDULED',
          type: 'RECURRING',
          joinUrl: 'https://video.cubecore.ai/join/MTG-001-2024',
          hostUrl: 'https://video.cubecore.ai/host/MTG-001-2024',
          participants: [],
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
          tenant: { connect: { id: tenant.id } },
          host: { connect: { id: user.id } }
        }
      });
      console.log('✅ Video meeting created');
    }

    // Simple seed for Remote Sessions
    console.log('🖥️ Seeding remote desktop sessions...');
    const existingSession = await prisma.remoteSession.findFirst({
      where: { sessionId: 'VDI-DEV-001' }
    });

    if (!existingSession) {
      await prisma.remoteSession.create({
        data: {
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
          tenant: { connect: { id: tenant.id } },
          user: { connect: { id: user.id } }
        }
      });
      console.log('✅ Remote session created');
    }

    console.log('✅ Simple enterprise collaboration modules seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding simple enterprise modules:', error);
    throw error;
  }
}

if (require.main === module) {
  seedSimpleEnterpriseModules()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}