import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type StreamStatus = 'idle' | 'preparing' | 'live' | 'ended' | 'error';

export interface LiveStream {
  streamId: string;
  sessionId: string;
  provider: 'wowza' | 'mux' | 'agora' | 'janus' | 'custom';
  ingestUrl: string;
  playbackUrl: string;
  status: StreamStatus;
  startedAt?: string;
  endedAt?: string;
  lastHeartbeatAt?: string;
  metadata: Record<string, unknown>;
  errorMessage?: string;
}

@Injectable()
export class LiveStreamingService {
  private readonly streams = new Map<string, LiveStream>();

  createStream(
    sessionId: string,
    provider: LiveStream['provider'],
    urls: { ingestUrl: string; playbackUrl: string },
    metadata: Record<string, unknown> = {},
  ): LiveStream {
    const stream: LiveStream = {
      streamId: randomUUID(),
      sessionId,
      provider,
      ingestUrl: urls.ingestUrl,
      playbackUrl: urls.playbackUrl,
      status: 'preparing',
      metadata,
      lastHeartbeatAt: new Date().toISOString(),
    };

    this.streams.set(stream.streamId, stream);
    return { ...stream, metadata: { ...stream.metadata } };
  }

  markLive(streamId: string) {
    const stream = this.requireStream(streamId);
    stream.status = 'live';
    stream.startedAt = new Date().toISOString();
    stream.lastHeartbeatAt = stream.startedAt;
    return { ...stream, metadata: { ...stream.metadata } };
  }

  markEnded(streamId: string) {
    const stream = this.requireStream(streamId);
    stream.status = 'ended';
    stream.endedAt = new Date().toISOString();
    return { ...stream, metadata: { ...stream.metadata } };
  }

  markError(streamId: string, errorMessage: string) {
    const stream = this.requireStream(streamId);
    stream.status = 'error';
    stream.errorMessage = errorMessage;
    stream.endedAt = new Date().toISOString();
    return { ...stream, metadata: { ...stream.metadata } };
  }

  heartbeat(streamId: string) {
    const stream = this.requireStream(streamId);
    stream.lastHeartbeatAt = new Date().toISOString();
  }

  getStream(streamId: string): LiveStream {
    const stream = this.requireStream(streamId);
    return { ...stream, metadata: { ...stream.metadata } };
  }

  listStreamsBySession(sessionId: string): LiveStream[] {
    return Array.from(this.streams.values())
      .filter((stream) => stream.sessionId === sessionId)
      .map((stream) => ({ ...stream, metadata: { ...stream.metadata } }));
  }

  private requireStream(streamId: string): LiveStream {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new NotFoundException(`Live stream ${streamId} not found`);
    }
    return stream;
  }

  getLiveStreamCount(): number {
    let count = 0;
    for (const stream of this.streams.values()) {
      if (stream.status === 'live' || stream.status === 'preparing') {
        count += 1;
      }
    }
    return count;
  }
}
