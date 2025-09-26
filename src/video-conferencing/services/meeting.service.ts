// path: backend/src/video-conferencing/services/meeting.service.ts
// purpose: Service for video conference meeting management (wrapper for VideoConferencingService)
// dependencies: @nestjs/common, video-conferencing service

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, VideoMeeting } from '@prisma/client';
import { VideoConferencingService } from '../../modules/video-conferencing/video-conferencing.service';
import { 
  CreateMeetingDto as VideoCreateMeetingDto,
  UpdateMeetingDto,
  CreateBreakoutRoomDto
} from '../../modules/video-conferencing/dto';
import * as crypto from 'crypto';

// Legacy DTOs for backward compatibility
export enum MeetingType {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
  WEBINAR = 'webinar'
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

export interface CreateMeetingDto {
  title: string;
  description?: string;
  type: MeetingType;
  startTime?: Date;
  duration?: number;
  timezone?: string;
  participants?: any[];
  recurrence?: any;
  requirePassword?: boolean;
  enableWaitingRoom?: boolean;
  allowScreenShare?: boolean;
  allowRecording?: boolean;
  enableChat?: boolean;
  enableBreakoutRooms?: boolean;
  maxParticipants?: number;
  autoRecord?: boolean;
  muteOnJoin?: boolean;
  tags?: string[];
  agenda?: string;
}

export interface MeetingEntity {
  id: string;
  title: string;
  description?: string;
  type: MeetingType;
  status: MeetingStatus;
  meetingId: string;
  password?: string;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  timezone: string;
  joinUrl: string;
  hostUrl: string;
  participants: any[];
  recurrence?: any;
  settings: {
    requirePassword: boolean;
    enableWaitingRoom: boolean;
    allowScreenShare: boolean;
    allowRecording: boolean;
    enableChat: boolean;
    enableBreakoutRooms: boolean;
    maxParticipants: number;
    autoRecord: boolean;
    muteOnJoin: boolean;
  };
  tags: string[];
  agenda?: string;
  recordingUrl?: string;
  tenantId: string;
  hostId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);
  private readonly baseUrl = process.env.VIDEO_CONFERENCE_BASE_URL || 'https://meet.cubecore.ai';

  constructor(private readonly videoConferencingService: VideoConferencingService) {}

  async create(
    createMeetingDto: CreateMeetingDto,
    tenantId: string,
    hostId: string
  ): Promise<MeetingEntity> {
    try {
      this.logger.log(`Creating meeting: ${createMeetingDto.title}`);

      // Convert legacy DTO to new DTO format
      const videoDto: VideoCreateMeetingDto = {
        title: createMeetingDto.title,
        description: createMeetingDto.description,
        scheduledAt: createMeetingDto.startTime,
        duration: createMeetingDto.duration,
        allowRecording: createMeetingDto.allowRecording,
        allowScreenShare: createMeetingDto.allowScreenShare,
        allowChat: createMeetingDto.enableChat,
        allowBreakoutRooms: createMeetingDto.enableBreakoutRooms,
        maxParticipants: createMeetingDto.maxParticipants,
        requirePassword: createMeetingDto.requirePassword,
        password: createMeetingDto.requirePassword ? this.generatePassword() : undefined,
        waitingRoom: createMeetingDto.enableWaitingRoom,
        muteOnJoin: createMeetingDto.muteOnJoin,
        videoOnJoin: false,
      };

      // Create meeting using VideoConferencingService
      const meeting = await this.videoConferencingService.createMeeting(hostId, tenantId, videoDto);
      const meetingSettings = this.parseMeetingSettings(meeting.settings);
      const meetingStartTime = this.getMeetingStartTime(meeting);
      const participants = this.getParticipantsArray(meeting.participants);

      // Convert to legacy format
      const legacyMeeting: MeetingEntity = {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        type: createMeetingDto.type || MeetingType.SCHEDULED,
        status: meeting.status as MeetingStatus,
        meetingId: meeting.id,
        password: meetingSettings.password,
        startTime: meetingStartTime,
        endTime: new Date(meetingStartTime.getTime() + (meeting.duration ?? videoDto.duration ?? 0) * 60 * 1000),
        duration: meeting.duration ?? videoDto.duration ?? 0,
        timezone: createMeetingDto.timezone || 'UTC',
        joinUrl: this.generateJoinUrl(meeting.id, meetingSettings.password),
        hostUrl: this.generateHostUrl(meeting.id, meetingSettings.password),
        participants,
        recurrence: createMeetingDto.recurrence ?? null,
        settings: {
          requirePassword: meetingSettings.requirePassword ?? false,
          enableWaitingRoom: meetingSettings.waitingRoom ?? false,
          allowScreenShare: meetingSettings.allowScreenShare ?? true,
          allowRecording: meetingSettings.allowRecording ?? true,
          enableChat: meetingSettings.allowChat ?? true,
          enableBreakoutRooms: meetingSettings.allowBreakoutRooms ?? true,
          maxParticipants: meetingSettings.maxParticipants ?? 100,
          autoRecord: false,
          muteOnJoin: meetingSettings.muteOnJoin ?? false,
        },
        tags: createMeetingDto.tags || [],
        agenda: createMeetingDto.agenda,
        recordingUrl: meeting.recordingUrl ?? undefined,
        tenantId: meeting.tenantId,
        hostId: meeting.hostId,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      };

      this.logger.log(`Meeting created successfully: ${meeting.id}`);
      return legacyMeeting;
    } catch (error) {
      this.logger.error(`Failed to create meeting: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    status?: MeetingStatus,
    type?: MeetingType,
    limit: number = 50,
    offset: number = 0
  ): Promise<MeetingEntity[]> {
    try {
      const query = { 
        status, 
        type, 
        limit, 
        page: Math.floor(offset / limit) + 1 
      };
      
      const result = await this.videoConferencingService.getMeetings(userId, tenantId, query);
      
      return result.data.map(meeting => this.convertToLegacyFormat(meeting, type));
    } catch (error) {
      this.logger.error(`Failed to find meetings: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string, userId: string): Promise<MeetingEntity> {
    try {
      const meeting = await this.videoConferencingService.getMeeting(userId, tenantId, id);
      return this.convertToLegacyFormat(meeting);
    } catch (error) {
      this.logger.error(`Failed to find meeting ${id}: ${error.message}`);
      throw error;
    }
  }

  async update(
    id: string,
    updateData: Partial<CreateMeetingDto>,
    tenantId: string,
    userId: string
  ): Promise<MeetingEntity> {
    try {
      const updateDto: UpdateMeetingDto = {
        title: updateData.title,
        description: updateData.description,
        scheduledAt: updateData.startTime,
        duration: updateData.duration,
        settings: {
          allowRecording: updateData.allowRecording,
          allowScreenShare: updateData.allowScreenShare,
          allowChat: updateData.enableChat,
          allowBreakoutRooms: updateData.enableBreakoutRooms,
          maxParticipants: updateData.maxParticipants,
          requirePassword: updateData.requirePassword,
          waitingRoom: updateData.enableWaitingRoom,
          muteOnJoin: updateData.muteOnJoin,
        }
      };

      const meeting = await this.videoConferencingService.updateMeeting(userId, tenantId, id, updateDto);
      return this.convertToLegacyFormat(meeting, updateData.type);
    } catch (error) {
      this.logger.error(`Failed to update meeting ${id}: ${error.message}`);
      throw error;
    }
  }

  async start(id: string, tenantId: string, userId: string): Promise<{ joinUrl: string; hostUrl: string }> {
    try {
      const meeting = await this.videoConferencingService.getMeeting(userId, tenantId, id);
      
      const meetingSettings = this.parseMeetingSettings(meeting.settings);

      return {
        joinUrl: this.generateJoinUrl(meeting.id, meetingSettings.password),
        hostUrl: this.generateHostUrl(meeting.id, meetingSettings.password),
      };
    } catch (error) {
      this.logger.error(`Failed to start meeting ${id}: ${error.message}`);
      throw error;
    }
  }

  async end(id: string, tenantId: string, userId: string): Promise<void> {
    try {
      await this.videoConferencingService.leaveMeeting(userId, tenantId, id);
      this.logger.log(`Meeting ended: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to end meeting ${id}: ${error.message}`);
      throw error;
    }
  }

  async join(meetingId: string, password?: string): Promise<{ success: boolean; joinUrl?: string; error?: string }> {
    try {
      // For legacy compatibility, we'll simulate the join process
      return {
        success: true,
        joinUrl: this.generateJoinUrl(meetingId, password)
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async getRecordings(
    meetingId: string,
    _tenantId: string,
    _userId: string
  ): Promise<any[]> {
    try {
      // For now, return empty array as recordings are handled by the main service
      return [];
    } catch (error) {
      this.logger.error(`Failed to get recordings for meeting ${meetingId}: ${error.message}`);
      return [];
    }
  }

  async createBreakoutRoom(
    meetingId: string,
    name: string,
    participants: string[],
    tenantId: string,
    userId: string
  ): Promise<any> {
    try {
      const dto: CreateBreakoutRoomDto = {
        name,
        participantIds: participants
      };

      return await this.videoConferencingService.createBreakoutRoom(userId, tenantId, meetingId, dto);
    } catch (error) {
      this.logger.error(`Failed to create breakout room: ${error.message}`);
      throw error;
    }
  }

  async getStats(tenantId: string, userId: string): Promise<any> {
    try {
      return await this.videoConferencingService.getAnalytics(userId, tenantId);
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      return {
        totalMeetings: 0,
        activeMeetings: 0,
        scheduledMeetings: 0,
        totalParticipants: 0,
        totalDuration: 0,
        recordingsCount: 0,
        storageUsed: 0
      };
    }
  }

  private convertToLegacyFormat(meeting: any, type?: MeetingType): MeetingEntity {
    const meetingSettings = this.parseMeetingSettings(meeting.settings);
    const startTime = this.getMeetingStartTime(meeting);

    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      type: type || MeetingType.SCHEDULED,
      status: meeting.status as MeetingStatus,
      meetingId: meeting.id,
      password: meetingSettings.password,
      startTime,
      endTime: new Date(startTime.getTime() + (meeting.duration ?? 0) * 60 * 1000),
      duration: meeting.duration ?? 0,
      timezone: 'UTC',
      joinUrl: this.generateJoinUrl(meeting.id, meetingSettings.password),
      hostUrl: this.generateHostUrl(meeting.id, meetingSettings.password),
      participants: this.getParticipantsArray(meeting.participants),
      recurrence: meeting.recurrence ?? null,
      settings: {
        requirePassword: meetingSettings.requirePassword ?? false,
        enableWaitingRoom: meetingSettings.waitingRoom ?? false,
        allowScreenShare: meetingSettings.allowScreenShare ?? true,
        allowRecording: meetingSettings.allowRecording ?? false,
        enableChat: meetingSettings.allowChat ?? true,
        enableBreakoutRooms: meetingSettings.allowBreakoutRooms ?? false,
        maxParticipants: meetingSettings.maxParticipants ?? 100,
        autoRecord: false,
        muteOnJoin: meetingSettings.muteOnJoin ?? true,
      },
      tags: meeting.tags ?? [],
      agenda: meeting.agenda ?? undefined,
      recordingUrl: meeting.recordingUrl ?? undefined,
      tenantId: meeting.tenantId,
      hostId: meeting.hostId,
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt,
    };
  }

  private generateMeetingId(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  private generatePassword(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  private generateJoinUrl(meetingId: string, password?: string): string {
    const url = new URL(`${this.baseUrl}/join/${meetingId}`);
    if (password) {
      url.searchParams.set('pwd', password);
    }
    return url.toString();
  }

  private generateHostUrl(meetingId: string, password?: string): string {
    const url = new URL(`${this.baseUrl}/host/${meetingId}`);
    if (password) {
      url.searchParams.set('pwd', password);
    }
    return url.toString();
  }

  private async sendInvitations(meetingId: string, participants: any[]): Promise<void> {
    // TODO: Implement email invitations
    this.logger.log(`Sending invitations for meeting ${meetingId} to ${participants.length} participants`);
  }

  private async createRecurringMeetings(meeting: any, _recurrence: any): Promise<void> {
    // TODO: Implement recurring meeting creation
    this.logger.log(`Creating recurring meetings for ${meeting.id}`);
  }

  private parseMeetingSettings(settings: Prisma.JsonValue | null | undefined): {
    password?: string;
    requirePassword?: boolean;
    waitingRoom?: boolean;
    allowScreenShare?: boolean;
    allowRecording?: boolean;
    allowChat?: boolean;
    allowBreakoutRooms?: boolean;
    maxParticipants?: number;
    muteOnJoin?: boolean;
  } {
    if (!settings) {
      return {};
    }

    if (typeof settings === 'string') {
      try {
        const parsed = JSON.parse(settings);
        return typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as any) : {};
      } catch {
        return {};
      }
    }

    if (Array.isArray(settings)) {
      return {};
    }

    return settings as {
      password?: string;
      requirePassword?: boolean;
      waitingRoom?: boolean;
      allowScreenShare?: boolean;
      allowRecording?: boolean;
      allowChat?: boolean;
      allowBreakoutRooms?: boolean;
      maxParticipants?: number;
      muteOnJoin?: boolean;
    };
  }

  private getMeetingStartTime(meeting: VideoMeeting | (VideoMeeting & { scheduledAt?: any })): Date {
    const raw = (meeting as any).startTime ?? (meeting as any).scheduledAt;
    return raw ? new Date(raw) : new Date();
  }

  private getParticipantsArray(participants: Prisma.JsonValue | null | undefined): any[] {
    if (!participants) {
      return [];
    }

    if (Array.isArray(participants)) {
      return participants as any[];
    }

    if (typeof participants === 'string') {
      try {
        const parsed = JSON.parse(participants);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  }
}
