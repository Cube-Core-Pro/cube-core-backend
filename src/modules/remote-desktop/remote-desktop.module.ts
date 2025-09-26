// path: backend/src/modules/remote-desktop/remote-desktop.module.ts
// purpose: Remote Desktop/VDI Module with RDP/VPN, multi-monitor support, and session management
// dependencies: @nestjs/common, prisma, redis, websockets, rdp-client

import { Module } from '@nestjs/common';
// TODO: Implement remote desktop services and controllers
// import { RemoteDesktopService } from './remote-desktop.service';
// import { RemoteDesktopController } from './remote-desktop.controller';
// import { RemoteDesktopGateway } from './remote-desktop.gateway';
// import { VdiInstanceService } from './services/vdi-instance.service';
// import { SessionPermissionService } from './services/session-permission.service';
// import { SessionRecordingService } from './services/session-recording.service';
// import { SessionMetricService } from './services/session-metric.service';
// import { SessionTemplateService } from './services/session-template.service';
import { PrismaModule } from '../../prisma/prisma.module';
// TODO: Implement RedisModule
// import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    // TODO: Add RedisModule when implemented
  ],
  controllers: [
    // TODO: Add RemoteDesktopController when implemented
  ],
  providers: [
    // TODO: Add remote desktop services when implemented
  ],
  exports: [
    // TODO: Export services when implemented
  ],
})
export class RemoteDesktopModule {}