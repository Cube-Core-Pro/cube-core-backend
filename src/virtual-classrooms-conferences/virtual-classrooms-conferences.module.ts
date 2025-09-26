import { Module } from '@nestjs/common';
import { VirtualClassroomsConferencesController } from './virtual-classrooms-conferences.controller';
import { VirtualClassroomsConferencesService } from './virtual-classrooms-conferences.service';
import { WebrtcService } from './services/webrtc.service';
import { ScreenSharingService } from './services/screen-sharing.service';
import { RecordingService } from './services/recording.service';
import { LiveStreamingService } from './services/live-streaming.service';
import { WhiteboardService } from './services/whiteboard.service';
import { InteractiveToolsService } from './services/interactive-tools.service';
import { BreakoutRoomsService } from './services/breakout-rooms.service';
import { AiModerationService } from './services/ai-moderation.service';
import { MediaProcessingService } from './services/media-processing.service';

@Module({
  controllers: [VirtualClassroomsConferencesController],
  providers: [
    VirtualClassroomsConferencesService,
    WebrtcService,
    ScreenSharingService,
    RecordingService,
    LiveStreamingService,
    WhiteboardService,
    InteractiveToolsService,
    BreakoutRoomsService,
    AiModerationService,
    MediaProcessingService,
  ],
  exports: [
    VirtualClassroomsConferencesService,
    WebrtcService,
    ScreenSharingService,
    RecordingService,
    LiveStreamingService,
    WhiteboardService,
    InteractiveToolsService,
    BreakoutRoomsService,
    AiModerationService,
    MediaProcessingService,
  ],
})
export class VirtualClassroomsConferencesModule {}
