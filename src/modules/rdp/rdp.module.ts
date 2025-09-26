// path: backend/src/modules/rdp/rdp.module.ts
// purpose: Remote Desktop Access module for VDI, RDP, VNC, and SSH connections
// dependencies: NestJS, Prisma, WebSocket, Docker, VNC/RDP libraries

import { Module } from '@nestjs/common';
import { RdpController } from './rdp.controller';
import { RdpService } from './rdp.service';
import { SessionService } from './services/session.service';
// TODO: Implement remaining services
// import { VdiService } from './services/vdi.service';
// import { ConnectionService } from './services/connection.service';
// import { SecurityService } from './services/security.service';
// import { MonitoringService } from './services/monitoring.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'rdp-processing',
    }),
    BullModule.registerQueue({
      name: 'vdi-provisioning',
    }),
  ],
  controllers: [RdpController],
  providers: [
    RdpService,
    SessionService,
    // TODO: Add remaining services when implemented
  ],
  exports: [
    RdpService,
    SessionService,
    // TODO: Export remaining services when implemented
  ],
})
export class RdpModule {}