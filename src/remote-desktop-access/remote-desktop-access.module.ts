// path: backend/src/remote-desktop-access/remote-desktop-access.module.ts
// purpose: Module for Remote Desktop Access functionality
// dependencies: @nestjs/common, prisma, auth

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionController } from './controllers/session.controller';
import { SessionService } from './services/session.service';

@Module({
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService]
})
export class RemoteDesktopAccessModule {}