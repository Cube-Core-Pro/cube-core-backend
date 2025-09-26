// path: backend/src/modules/video-conferencing/services/meeting-participant.service.ts
// purpose: Service for managing meeting participants with Fortune500 enterprise features
// dependencies: @nestjs/common, prisma, redis, video conferencing types

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingParticipant, Prisma } from '@prisma/client';

type ParticipantRole = 'HOST' | 'MODERATOR' | 'PRESENTER' | 'PARTICIPANT';

// Note: Prisma MeetingParticipant likely does not have an explicit status enum field; we encode status in metadata.
enum ParticipantStatus {
  ACTIVE = 'ACTIVE',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
}

export interface ParticipantPermissions {
  canShareScreen: boolean;
  canRecord: boolean;
  canManageBreakoutRooms: boolean;
  canMuteOthers: boolean;
  canRemoveParticipants: boolean;
  canManagePolls: boolean;
  canManageWhiteboard: boolean;
  canManageParticipants: boolean;
}

export interface ParticipantStats {
  joinTime: Date;
  totalSpeakingTime: number;
  messagesCount: number;
  reactionsCount: number;
  pollsCreated: number;
  pollsVoted: number;
}

interface ParticipantMetadata {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
  handRaisedAt?: string;
  reactions?: unknown[];
  permissions?: ParticipantPermissions;
  displayName?: string;
  totalSpeakingTime?: number;
  messagesCount?: number;
  reactionsCount?: number;
  pollsCreated?: number;
  pollsVoted?: number;
  customData?: Record<string, unknown>;
  status?: ParticipantStatus;
  leftAt?: string;
}

@Injectable()
export class MeetingParticipantService {
  private readonly logger = new Logger(MeetingParticipantService.name);

  constructor(private prisma: PrismaService) {}

  async addParticipant(
    meetingId: string,
    userId: string,
    displayName: string,
    role: ParticipantRole = 'PARTICIPANT',
  ): Promise<MeetingParticipant> {
    try {
      // Check if participant already exists
      const existingParticipant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
      });

      if (existingParticipant) {
        // Update status to active if rejoining
        const existingMeta = this.getMetadata(existingParticipant) as ParticipantMetadata;
        const updatedMeta: ParticipantMetadata = { ...existingMeta, displayName };
        return this.prisma.meetingParticipant.update({
          where: { id: existingParticipant.id },
          data: {
            joinedAt: new Date(),
            metadata: this.serializeMetadata(updatedMeta),
          } as any,
        });
      }

      // Create new participant
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
        select: { tenantId: true },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const participantMetadata: ParticipantMetadata = {
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
        handRaised: false,
        reactions: [],
        permissions: this.getDefaultPermissions(role),
        displayName,
      };

      const participant = await this.prisma.meetingParticipant.create({
        data: {
          meetingId,
          userId,
          tenantId: meeting.tenantId,
          role,
          joinedAt: new Date(),
          displayName,
          metadata: this.serializeMetadata(participantMetadata),
        } as Prisma.MeetingParticipantUncheckedCreateInput,
      });

      this.logger.log(`Participant ${userId} added to meeting ${meetingId}`);
      return participant;
    } catch (error) {
      this.logger.error(`Error adding participant to meeting: ${error.message}`);
      throw error;
    }
  }

  async removeParticipant(meetingId: string, userId: string): Promise<void> {
    try {
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      const existingMeta = this.getMetadata(participant) as ParticipantMetadata;
      const updatedMeta: ParticipantMetadata = {
        ...existingMeta,
        status: ParticipantStatus.LEFT,
        leftAt: new Date().toISOString(),
      };
      await this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          leftAt: new Date(),
          status: ParticipantStatus.LEFT,
          metadata: this.serializeMetadata(updatedMeta),
        } as any,
      });

      this.logger.log(`Participant ${userId} removed from meeting ${meetingId}`);
    } catch (error) {
      this.logger.error(`Error removing participant from meeting: ${error.message}`);
      throw error;
    }
  }

  async getParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    try {
      return this.prisma.meetingParticipant.findMany({
        where: {
          meetingId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });
    } catch (error) {
      this.logger.error(`Error getting meeting participants: ${error.message}`);
      throw error;
    }
  }

  async getParticipant(meetingId: string, userId: string): Promise<MeetingParticipant | null> {
    try {
      return this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error getting participant: ${error.message}`);
      throw error;
    }
  }

  async updateParticipantRole(
    meetingId: string,
    userId: string,
    newRole: ParticipantRole,
    updatedBy: string,
  ): Promise<MeetingParticipant> {
    try {
      // Check if updater has permission to change roles
      const updater = await this.getParticipant(meetingId, updatedBy);
      if (!updater || !this.hasPermission(updater, 'canManageParticipants')) {
        throw new ForbiddenException('Insufficient permissions to update participant role');
      }

      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const updatedParticipant = await this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          role: newRole,
          metadata: this.serializeMetadata({
            ...this.getMetadata(participant),
            permissions: this.getDefaultPermissions(newRole),
          }),
        } as any,
      });

      this.logger.log(`Participant ${userId} role updated to ${newRole} in meeting ${meetingId}`);
      return updatedParticipant;
    } catch (error) {
      this.logger.error(`Error updating participant role: ${error.message}`);
      throw error;
    }
  }

  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    status: ParticipantStatus,
  ): Promise<MeetingParticipant> {
    try {
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          ...(status === ParticipantStatus.LEFT && { leftAt: new Date() }),
          status,
          metadata: this.serializeMetadata({
            ...this.getMetadata(participant),
            status,
          }),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error updating participant status: ${error.message}`);
      throw error;
    }
  }

  async toggleParticipantAudio(
    meetingId: string,
    userId: string,
    enabled: boolean,
  ): Promise<MeetingParticipant> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      metadata.audioEnabled = enabled;

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error toggling participant audio: ${error.message}`);
      throw error;
    }
  }

  async toggleParticipantVideo(
    meetingId: string,
    userId: string,
    enabled: boolean,
  ): Promise<MeetingParticipant> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      metadata.videoEnabled = enabled;

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error toggling participant video: ${error.message}`);
      throw error;
    }
  }

  async setScreenSharing(
    meetingId: string,
    userId: string,
    isSharing: boolean,
  ): Promise<MeetingParticipant> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      metadata.screenSharing = isSharing;

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error setting screen sharing: ${error.message}`);
      throw error;
    }
  }

  async raiseHand(meetingId: string, userId: string): Promise<MeetingParticipant> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      metadata.handRaised = true;
      metadata.handRaisedAt = new Date().toISOString();

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error raising hand: ${error.message}`);
      throw error;
    }
  }

  async lowerHand(meetingId: string, userId: string): Promise<MeetingParticipant> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      metadata.handRaised = false;
      delete metadata.handRaisedAt;

      return this.prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error lowering hand: ${error.message}`);
      throw error;
    }
  }

  async muteParticipant(
    meetingId: string,
    userId: string,
    mutedBy: string,
  ): Promise<MeetingParticipant> {
    try {
      // Check if muter has permission
      const muter = await this.getParticipant(meetingId, mutedBy);
      if (!muter || !this.hasPermission(muter, 'canMuteOthers')) {
        throw new ForbiddenException('Insufficient permissions to mute participant');
      }

      return this.toggleParticipantAudio(meetingId, userId, false);
    } catch (error) {
      this.logger.error(`Error muting participant: ${error.message}`);
      throw error;
    }
  }

  async muteAllParticipants(meetingId: string, mutedBy: string): Promise<void> {
    try {
      // Check if muter has permission
      const muter = await this.getParticipant(meetingId, mutedBy);
      if (!muter || !this.hasPermission(muter, 'canMuteOthers')) {
        throw new ForbiddenException('Insufficient permissions to mute all participants');
      }

      const participants = await this.getParticipants(meetingId);
      
      await Promise.all(
        participants
          .filter(p => p.userId !== mutedBy) // Don't mute the host
          .map(participant => 
            this.toggleParticipantAudio(meetingId, participant.userId, false)
          )
      );

      this.logger.log(`All participants muted in meeting ${meetingId} by ${mutedBy}`);
    } catch (error) {
      this.logger.error(`Error muting all participants: ${error.message}`);
      throw error;
    }
  }

  async kickParticipant(
    meetingId: string,
    userId: string,
    kickedBy: string,
  ): Promise<void> {
    try {
      // Check if kicker has permission
      const kicker = await this.getParticipant(meetingId, kickedBy);
      if (!kicker || !this.hasPermission(kicker, 'canRemoveParticipants')) {
        throw new ForbiddenException('Insufficient permissions to kick participant');
      }

      await this.updateParticipantStatus(meetingId, userId, ParticipantStatus.REMOVED);
      
      this.logger.log(`Participant ${userId} kicked from meeting ${meetingId} by ${kickedBy}`);
    } catch (error) {
      this.logger.error(`Error kicking participant: ${error.message}`);
      throw error;
    }
  }

  async getParticipantStats(meetingId: string, userId: string): Promise<ParticipantStats> {
    try {
      const participant = await this.getParticipant(meetingId, userId);
      if (!participant) {
        throw new NotFoundException('Participant not found');
      }

      const metadata = this.getMetadata(participant);
      
      return {
        joinTime: participant.joinedAt,
        totalSpeakingTime: metadata.totalSpeakingTime || 0,
        messagesCount: metadata.messagesCount || 0,
        reactionsCount: metadata.reactionsCount || 0,
        pollsCreated: metadata.pollsCreated || 0,
        pollsVoted: metadata.pollsVoted || 0,
      };
    } catch (error) {
      this.logger.error(`Error getting participant stats: ${error.message}`);
      throw error;
    }
  }

  private getDefaultPermissions(role: ParticipantRole): ParticipantPermissions {
    switch (role) {
      case 'HOST':
        return {
          canShareScreen: true,
          canRecord: true,
          canManageBreakoutRooms: true,
          canMuteOthers: true,
          canRemoveParticipants: true,
          canManagePolls: true,
          canManageWhiteboard: true,
          canManageParticipants: true,
        };
      case 'MODERATOR':
        return {
          canShareScreen: true,
          canRecord: true,
          canManageBreakoutRooms: true,
          canMuteOthers: true,
          canRemoveParticipants: true,
          canManagePolls: true,
          canManageWhiteboard: true,
          canManageParticipants: true,
        };
      case 'PRESENTER':
        return {
          canShareScreen: true,
          canRecord: false,
          canManageBreakoutRooms: false,
          canMuteOthers: false,
          canRemoveParticipants: false,
          canManagePolls: true,
          canManageWhiteboard: true,
          canManageParticipants: false,
        };
      default:
        return {
          canShareScreen: false,
          canRecord: false,
          canManageBreakoutRooms: false,
          canMuteOthers: false,
          canRemoveParticipants: false,
          canManagePolls: false,
          canManageWhiteboard: false,
          canManageParticipants: false,
        };
    }
  }

  private hasPermission(participant: MeetingParticipant, permission: keyof ParticipantPermissions): boolean {
    const metadata = this.getMetadata(participant);
    return metadata.permissions?.[permission] || false;
  }

  private serializeMetadata(metadata: ParticipantMetadata | null | undefined): Prisma.InputJsonValue {
    if (!metadata) {
      return {};
    }

    return this.normalizeJson(metadata);
  }

  private getMetadata(participant: MeetingParticipant): ParticipantMetadata {
    const rawMetadata = (participant as unknown as { metadata?: unknown }).metadata;
    if (!rawMetadata) {
      return {};
    }
    if (typeof rawMetadata === 'object' && rawMetadata !== null) {
      return rawMetadata as ParticipantMetadata;
    }
    if (typeof rawMetadata === 'string') {
      try {
        return JSON.parse(rawMetadata) as ParticipantMetadata;
      } catch {
        return {};
      }
    }
    return {};
  }

  private normalizeJson(value: unknown): Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(item => this.normalizeJson(item));
    }
    if (typeof value === 'object') {
      const normalized: Record<string, Prisma.InputJsonValue> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const normalizedValue = this.normalizeJson(val);
        if (normalizedValue !== undefined) {
          normalized[key] = normalizedValue;
        }
      }
      return normalized;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    return null;
  }
}
