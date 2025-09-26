import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type RecordingStatus = 'queued' | 'recording' | 'processing' | 'complete' | 'failed' | 'cancelled';

export interface RecordingSegment {
  segmentId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  url: string;
}

export interface RecordingJob {
  recordingId: string;
  sessionId: string;
  startedBy: string;
  status: RecordingStatus;
  startedAt: string;
  endedAt?: string;
  failureReason?: string;
  outputLocation?: string;
  metadata: Record<string, unknown>;
  segments: RecordingSegment[];
}

export interface RecordingOptions {
  resolution?: '720p' | '1080p' | '4k';
  layout?: 'gallery' | 'speaker' | 'presentation';
  includeChat?: boolean;
  includeCaptions?: boolean;
  storageBucket?: string;
}

@Injectable()
export class RecordingService {
  private readonly recordings = new Map<string, RecordingJob>();

  startRecording(
    sessionId: string,
    startedBy: string,
    options: RecordingOptions = {},
  ): RecordingJob {
    const now = new Date().toISOString();
    const recording: RecordingJob = {
      recordingId: randomUUID(),
      sessionId,
      startedBy,
      status: 'recording',
      startedAt: now,
      metadata: {
        options,
        version: 1,
        createdAt: now,
      },
      segments: [],
    };

    this.recordings.set(recording.recordingId, recording);
    return this.clone(recording);
  }

  markProcessing(recordingId: string, outputLocation?: string) {
    const recording = this.requireRecording(recordingId);
    recording.status = 'processing';
    recording.outputLocation = outputLocation ?? recording.outputLocation;
    return this.clone(recording);
  }

  markFailed(recordingId: string, failureReason: string) {
    const recording = this.requireRecording(recordingId);
    recording.status = 'failed';
    recording.failureReason = failureReason;
    recording.endedAt = new Date().toISOString();
    return this.clone(recording);
  }

  stopRecording(recordingId: string, outputLocation?: string) {
    const recording = this.requireRecording(recordingId);
    recording.status = 'complete';
    recording.outputLocation = outputLocation ?? recording.outputLocation;
    recording.endedAt = new Date().toISOString();
    return this.clone(recording);
  }

  cancelRecording(recordingId: string) {
    const recording = this.requireRecording(recordingId);
    recording.status = 'cancelled';
    recording.endedAt = new Date().toISOString();
    return this.clone(recording);
  }

  appendSegment(
    recordingId: string,
    segment: Omit<RecordingSegment, 'segmentId' | 'durationSeconds' | 'startedAt' | 'endedAt'> &
      Partial<Pick<RecordingSegment, 'startedAt' | 'endedAt'>> & { durationSeconds?: number },
  ) {
    const recording = this.requireRecording(recordingId);
    const startedAt = segment.startedAt ? new Date(segment.startedAt) : new Date();
    const endedAt = segment.endedAt ? new Date(segment.endedAt) : new Date(startedAt.valueOf());
    const durationSeconds = segment.durationSeconds ?? Math.max(1, Math.floor((endedAt.valueOf() - startedAt.valueOf()) / 1000));

    const completeSegment: RecordingSegment = {
      segmentId: randomUUID(),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds,
      url: segment.url,
    };

    recording.segments.push(completeSegment);
    recording.metadata.lastSegmentAt = completeSegment.endedAt;
    return this.clone(recording);
  }

  getRecording(recordingId: string): RecordingJob {
    return this.clone(this.requireRecording(recordingId));
  }

  listRecordingsBySession(sessionId: string): RecordingJob[] {
    return Array.from(this.recordings.values())
      .filter((recording) => recording.sessionId === sessionId)
      .map((recording) => this.clone(recording));
  }

  cleanupOlderThan(days = 7) {
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
    for (const [recordingId, recording] of this.recordings.entries()) {
      const endedAt = recording.endedAt ? new Date(recording.endedAt).valueOf() : null;
      if (endedAt && endedAt < threshold) {
        this.recordings.delete(recordingId);
      }
    }
  }

  getOngoingRecordingCount(): number {
    let count = 0;
    for (const recording of this.recordings.values()) {
      if (recording.status === 'recording' || recording.status === 'processing') {
        count += 1;
      }
    }
    return count;
  }

  private requireRecording(recordingId: string): RecordingJob {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new NotFoundException(`Recording ${recordingId} not found`);
    }
    return recording;
  }

  private clone(recording: RecordingJob): RecordingJob {
    return {
      recordingId: recording.recordingId,
      sessionId: recording.sessionId,
      startedBy: recording.startedBy,
      status: recording.status,
      startedAt: recording.startedAt,
      endedAt: recording.endedAt,
      failureReason: recording.failureReason,
      outputLocation: recording.outputLocation,
      metadata: { ...recording.metadata },
      segments: recording.segments.map((segment) => ({ ...segment })),
    };
  }
}
