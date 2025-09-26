// path: backend/src/modules/video-conferencing/types.ts
// purpose: Type definitions for video conferencing module

import { RTCPeerConnection, MediaStream, RTCPeerConnectionState, RTCIceConnectionState } from './webrtc-types';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  tenantId: string;
  scheduledAt: Date;
  duration: number;
  isRecording: boolean;
  recordingUrl?: string;
  participants: MeetingParticipant[];
  breakoutRooms: BreakoutRoom[];
  settings: MeetingSettings;
  status: 'scheduled' | 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  meetingId: string;
  role: 'host' | 'moderator' | 'participant';
  joinedAt: Date;
  leftAt?: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  breakoutRoomId?: string;
}

export interface BreakoutRoom {
  id: string;
  meetingId: string;
  name: string;
  capacity: number;
  participants: MeetingParticipant[];
  isActive: boolean;
  createdAt: Date;
}

export interface MeetingSettings {
  allowParticipantVideo: boolean;
  allowParticipantAudio: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowRecording: boolean;
  allowBreakoutRooms: boolean;
  requirePassword: boolean;
  password?: string;
  waitingRoom: boolean;
  muteOnJoin: boolean;
  videoOnJoin: boolean;
  maxParticipants: number;
  recordingSettings: RecordingSettings;
  qualitySettings: QualitySettings;
}

export interface RecordingSettings {
  autoRecord: boolean;
  recordVideo: boolean;
  recordAudio: boolean;
  recordScreen: boolean;
  recordChat: boolean;
  storageLocation: string;
  retention: number; // days
}

export interface QualitySettings {
  videoResolution: '720p' | '1080p' | '4k';
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  adaptiveBitrate: boolean;
}

export interface MeetingStats {
  totalParticipants: number;
  activeParticipants: number;
  duration: number;
  recordingSize?: number;
  networkQuality: NetworkQuality;
}

export interface NetworkQuality {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  packetLoss: number;
  bandwidth: number;
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  userId: string;
  message: string;
  type: 'text' | 'file' | 'emoji' | 'poll';
  recipientId?: string; // for private messages
  timestamp: Date;
  metadata?: any;
}

export interface MeetingPoll {
  id: string;
  meetingId: string;
  question: string;
  options: string[];
  multipleChoice: boolean;
  anonymous: boolean;
  duration?: number; // seconds
  isActive: boolean;
  responses: PollResponse[];
  createdBy: string;
  createdAt: Date;
  endsAt?: Date;
}

export interface PollResponse {
  id: string;
  pollId: string;
  userId: string;
  selectedOptions: string[];
  timestamp: Date;
}

export interface ScreenShareSession {
  id: string;
  meetingId: string;
  userId: string;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
  quality: QualitySettings;
}

export interface MeetingRecording {
  id: string;
  meetingId: string;
  filename: string;
  duration: number;
  size: number;
  format: string;
  quality: string;
  url: string;
  thumbnailUrl?: string;
  startedAt: Date;
  endedAt: Date;
  status: 'processing' | 'ready' | 'failed';
}

export interface WebRTCConnection {
  id: string;
  userId: string;
  meetingId: string;
  peerConnection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  stats: ConnectionStats;
}

export interface ConnectionStats {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
  bandwidth: number;
  timestamp: Date;
}

export interface MeetingInvitation {
  id: string;
  meetingId: string;
  email: string;
  role: 'host' | 'moderator' | 'participant';
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
  respondedAt?: Date;
  joinUrl: string;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description?: string;
  settings: MeetingSettings;
  duration: number;
  isDefault: boolean;
  createdBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingAnalytics {
  meetingId: string;
  totalDuration: number;
  averageParticipants: number;
  peakParticipants: number;
  totalMessages: number;
  totalPolls: number;
  recordingDuration: number;
  networkQualityAverage: number;
  participantEngagement: ParticipantEngagement[];
  qualityMetrics: QualityMetrics[];
}

export interface ParticipantEngagement {
  userId: string;
  joinDuration: number;
  messagesSent: number;
  pollsAnswered: number;
  screenShareTime: number;
  audioTime: number;
  videoTime: number;
}

export interface QualityMetrics {
  timestamp: Date;
  participantCount: number;
  averageLatency: number;
  averagePacketLoss: number;
  averageBandwidth: number;
  videoQuality: number;
  audioQuality: number;
}

// Extended interfaces para Enterprise Features
import { VideoMeeting } from '@prisma/client';

export interface EnterpriseVideoMeeting extends VideoMeeting {
  aiConfig?: {
    transcriptionEnabled: boolean;
    translationEnabled: boolean;
    aiAssistantEnabled: boolean;
    sentimentAnalysisEnabled: boolean;
  };
  securityConfig?: {
    endToEndEncryption: boolean;
    audienceRestricted: boolean;
    geofencing: boolean;
    complianceRecording: boolean;
  };
  infraConfig?: {
    globalLoadBalancing: boolean;
    cdnDistribution: boolean;
    edgeOptimization: boolean;
    bandwidthOptimization: boolean;
  };
  boardFeatures?: {
    executiveOnlyMode: boolean;
    complianceRecording: boolean;
    secureFilesharing: boolean;
    executiveSupport: boolean;
  };
}

export interface VideoMeetingParticipant {
  id: string;
  userId: string;
  meetingId: string;
  displayName: string;
  role: 'host' | 'moderator' | 'participant';
  joinedAt: Date;
  leftAt?: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  breakoutRoomId?: string;
}

export interface ExtendedMeetingSettings extends MeetingSettings {
  executiveFeatures?: {
    executiveRecording: boolean;
    complianceMode: boolean;
    restrictedAccess: boolean;
  };
}