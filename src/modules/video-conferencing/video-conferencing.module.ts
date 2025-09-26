// path: backend/src/modules/video-conferencing/video-conferencing.module.ts
// purpose: Advanced Video Conferencing Module with HD quality, breakouts, polls, and recording
// dependencies: @nestjs/common, prisma, websockets, redis, webrtc

import { Module } from '@nestjs/common';
import { VideoConferencingService } from './video-conferencing.service';
import { VideoConferencingController } from './video-conferencing.controller';
import { VideoConferencingGateway } from './video-conferencing.gateway';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingPollService } from './services/meeting-poll.service';
import { MeetingQualityService } from './services/meeting-quality.service';
import { MeetingChatService } from './services/meeting-chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
// TODO: Implement RedisModule
// import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    // TODO: Add RedisModule when implemented
  ],
  controllers: [
    VideoConferencingController,
  ],
  providers: [
    VideoConferencingService,
    VideoConferencingGateway,
    MeetingParticipantService,
    MeetingPollService,
    MeetingQualityService,
    MeetingChatService,
  ],
  exports: [
    VideoConferencingService,
    MeetingParticipantService,
    MeetingPollService,
    MeetingQualityService,
    MeetingChatService,
  ],
})
export class VideoConferencingModule {}