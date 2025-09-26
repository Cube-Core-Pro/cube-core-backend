// path: backend/src/modules/video/video.module.ts
// purpose: Enterprise Video Conferencing module with AI intelligence, advanced transcription, and security
// dependencies: NestJS, Prisma, WebRTC, Socket.IO, AI Services, Security Services

import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { AiMeetingIntelligenceService } from './services/ai-meeting-intelligence.service';
import { AdvancedTranscriptionService } from './services/advanced-transcription.service';
import { EnterpriseVideoSecurityService } from './services/enterprise-video-security.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue(
      { name: 'video-processing' },
      { name: 'meeting-analysis' },
      { name: 'transcription-processing' },
      { name: 'video-security' },
      { name: 'meeting-intelligence' },
      { name: 'real-time-monitoring' },
    ),
  ],
  controllers: [VideoController],
  providers: [
    VideoService,
    AiMeetingIntelligenceService,
    AdvancedTranscriptionService,
    EnterpriseVideoSecurityService,
  ],
  exports: [
    VideoService,
    AiMeetingIntelligenceService,
    AdvancedTranscriptionService,
    EnterpriseVideoSecurityService,
  ],
})
export class VideoModule {}