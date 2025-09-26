import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type MediaJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface MediaJob {
  jobId: string;
  recordingId: string;
  type: 'transcode' | 'thumbnail' | 'caption';
  status: MediaJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  logs: string[];
  outputUrl?: string;
  errorMessage?: string;
}

@Injectable()
export class MediaProcessingService {
  private readonly jobs = new Map<string, MediaJob>();

  queueJob(recordingId: string, type: MediaJob['type']): MediaJob {
    const now = new Date().toISOString();
    const job: MediaJob = {
      jobId: randomUUID(),
      recordingId,
      type,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      logs: [`${now} - Job queued`],
    };

    this.jobs.set(job.jobId, job);
    return { ...job, logs: [...job.logs] };
  }

  updateProgress(jobId: string, progress: number, log?: string) {
    const job = this.requireJob(jobId);
    job.status = 'processing';
    job.progress = Math.min(100, Math.max(0, progress));
    job.updatedAt = new Date().toISOString();
    if (log) {
      job.logs.push(`${job.updatedAt} - ${log}`);
    }
    return { ...job, logs: [...job.logs] };
  }

  completeJob(jobId: string, outputUrl: string) {
    const job = this.requireJob(jobId);
    job.status = 'completed';
    job.progress = 100;
    job.outputUrl = outputUrl;
    job.updatedAt = new Date().toISOString();
    job.logs.push(`${job.updatedAt} - Job completed`);
    return { ...job, logs: [...job.logs] };
  }

  failJob(jobId: string, errorMessage: string) {
    const job = this.requireJob(jobId);
    job.status = 'failed';
    job.errorMessage = errorMessage;
    job.updatedAt = new Date().toISOString();
    job.logs.push(`${job.updatedAt} - Error: ${errorMessage}`);
    return { ...job, logs: [...job.logs] };
  }

  getJob(jobId: string): MediaJob {
    return { ...this.requireJob(jobId), logs: [...this.requireJob(jobId).logs] };
  }

  listJobsByRecording(recordingId: string): MediaJob[] {
    return Array.from(this.jobs.values())
      .filter((job) => job.recordingId === recordingId)
      .map((job) => ({ ...job, logs: [...job.logs] }));
  }

  private requireJob(jobId: string): MediaJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Media job ${jobId} not found`);
    }
    return job;
  }

  getActiveJobCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'processing') {
        count += 1;
      }
    }
    return count;
  }
}
