// path: backend/src/modules/video-conferencing/services/meeting-chat.service.ts
// purpose: Service for managing meeting chat with Fortune500 features like moderation and compliance
// dependencies: @nestjs/common, prisma, real-time messaging, content filtering

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, VideoMeeting } from '@prisma/client';

export interface ChatMessage {
  id: string;
  meetingId: string;
  participantId: string;
  userId: string;
  userName: string;
  content: string;
  type: 'text' | 'emoji' | 'file' | 'poll' | 'system';
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  replyTo?: string;
  mentions?: string[];
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ChatReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface ChatSettings {
  enabled: boolean;
  participantsCanChat: boolean;
  participantsCanChatPrivately: boolean;
  participantsCanSendFiles: boolean;
  moderatorApproval: boolean;
  profanityFilter: boolean;
  allowEmojis: boolean;
  allowMentions: boolean;
  maxMessageLength: number;
  retentionDays: number;
}

export interface PrivateMessage {
  id: string;
  meetingId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  readAt?: Date;
}

@Injectable()
export class MeetingChatService {
  private readonly logger = new Logger(MeetingChatService.name);

  constructor(private prisma: PrismaService) {}

  async sendMessage(
    meetingId: string,
    participantId: string,
    userId: string,
    content: string,
    type: 'text' | 'emoji' | 'file' = 'text',
    replyTo?: string,
    mentions?: string[],
    attachments?: ChatAttachment[],
  ): Promise<ChatMessage> {
    try {
      // Verify participant is in meeting
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

      // Check chat permissions
      const chatSettings = await this.getChatSettings(meetingId);
      if (!chatSettings.enabled || !chatSettings.participantsCanChat) {
        throw new ForbiddenException('Chat is disabled for this meeting');
      }

      // Validate message content
      if (content.length > chatSettings.maxMessageLength) {
        throw new ForbiddenException(`Message exceeds maximum length of ${chatSettings.maxMessageLength} characters`);
      }

      // Apply profanity filter if enabled
      let filteredContent = content;
      if (chatSettings.profanityFilter) {
        filteredContent = this.filterProfanity(content);
      }

      // Create message
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const message: ChatMessage = {
        id: messageId,
        meetingId,
        participantId,
        userId,
  userName: participant.user.name || 'Participant',
        content: filteredContent,
        type,
        timestamp: new Date(),
        replyTo,
        mentions,
        attachments,
        reactions: [],
      };

      // Store message
      await this.storeMessage(message);

      this.logger.log(`Message sent by ${userId} in meeting ${meetingId}`);
      return message;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  async sendPrivateMessage(
    meetingId: string,
    fromUserId: string,
    toUserId: string,
    content: string,
  ): Promise<PrivateMessage> {
    try {
      // Verify both participants are in meeting
      const [fromParticipant, toParticipant] = await Promise.all([
        this.prisma.meetingParticipant.findFirst({
          where: { meetingId, userId: fromUserId },
          include: { user: { select: { name: true } } },
        }),
        this.prisma.meetingParticipant.findFirst({
          where: { meetingId, userId: toUserId },
          include: { user: { select: { name: true } } },
        }),
      ]);

      if (!fromParticipant || !toParticipant) {
        throw new NotFoundException('One or both participants not found in meeting');
      }

      // Check if private messaging is allowed
      const chatSettings = await this.getChatSettings(meetingId);
      if (!chatSettings.participantsCanChatPrivately) {
        throw new ForbiddenException('Private messaging is disabled for this meeting');
      }

      const messageId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const privateMessage: PrivateMessage = {
        id: messageId,
        meetingId,
        fromUserId,
  fromUserName: fromParticipant.user.name || 'Participant',
        toUserId,
  toUserName: toParticipant.user.name || 'Participant',
        content: chatSettings.profanityFilter ? this.filterProfanity(content) : content,
        timestamp: new Date(),
        read: false,
      };

      // Store private message
      await this.storePrivateMessage(privateMessage);

      this.logger.log(`Private message sent from ${fromUserId} to ${toUserId} in meeting ${meetingId}`);
      return privateMessage;
    } catch (error) {
      this.logger.error(`Error sending private message: ${error.message}`);
      throw error;
    }
  }

  async getMessages(
    meetingId: string,
    userId: string,
    limit: number = 50,
    before?: string,
  ): Promise<ChatMessage[]> {
    try {
      // Verify user is in meeting
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: { meetingId, userId },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      // Get messages from meeting metadata
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const messages = this.getStoredMessages(meeting);
      
      // Filter and sort messages
      let filteredMessages = messages.filter(msg => !msg.deleted);
      
      if (before) {
        const beforeIndex = filteredMessages.findIndex(msg => msg.id === before);
        if (beforeIndex > 0) {
          filteredMessages = filteredMessages.slice(0, beforeIndex);
        }
      }

      return filteredMessages
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }

  async getPrivateMessages(
    meetingId: string,
    userId: string,
    otherUserId: string,
  ): Promise<PrivateMessage[]> {
    try {
      // Verify user is in meeting
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: { meetingId, userId },
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

      const privateMessages = this.getStoredPrivateMessages(meeting);
      
      // Filter messages between the two users
      return privateMessages
        .filter(msg => 
          (msg.fromUserId === userId && msg.toUserId === otherUserId) ||
          (msg.fromUserId === otherUserId && msg.toUserId === userId)
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      this.logger.error(`Error getting private messages: ${error.message}`);
      throw error;
    }
  }

  async editMessage(
    meetingId: string,
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<ChatMessage> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const messages = this.getStoredMessages(meeting);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        throw new NotFoundException('Message not found');
      }

      const message = messages[messageIndex];

      // Check if user can edit this message
      if (message.userId !== userId) {
        throw new ForbiddenException('You can only edit your own messages');
      }

      // Check if message is too old to edit (e.g., 15 minutes)
      const editTimeLimit = 15 * 60 * 1000; // 15 minutes
      if (Date.now() - new Date(message.timestamp).getTime() > editTimeLimit) {
        throw new ForbiddenException('Message is too old to edit');
      }

      // Apply profanity filter
      const chatSettings = await this.getChatSettings(meetingId);
      const filteredContent = chatSettings.profanityFilter 
        ? this.filterProfanity(newContent) 
        : newContent;

      // Update message
      messages[messageIndex] = {
        ...message,
        content: filteredContent,
        edited: true,
        editedAt: new Date(),
      };

      // Store updated messages
      await this.updateStoredMessages(meeting, messages);

      this.logger.log(`Message ${messageId} edited by ${userId}`);
      return messages[messageIndex];
    } catch (error) {
      this.logger.error(`Error editing message: ${error.message}`);
      throw error;
    }
  }

  async deleteMessage(
    meetingId: string,
    messageId: string,
    deletedBy: string,
  ): Promise<void> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const messages = this.getStoredMessages(meeting);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        throw new NotFoundException('Message not found');
      }

      const message = messages[messageIndex];

      // Check if user can delete this message
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: { meetingId, userId: deletedBy },
      });

      const canDelete = message.userId === deletedBy || 
                       this.hasModeratorPermissions(participant);

      if (!canDelete) {
        throw new ForbiddenException('Insufficient permissions to delete message');
      }

      // Mark message as deleted
      messages[messageIndex] = {
        ...message,
        deleted: true,
        deletedAt: new Date(),
        deletedBy,
      };

      // Store updated messages
      await this.updateStoredMessages(meeting, messages);

      this.logger.log(`Message ${messageId} deleted by ${deletedBy}`);
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      throw error;
    }
  }

  async addReaction(
    meetingId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ChatMessage> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const participant = await this.prisma.meetingParticipant.findFirst({
        where: { meetingId, userId },
        include: { user: { select: { name: true } } },
      });

      if (!participant) {
        throw new NotFoundException('Participant not found in meeting');
      }

      const messages = this.getStoredMessages(meeting);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        throw new NotFoundException('Message not found');
      }

      const message = messages[messageIndex];
      if (!message.reactions) {
        message.reactions = [];
      }

      // Remove existing reaction from this user for this emoji
      message.reactions = message.reactions.filter(
        r => !(r.userId === userId && r.emoji === emoji)
      );

      // Add new reaction
      message.reactions.push({
        emoji,
        userId,
  userName: participant.user.name || 'Participant',
        timestamp: new Date(),
      });

      // Store updated messages
      await this.updateStoredMessages(meeting, messages);

      this.logger.log(`Reaction ${emoji} added to message ${messageId} by ${userId}`);
      return message;
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`);
      throw error;
    }
  }

  async removeReaction(
    meetingId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ChatMessage> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const messages = this.getStoredMessages(meeting);
      const messageIndex = messages.findIndex(msg => msg.id === messageId);

      if (messageIndex === -1) {
        throw new NotFoundException('Message not found');
      }

      const message = messages[messageIndex];
      if (message.reactions) {
        message.reactions = message.reactions.filter(
          r => !(r.userId === userId && r.emoji === emoji)
        );
      }

      // Store updated messages
      await this.updateStoredMessages(meeting, messages);

      this.logger.log(`Reaction ${emoji} removed from message ${messageId} by ${userId}`);
      return message;
    } catch (error) {
      this.logger.error(`Error removing reaction: ${error.message}`);
      throw error;
    }
  }

  async getChatSettings(meetingId: string): Promise<ChatSettings> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const metadata = this.getMeetingMetadata(meeting);
      return metadata.chatSettings || this.getDefaultChatSettings();
    } catch (error) {
      this.logger.error(`Error getting chat settings: ${error.message}`);
      throw error;
    }
  }

  async updateChatSettings(
    meetingId: string,
    settings: Partial<ChatSettings>,
    updatedBy: string,
  ): Promise<ChatSettings> {
    try {
      // Check if user has permission to update settings
      const participant = await this.prisma.meetingParticipant.findFirst({
        where: { meetingId, userId: updatedBy },
      });

      if (!participant || !this.hasModeratorPermissions(participant)) {
        throw new ForbiddenException('Insufficient permissions to update chat settings');
      }

      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const metadata = this.getMeetingMetadata(meeting);
      const currentSettings = metadata.chatSettings || this.getDefaultChatSettings();
      const updatedSettings = { ...currentSettings, ...settings };

      metadata.chatSettings = updatedSettings;

      await this.prisma.videoMeeting.update({
        where: { id: meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });

      this.logger.log(`Chat settings updated for meeting ${meetingId} by ${updatedBy}`);
      return updatedSettings;
    } catch (error) {
      this.logger.error(`Error updating chat settings: ${error.message}`);
      throw error;
    }
  }

  async getChatAnalytics(meetingId: string): Promise<{
    totalMessages: number;
    activeParticipants: number;
    messagesPerParticipant: Record<string, number>;
    messageTypes: Record<string, number>;
    timeline: { time: string; count: number }[];
  }> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: meetingId },
      });

      if (!meeting) {
        throw new NotFoundException('Meeting not found');
      }

      const messages = this.getStoredMessages(meeting).filter(msg => !msg.deleted);
      
      const analytics = {
        totalMessages: messages.length,
        activeParticipants: new Set(messages.map(msg => msg.userId)).size,
        messagesPerParticipant: messages.reduce((acc, msg) => {
          acc[msg.userName] = (acc[msg.userName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        messageTypes: messages.reduce((acc, msg) => {
          acc[msg.type] = (acc[msg.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        timeline: this.generateMessageTimeline(messages),
      };

      return analytics;
    } catch (error) {
      this.logger.error(`Error getting chat analytics: ${error.message}`);
      throw error;
    }
  }

  private async storeMessage(message: ChatMessage): Promise<void> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: message.meetingId },
      });

      if (!meeting) return;

      const metadata = this.getMeetingMetadata(meeting);
      const storedMessages = Array.isArray(metadata.chatMessages)
        ? (metadata.chatMessages as unknown[])
        : [];

      storedMessages.push(this.toJsonChatMessage(message));

      const trimmedMessages = storedMessages.slice(-500);
      metadata.chatMessages = trimmedMessages;

      await this.prisma.videoMeeting.update({
        where: { id: message.meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error storing message: ${error.message}`);
    }
  }

  private async storePrivateMessage(message: PrivateMessage): Promise<void> {
    try {
      const meeting = await this.prisma.videoMeeting.findUnique({
        where: { id: message.meetingId },
      });

      if (!meeting) return;

      const metadata = this.getMeetingMetadata(meeting);
      const storedMessages = Array.isArray(metadata.privateMessages)
        ? (metadata.privateMessages as unknown[])
        : [];

      storedMessages.push(this.toJsonPrivateMessage(message));

      metadata.privateMessages = storedMessages.slice(-200);

      await this.prisma.videoMeeting.update({
        where: { id: message.meetingId },
        data: {
          metadata: this.serializeMetadata(metadata),
        } as any,
      });
    } catch (error) {
      this.logger.error(`Error storing private message: ${error.message}`);
    }
  }

  private async updateStoredMessages(meeting: VideoMeeting, messages: ChatMessage[]): Promise<void> {
    const metadata = this.getMeetingMetadata(meeting);
    metadata.chatMessages = messages.map(msg => this.toJsonChatMessage(msg));

    await this.prisma.videoMeeting.update({
      where: { id: meeting.id },
      data: {
        metadata: this.serializeMetadata(metadata),
      } as any,
    });
  }

  private getStoredMessages(meeting: VideoMeeting): ChatMessage[] {
    const metadata = this.getMeetingMetadata(meeting);
    const rawMessages = Array.isArray(metadata.chatMessages) ? metadata.chatMessages : [];
    return rawMessages.map(raw => this.fromJsonChatMessage(raw));
  }

  private getStoredPrivateMessages(meeting: VideoMeeting): PrivateMessage[] {
    const metadata = this.getMeetingMetadata(meeting);
    const rawMessages = Array.isArray(metadata.privateMessages) ? metadata.privateMessages : [];
    return rawMessages.map(raw => this.fromJsonPrivateMessage(raw));
  }
  
  private getMeetingMetadata(meeting: any): Record<string, any> {
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

  private toJsonChatMessage(message: ChatMessage): Record<string, unknown> {
    return {
      ...message,
      timestamp: message.timestamp.toISOString(),
      editedAt: message.editedAt ? message.editedAt.toISOString() : null,
      deletedAt: message.deletedAt ? message.deletedAt.toISOString() : null,
      reactions: message.reactions?.map(reaction => ({
        ...reaction,
        timestamp: reaction.timestamp.toISOString(),
      })),
    };
  }

  private fromJsonChatMessage(raw: unknown): ChatMessage {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        meetingId: '',
        participantId: '',
        userId: '',
        userName: '',
        content: '',
        type: 'text',
        timestamp: new Date(),
        reactions: [],
      };
    }

    const rawMessage = raw as Record<string, unknown>;
    const reactions = Array.isArray(rawMessage.reactions)
      ? rawMessage.reactions.map(reaction => ({
          emoji: String((reaction as Record<string, unknown>).emoji ?? ''),
          userId: String((reaction as Record<string, unknown>).userId ?? ''),
          userName: String((reaction as Record<string, unknown>).userName ?? ''),
          timestamp: new Date(String((reaction as Record<string, unknown>).timestamp ?? new Date().toISOString())),
        }))
      : [];

    const attachments = Array.isArray(rawMessage.attachments)
      ? rawMessage.attachments.map(attachment => ({
          id: String((attachment as Record<string, unknown>).id ?? ''),
          name: String((attachment as Record<string, unknown>).name ?? ''),
          url: String((attachment as Record<string, unknown>).url ?? ''),
          size: Number((attachment as Record<string, unknown>).size ?? 0),
          mimeType: String((attachment as Record<string, unknown>).mimeType ?? ''),
        }))
      : undefined;

    const timestampValue = rawMessage.timestamp;
    const timestamp = typeof timestampValue === 'string' ? new Date(timestampValue) : new Date();

    const editedAtValue = rawMessage.editedAt;
    const editedAt = typeof editedAtValue === 'string' ? new Date(editedAtValue) : undefined;

    const deletedAtValue = rawMessage.deletedAt;
    const deletedAt = typeof deletedAtValue === 'string' ? new Date(deletedAtValue) : undefined;

    return {
      id: String(rawMessage.id ?? ''),
      meetingId: String(rawMessage.meetingId ?? ''),
      participantId: String(rawMessage.participantId ?? ''),
      userId: String(rawMessage.userId ?? ''),
      userName: String(rawMessage.userName ?? ''),
      content: String(rawMessage.content ?? ''),
      type: (['text', 'emoji', 'file', 'poll', 'system'] as ChatMessage['type'][]).includes(rawMessage.type as ChatMessage['type'])
        ? (rawMessage.type as ChatMessage['type'])
        : 'text',
      timestamp,
      edited: Boolean(rawMessage.edited),
      editedAt,
      deleted: Boolean(rawMessage.deleted),
      deletedAt,
      deletedBy: rawMessage.deletedBy ? String(rawMessage.deletedBy) : undefined,
      replyTo: rawMessage.replyTo ? String(rawMessage.replyTo) : undefined,
      mentions: Array.isArray(rawMessage.mentions)
        ? rawMessage.mentions.map(mention => String(mention))
        : undefined,
      attachments,
      reactions,
    };
  }

  private toJsonPrivateMessage(message: PrivateMessage): Record<string, unknown> {
    return {
      ...message,
      timestamp: message.timestamp.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : null,
    };
  }

  private fromJsonPrivateMessage(raw: unknown): PrivateMessage {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        meetingId: '',
        fromUserId: '',
        fromUserName: '',
        toUserId: '',
        toUserName: '',
        content: '',
        timestamp: new Date(),
        read: false,
      };
    }

    const rawMessage = raw as Record<string, unknown>;
    const timestampValue = rawMessage.timestamp;
    const timestamp = typeof timestampValue === 'string' ? new Date(timestampValue) : new Date();

    const readAtValue = rawMessage.readAt;
    const readAt = typeof readAtValue === 'string' ? new Date(readAtValue) : undefined;

    return {
      id: String(rawMessage.id ?? ''),
      meetingId: String(rawMessage.meetingId ?? ''),
      fromUserId: String(rawMessage.fromUserId ?? ''),
      fromUserName: String(rawMessage.fromUserName ?? ''),
      toUserId: String(rawMessage.toUserId ?? ''),
      toUserName: String(rawMessage.toUserName ?? ''),
      content: String(rawMessage.content ?? ''),
      timestamp,
      read: Boolean(rawMessage.read),
      readAt,
    };
  }

  private getDefaultChatSettings(): ChatSettings {
    return {
      enabled: true,
      participantsCanChat: true,
      participantsCanChatPrivately: true,
      participantsCanSendFiles: true,
      moderatorApproval: false,
      profanityFilter: true,
      allowEmojis: true,
      allowMentions: true,
      maxMessageLength: 1000,
      retentionDays: 30,
    };
  }

  private hasModeratorPermissions(participant: any): boolean {
    return participant?.role === 'HOST' || participant?.role === 'MODERATOR';
  }

  private filterProfanity(content: string): string {
    // Simple profanity filter - in production, use a more sophisticated service
    const profanityWords = ['spam', 'bad', 'inappropriate']; // Add actual words as needed
    let filtered = content;
    
    profanityWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    
    return filtered;
  }

  private generateMessageTimeline(messages: ChatMessage[]): { time: string; count: number }[] {
    const timeline: Record<string, number> = {};
    
    messages.forEach(message => {
      const hour = new Date(message.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      timeline[hour] = (timeline[hour] || 0) + 1;
    });

    return Object.entries(timeline)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
}
