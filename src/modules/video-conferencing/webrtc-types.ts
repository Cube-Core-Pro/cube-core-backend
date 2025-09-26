// Fortune 500 WebRTC Type Definitions for Server-Side Usage
// These types provide server-side compatibility for WebRTC interfaces

export type RTCPeerConnectionState = 
  | 'closed'
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'failed'
  | 'new';

export type RTCIceConnectionState = 
  | 'checking'
  | 'closed'
  | 'completed'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'new';

export interface RTCPeerConnection {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  localDescription: RTCSessionDescription | null;
  remoteDescription: RTCSessionDescription | null;
  signalingState: RTCSignalingState;
  close(): void;
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void>;
  getStats(): Promise<RTCStatsReport>;
}

export interface MediaStream {
  id: string;
  active: boolean;
  getTracks(): MediaStreamTrack[];
  getAudioTracks(): MediaStreamTrack[];
  getVideoTracks(): MediaStreamTrack[];
  addTrack(track: MediaStreamTrack): void;
  removeTrack(track: MediaStreamTrack): void;
  clone(): MediaStream;
}

export interface MediaStreamTrack {
  id: string;
  kind: string;
  label: string;
  enabled: boolean;
  muted: boolean;
  readyState: MediaStreamTrackState;
  stop(): void;
  clone(): MediaStreamTrack;
}

export type MediaStreamTrackState = 'live' | 'ended';

export type RTCSignalingState = 
  | 'closed'
  | 'have-local-offer'
  | 'have-local-pranswer'
  | 'have-remote-offer'
  | 'have-remote-pranswer'
  | 'stable';

export interface RTCSessionDescription {
  type: RTCSdpType;
  sdp: string;
}

export interface RTCSessionDescriptionInit {
  type?: RTCSdpType;
  sdp?: string;
}

export type RTCSdpType = 'answer' | 'offer' | 'pranswer' | 'rollback';

export interface RTCOfferOptions {
  iceRestart?: boolean;
  offerToReceiveAudio?: boolean;
  offerToReceiveVideo?: boolean;
}

export interface RTCAnswerOptions {
  // Currently no standard options for answers
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

export interface RTCStatsReport extends Map<string, RTCStats> {
  // Extends Map with WebRTC stats functionality
}

export interface RTCStats {
  id: string;
  timestamp: number;
  type: RTCStatsType;
}

export type RTCStatsType = 
  | 'candidate-pair'
  | 'certificate'
  | 'codec'
  | 'csrc'
  | 'data-channel'
  | 'ice-server'
  | 'inbound-rtp'
  | 'local-candidate'
  | 'media-source'
  | 'outbound-rtp'
  | 'peer-connection'
  | 'receiver'
  | 'remote-candidate'
  | 'remote-inbound-rtp'
  | 'remote-outbound-rtp'
  | 'sender'
  | 'stream'
  | 'track'
  | 'transport';