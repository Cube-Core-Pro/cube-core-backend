// path: backend/src/modules/video-conferencing/services/index.ts
// purpose: Export all video conferencing services for easy imports
// dependencies: all video conferencing services

export { MeetingParticipantService } from './meeting-participant.service';
export { MeetingPollService } from './meeting-poll.service';
export { MeetingQualityService } from './meeting-quality.service';
export { MeetingChatService } from './meeting-chat.service';

export type {
  ParticipantPermissions,
  ParticipantStats,
} from './meeting-participant.service';

export type {
  PollOption,
  PollResult,
  PollResponse,
  CreatePollData,
} from './meeting-poll.service';

export type {
  QualityMetrics,
  AudioQualityMetrics,
  VideoQualityMetrics,
  NetworkQualityMetrics,
  OverallQualityScore,
  QualityReport,
  DeviceInfo,
  NetworkInfo,
  QualityTrend,
} from './meeting-quality.service';

export type {
  ChatMessage,
  ChatAttachment,
  ChatReaction,
  ChatSettings,
  PrivateMessage,
} from './meeting-chat.service';