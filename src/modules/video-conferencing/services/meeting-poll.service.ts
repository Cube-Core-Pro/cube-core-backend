// path: backend/src/modules/video-conferencing/services/meeting-poll.service.ts
// purpose: Service for managing meeting polls with real-time voting and results
// dependencies: @nestjs/common, prisma, websockets for real-time updates

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, VideoMeeting } from '@prisma/client';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollResult {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  status: 'active' | 'closed';
  createdAt: Date;
  endTime?: Date;
  responses: PollResponse[];
}

export interface PollResponse {
  userId: string;
  userName: string;
  optionId: string;
  timestamp: Date;
}

export interface CreatePollData {
  question: string;
  options: string[];
  duration?: number; // in minutes
  allowMultipleAnswers?: boolean;
  showResults?: boolean;
  anonymous?: boolean;
}

@Injectable()
export class MeetingPollService {
  private readonly logger = new Logger(MeetingPollService.name);

  constructor(private prisma: PrismaService) {}

  async createPoll(
    meetingId: string,
    createdBy: string,
    pollData: CreatePollData,
  ): Promise<PollResult> {
    try {
      // Verify the user is in the meeting and has permission to create polls
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId: createdBy,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      // Create options with IDs
      const options = pollData.options.map((text, index) => ({
        id: `option_${index + 1}`,
        text,
        votes: 0,
        percentage: 0,
      }));

      const endTime = pollData.duration 
        ? new Date(Date.now() + pollData.duration * 60 * 1000)
        : null;

      // Store poll in database (using JSON field for flexibility)
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const pollId = `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const polls = this.extractPolls(meeting);
      const newPoll: PollResult = {
        id: pollId,
        question: pollData.question,
        options,
        totalVotes: 0,
        status: 'active',
        createdAt: new Date(),
        endTime,
        responses: [],
      };

      polls.push(newPoll);

      await this.prisma.videoMeeting.update({
        where: { id: meetingId },
        data: {
          metadata: this.serializeMetadata({
            ...this.getMeetingMetadata(meeting),
            polls: polls.map(p => this.toJsonPoll(p)),
          }),
        } as any,
      });

      this.logger.log(`Poll ${pollId} created in meeting ${meetingId} by ${createdBy}`);
      return newPoll;
    } catch (error) {
      this.logger.error(`Error creating poll: ${error.message}`);
      throw error;
    }
  }

  async vote(
    meetingId: string,
    pollId: string,
    userId: string,
    optionIds: string[],
  ): Promise<PollResult> {
    try {
      // Verify the user is in the meeting
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const polls = this.extractPolls(meeting);
      const pollIndex = polls.findIndex(p => p.id === pollId);

      if (pollIndex === -1) {
        throw new NotFoundException('Poll not found');
      }

      const poll = polls[pollIndex];

      if (poll.status !== 'active') {
        throw new ForbiddenException('Poll is not active');
      }

      if (poll.endTime && new Date() > poll.endTime) {
        throw new ForbiddenException('Poll has expired');
      }

      // Check if user has already voted (remove previous vote if exists)
      const existingResponseIndex = poll.responses.findIndex(r => r.userId === userId);
      if (existingResponseIndex !== -1) {
        const existingResponse = poll.responses[existingResponseIndex];
        // Remove votes from previous option
        const existingOption = poll.options.find(o => o.id === existingResponse.optionId);
        if (existingOption) {
          existingOption.votes = Math.max(0, existingOption.votes - 1);
          poll.totalVotes = Math.max(0, poll.totalVotes - 1);
        }
        poll.responses.splice(existingResponseIndex, 1);
      }

      // Add new votes
      for (const optionId of optionIds) {
        const option = poll.options.find(o => o.id === optionId);
        if (!option) {
          throw new NotFoundException(`Option ${optionId} not found`);
        }

        option.votes += 1;
        poll.totalVotes += 1;

        poll.responses.push({
          userId,
          userName: participant.user.name || 'Participant',
          optionId,
          timestamp: new Date(),
        });
      }

      // Recalculate percentages
      poll.options.forEach(option => {
        option.percentage = poll.totalVotes > 0 
          ? Math.round((option.votes / poll.totalVotes) * 100)
          : 0;
      });

      polls[pollIndex] = poll;

      const metadata = this.getMeetingMetadata(meeting);
      metadata.polls = polls.map(p => this.toJsonPoll(p));

      await this.prisma.videoMeeting.update({
        where: { id: meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });

      this.logger.log(`User ${userId} voted in poll ${pollId} for options ${optionIds.join(', ')}`);
      return poll;
    } catch (error) {
      this.logger.error(`Error voting in poll: ${error.message}`);
      throw error;
    }
  }

  async closePoll(
    meetingId: string,
    pollId: string,
    closedBy: string,
  ): Promise<PollResult> {
    try {
      // Verify the user has permission to close polls
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId: closedBy,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const polls = this.extractPolls(meeting);
      const pollIndex = polls.findIndex(p => p.id === pollId);

      if (pollIndex === -1) {
        throw new NotFoundException('Poll not found');
      }

      polls[pollIndex].status = 'closed';

      const metadata = this.getMeetingMetadata(meeting);
      metadata.polls = polls.map(p => this.toJsonPoll(p));

      await this.prisma.videoMeeting.update({
        where: { id: meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });

      this.logger.log(`Poll ${pollId} closed by ${closedBy}`);
      return polls[pollIndex];
    } catch (error) {
      this.logger.error(`Error closing poll: ${error.message}`);
      throw error;
    }
  }

  async getPoll(meetingId: string, pollId: string): Promise<PollResult | null> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return null;
      }

      const polls = this.extractPolls(meeting);
      return polls.find(p => p.id === pollId) || null;
    } catch (error) {
      this.logger.error(`Error getting poll: ${error.message}`);
      throw error;
    }
  }

  async getPolls(meetingId: string): Promise<PollResult[]> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        return [];
      }

      return this.extractPolls(meeting);
    } catch (error) {
      this.logger.error(`Error getting polls: ${error.message}`);
      throw error;
    }
  }

  async getActivePolls(meetingId: string): Promise<PollResult[]> {
    try {
      const allPolls = await this.getPolls(meetingId);
      return allPolls.filter(poll => {
        if (poll.status !== 'active') return false;
        if (poll.endTime && new Date() > poll.endTime) {
          // Auto-close expired polls
          this.closePoll(meetingId, poll.id, 'system');
          return false;
        }
        return true;
      });
    } catch (error) {
      this.logger.error(`Error getting active polls: ${error.message}`);
      throw error;
    }
  }

  async getPollResults(meetingId: string, pollId: string, includeResponses: boolean = false): Promise<PollResult | null> {
    try {
      const poll = await this.getPoll(meetingId, pollId);
      if (!poll) return null;

      if (!includeResponses) {
        // Remove individual responses for privacy
        return {
          ...poll,
          responses: [],
        };
      }

      return poll;
    } catch (error) {
      this.logger.error(`Error getting poll results: ${error.message}`);
      throw error;
    }
  }

  async deletePoll(meetingId: string, pollId: string, deletedBy: string): Promise<void> {
    try {
      // Verify the user has permission to delete polls
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: {
          meetingId,
          userId: deletedBy,
        },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const polls = this.extractPolls(meeting);
      const updatedPolls = polls.filter(p => p.id !== pollId);

      const metadata = this.getMeetingMetadata(meeting);
      metadata.polls = updatedPolls.map(p => this.toJsonPoll(p));

      await this.prisma.videoMeeting.update({
        where: { id: meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });

      this.logger.log(`Poll ${pollId} deleted by ${deletedBy}`);
    } catch (error) {
      this.logger.error(`Error deleting poll: ${error.message}`);
      throw error;
    }
  }

  async getUserVote(meetingId: string, pollId: string, userId: string): Promise<string[] | null> {
    try {
      const poll = await this.getPoll(meetingId, pollId);
      if (!poll) return null;

      const userResponses = poll.responses.filter(r => r.userId === userId);
      return userResponses.map(r => r.optionId);
    } catch (error) {
      this.logger.error(`Error getting user vote: ${error.message}`);
      throw error;
    }
  }

  private extractPolls(meeting: VideoMeeting): PollResult[] {
    const metadata = this.getMeetingMetadata(meeting);
    const rawPolls = Array.isArray(metadata.polls) ? metadata.polls : [];
    return rawPolls.map(raw => this.fromJsonPoll(raw));
  }

  private getMeetingMetadata(meeting: any): Record<string, unknown> {
    if (!meeting || !meeting.metadata) {
      return {};
    }
    if (typeof meeting.metadata === 'object') {
      return { ...(meeting.metadata as Record<string, unknown>) };
    }
    if (typeof meeting.metadata === 'string') {
      try {
        const parsed = JSON.parse(meeting.metadata) as Record<string, unknown>;
        return { ...parsed };
      } catch {
        return {};
      }
    }
    return {};
  }

  private serializeMetadata(metadata: Record<string, unknown>): Prisma.InputJsonValue {
    return this.normalizeJson(metadata);
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

  private toJsonPoll(poll: PollResult): Record<string, unknown> {
    return {
      ...poll,
      createdAt: poll.createdAt.toISOString(),
      endTime: poll.endTime ? poll.endTime.toISOString() : null,
      responses: poll.responses.map(response => ({
        ...response,
        timestamp: response.timestamp.toISOString(),
      })),
    };
  }

  private fromJsonPoll(raw: unknown): PollResult {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        question: '',
        options: [],
        totalVotes: 0,
        status: 'active',
        createdAt: new Date(),
        responses: [],
      };
    }

    const rawPoll = raw as Record<string, unknown>;
    const options = Array.isArray(rawPoll.options)
      ? rawPoll.options.map(option => ({
          id: String((option as Record<string, unknown>).id ?? ''),
          text: String((option as Record<string, unknown>).text ?? ''),
          votes: Number((option as Record<string, unknown>).votes ?? 0),
          percentage: Number((option as Record<string, unknown>).percentage ?? 0),
        }))
      : [];

    const responses = Array.isArray(rawPoll.responses)
      ? rawPoll.responses.map(response => ({
          userId: String((response as Record<string, unknown>).userId ?? ''),
          userName: String((response as Record<string, unknown>).userName ?? ''),
          optionId: String((response as Record<string, unknown>).optionId ?? ''),
          timestamp: new Date(String((response as Record<string, unknown>).timestamp ?? new Date().toISOString())),
        }))
      : [];

    const endTimeValue = rawPoll.endTime;
    const endTime = typeof endTimeValue === 'string' ? new Date(endTimeValue) : undefined;

    const createdAtValue = rawPoll.createdAt;
    const createdAt = typeof createdAtValue === 'string' ? new Date(createdAtValue) : new Date();

    return {
      id: String(rawPoll.id ?? ''),
      question: String(rawPoll.question ?? ''),
      options,
      totalVotes: Number(rawPoll.totalVotes ?? 0),
      status: rawPoll.status === 'closed' ? 'closed' : 'active',
      createdAt,
      endTime,
      responses,
    };
  }
}
