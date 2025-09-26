import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type WebrtcRole = 'host' | 'presenter' | 'participant' | 'viewer';

export interface SessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface IceCandidate {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  usernameFragment?: string;
  createdAt: string;
}

export interface PeerConnectionState {
  peerId: string;
  role: WebrtcRole;
  description?: SessionDescription;
  pendingCandidates: IceCandidate[];
  lastActivityAt: string;
}

export interface WebrtcSessionSummary {
  sessionId: string;
  roomId: string;
  hostId: string;
  createdAt: string;
  expiresAt: string;
  peerCount: number;
  metadata: {
    tags: string[];
    isRecording: boolean;
    isScreenSharing: boolean;
  };
}

interface WebrtcSessionState extends WebrtcSessionSummary {
  peers: Map<string, PeerConnectionState>;
}

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 45; // 45 minutes
const PEER_INACTIVITY_TTL_MS = 1000 * 60 * 10; // 10 minutes

@Injectable()
export class WebrtcService {
  private readonly sessions = new Map<string, WebrtcSessionState>();

  createSession(roomId: string, hostId: string, tags: string[] = []): WebrtcSessionSummary {
    if (!roomId || !hostId) {
      throw new BadRequestException('roomId and hostId are required to create a session');
    }

    const sessionId = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString();

    const session: WebrtcSessionState = {
      sessionId,
      roomId,
      hostId,
      createdAt,
      expiresAt,
      metadata: {
        tags,
        isRecording: false,
        isScreenSharing: false,
      },
      peerCount: 0,
      peers: new Map(),
    };

    this.sessions.set(sessionId, session);
    return this.toSummary(session);
  }

  registerPeer(
    sessionId: string,
    peerId: string,
    role: WebrtcRole,
    description?: SessionDescription,
  ): PeerConnectionState {
    const session = this.requireSession(sessionId);

    if (!peerId) {
      throw new BadRequestException('peerId is required');
    }

    const existing = session.peers.get(peerId);
    const nowIso = new Date().toISOString();
    const state: PeerConnectionState = existing
      ? {
          ...existing,
          role,
          description: description ?? existing.description,
          lastActivityAt: nowIso,
        }
      : {
          peerId,
          role,
          description,
          pendingCandidates: [],
          lastActivityAt: nowIso,
        };

    session.peers.set(peerId, state);
    session.peerCount = session.peers.size;
    session.expiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString();

    return this.clonePeer(state);
  }

  addIceCandidate(
    sessionId: string,
    peerId: string,
    candidate: Omit<IceCandidate, 'createdAt'>,
  ): IceCandidate[] {
    const session = this.requireSession(sessionId);
    const peer = session.peers.get(peerId);

    if (!peer) {
      throw new NotFoundException(`Peer ${peerId} is not registered in session ${sessionId}`);
    }

    const entry: IceCandidate = {
      ...candidate,
      createdAt: new Date().toISOString(),
    };

    peer.pendingCandidates.push(entry);
    peer.lastActivityAt = entry.createdAt;
    return peer.pendingCandidates.map((c) => ({ ...c }));
  }

  consumeIceCandidates(sessionId: string, peerId: string): IceCandidate[] {
    const session = this.requireSession(sessionId);
    const peer = session.peers.get(peerId);
    if (!peer) {
      throw new NotFoundException(`Peer ${peerId} is not registered in session ${sessionId}`);
    }

    const candidates = peer.pendingCandidates.map((c) => ({ ...c }));
    peer.pendingCandidates = [];
    peer.lastActivityAt = new Date().toISOString();
    return candidates;
  }

  getSession(sessionId: string): WebrtcSessionSummary {
    const session = this.requireSession(sessionId);
    return this.toSummary(session);
  }

  getDetailedSession(sessionId: string): WebrtcSessionSummary & {
    peers: PeerConnectionState[];
  } {
    const session = this.requireSession(sessionId);
    return {
      ...this.toSummary(session),
      peers: Array.from(session.peers.values(), (peer) => this.clonePeer(peer)),
    };
  }

  updatePeerDescription(
    sessionId: string,
    peerId: string,
    description: SessionDescription,
  ): PeerConnectionState {
    const session = this.requireSession(sessionId);
    const peer = session.peers.get(peerId);
    if (!peer) {
      throw new NotFoundException(`Peer ${peerId} is not registered in session ${sessionId}`);
    }

    peer.description = description;
    peer.lastActivityAt = new Date().toISOString();
    return this.clonePeer(peer);
  }

  markScreenSharing(sessionId: string, enabled: boolean) {
    const session = this.requireSession(sessionId);
    session.metadata.isScreenSharing = enabled;
    session.expiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString();
    return this.toSummary(session);
  }

  markRecording(sessionId: string, enabled: boolean) {
    const session = this.requireSession(sessionId);
    session.metadata.isRecording = enabled;
    session.expiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL_MS).toISOString();
    return this.toSummary(session);
  }

  removePeer(sessionId: string, peerId: string) {
    const session = this.requireSession(sessionId);
    session.peers.delete(peerId);
    session.peerCount = session.peers.size;
    if (!session.peerCount) {
      this.sessions.delete(sessionId);
    }
  }

  cleanupExpiredSessions(now: Date = new Date()) {
    const threshold = now.valueOf();
    for (const [sessionId, session] of this.sessions.entries()) {
      const expired = new Date(session.expiresAt).valueOf() <= threshold;
      if (expired) {
        this.sessions.delete(sessionId);
        continue;
      }

      for (const [peerId, peer] of session.peers.entries()) {
        const inactive = new Date(peer.lastActivityAt).valueOf() + PEER_INACTIVITY_TTL_MS <= threshold;
        if (inactive) {
          session.peers.delete(peerId);
        }
      }

      session.peerCount = session.peers.size;
      if (!session.peerCount) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getActivePeerCount(): number {
    let peers = 0;
    for (const session of this.sessions.values()) {
      peers += session.peerCount;
    }
    return peers;
  }

  private requireSession(sessionId: string): WebrtcSessionState {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`WebRTC session ${sessionId} does not exist`);
    }
    return session;
  }

  private toSummary(session: WebrtcSessionState): WebrtcSessionSummary {
    return {
      sessionId: session.sessionId,
      roomId: session.roomId,
      hostId: session.hostId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      peerCount: session.peerCount,
      metadata: { ...session.metadata },
    };
  }

  private clonePeer(peer: PeerConnectionState): PeerConnectionState {
    return {
      peerId: peer.peerId,
      role: peer.role,
      description: peer.description ? { ...peer.description } : undefined,
      pendingCandidates: peer.pendingCandidates.map((c) => ({ ...c })),
      lastActivityAt: peer.lastActivityAt,
    };
  }
}
