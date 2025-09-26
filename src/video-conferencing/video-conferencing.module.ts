// path: backend/src/video-conferencing/video-conferencing.module.ts
// purpose: Module for Video Conferencing functionality
// dependencies: @nestjs/common, prisma, auth

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';

@Module({
  imports: [PrismaModule],
  controllers: [MeetingController],
  providers: [MeetingService],
  exports: [MeetingService]
})
export class VideoConferencingModule {}