import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type ScreenShareMediaType = 'screen' | 'window' | 'application' | 'tab';

export interface ScreenShareViewer {
  viewerId: string;
  joinedAt: string;
  lastSeenAt: string;
}

export interface ScreenShareSession {
  shareId: string;
  roomId: string;
  presenterId: string;
  mediaType: ScreenShareMediaType;
  startedAt: string;
  lastActivityAt: string;
  viewers: ScreenShareViewer[];
  metadata?: Record<string, unknown>;
}

const SHARE_IDLE_TTL_MS = 1000 * 60 * 5;

@Injectable()
export class ScreenSharingService {
  private readonly activeShares = new Map<string, ScreenShareSession>();

  startShare(
    roomId: string,
    presenterId: string,
    mediaType: ScreenShareMediaType,
    metadata: Record<string, unknown> = {},
  ): ScreenShareSession {
    if (!roomId || !presenterId) {
      throw new BadRequestException('roomId and presenterId are required');
    }

    const existing = Array.from(this.activeShares.values()).find(
      (share) => share.roomId === roomId && share.presenterId === presenterId,
    );

    if (existing) {
      existing.mediaType = mediaType;
      existing.metadata = metadata;
      existing.lastActivityAt = new Date().toISOString();
      return this.cloneShare(existing);
    }

    const now = new Date().toISOString();
    const share: ScreenShareSession = {
      shareId: randomUUID(),
      roomId,
      presenterId,
      mediaType,
      startedAt: now,
      lastActivityAt: now,
      viewers: [],
      metadata,
    };

    this.activeShares.set(share.shareId, share);
    return this.cloneShare(share);
  }

  stopShare(shareId: string) {
    if (!this.activeShares.delete(shareId)) {
      throw new NotFoundException(`Screen share ${shareId} not found`);
    }
  }

  getActiveShareByRoom(roomId: string): ScreenShareSession | null {
    const share = Array.from(this.activeShares.values()).find((item) => item.roomId === roomId);
    return share ? this.cloneShare(share) : null;
  }

  registerViewer(shareId: string, viewerId: string) {
    const share = this.requireShare(shareId);
    const now = new Date().toISOString();
    const existing = share.viewers.find((viewer) => viewer.viewerId === viewerId);

    if (existing) {
      existing.lastSeenAt = now;
      return this.cloneShare(share);
    }

    share.viewers.push({ viewerId, joinedAt: now, lastSeenAt: now });
    share.lastActivityAt = now;
    return this.cloneShare(share);
  }

  heartbeat(shareId: string, viewerId: string) {
    const share = this.requireShare(shareId);
    const viewer = share.viewers.find((item) => item.viewerId === viewerId);
    if (!viewer) {
      throw new NotFoundException(`Viewer ${viewerId} is not connected to share ${shareId}`);
    }

    viewer.lastSeenAt = new Date().toISOString();
    share.lastActivityAt = viewer.lastSeenAt;
  }

  removeViewer(shareId: string, viewerId: string) {
    const share = this.requireShare(shareId);
    share.viewers = share.viewers.filter((viewer) => viewer.viewerId !== viewerId);
    share.lastActivityAt = new Date().toISOString();
  }

  cleanup(now: Date = new Date()) {
    const threshold = now.valueOf() - SHARE_IDLE_TTL_MS;
    for (const [shareId, share] of this.activeShares.entries()) {
      const lastActivity = new Date(share.lastActivityAt).valueOf();
      if (lastActivity <= threshold) {
        this.activeShares.delete(shareId);
        continue;
      }

      share.viewers = share.viewers.filter((viewer) => new Date(viewer.lastSeenAt).valueOf() > threshold);
    }
  }

  getActiveShareCount(): number {
    return this.activeShares.size;
  }

  private requireShare(shareId: string): ScreenShareSession {
    const share = this.activeShares.get(shareId);
    if (!share) {
      throw new NotFoundException(`Screen share ${shareId} not found`);
    }
    return share;
  }

  private cloneShare(session: ScreenShareSession): ScreenShareSession {
    return {
      shareId: session.shareId,
      roomId: session.roomId,
      presenterId: session.presenterId,
      mediaType: session.mediaType,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
      viewers: session.viewers.map((viewer) => ({ ...viewer })),
      metadata: session.metadata ? { ...session.metadata } : undefined,
    };
  }
}
