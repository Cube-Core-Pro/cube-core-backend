// path: backend/src/modules/collaboration/services/messaging.service.ts
// purpose: Real-time messaging service for enterprise collaboration
// dependencies: @nestjs/common, websockets, prisma, redis

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface ChatMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'emoji' | 'system';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  channelId: string;
  threadId?: string;
  replyToId?: string;
  mentions: string[];
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  metadata: MessageMetadata;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'document' | 'video' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

export interface MessageMetadata {
  deviceType?: 'web' | 'mobile' | 'desktop';
  location?: string;
  isEncrypted: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'public' | 'private' | 'announcement';
  workspaceId: string;
  members: ChannelMember[];
  settings: ChannelSettings;
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: Date;
  lastReadAt: Date;
  isMuted: boolean;
  notifications: 'all' | 'mentions' | 'none';
}

export interface ChannelSettings {
  isArchived: boolean;
  isLocked: boolean;
  allowFiles: boolean;
  allowImages: boolean;
  allowReactions: boolean;
  allowThreads: boolean;
  retentionDays?: number;
  moderationLevel: 'none' | 'basic' | 'strict';
}

export interface MessageThread {
  id: string;
  parentMessageId: string;
  channelId: string;
  title?: string;
  participants: string[];
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  customMessage?: string;
  lastSeen: Date;
  isTyping: boolean;
  currentChannel?: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async sendMessage(
    senderId: string,
    tenantId: string,
    messageData: {
      content: string;
      type?: 'text' | 'image' | 'file' | 'emoji';
      channelId: string;
      threadId?: string;
      replyToId?: string;
      mentions?: string[];
      attachments?: MessageAttachment[];
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
  ): Promise<ChatMessage> {
    try {
      // Validate channel access
      const hasAccess = await this.checkChannelAccess(messageData.channelId, senderId, tenantId);
      if (!hasAccess) {
        throw new ForbiddenException('No access to this channel');
      }

      // Check if channel allows the message type
      const channel = await this.getChannel(messageData.channelId, senderId, tenantId);
      if (!channel) {
        throw new NotFoundException('Channel not found');
      }

      if (channel.settings.isLocked) {
        throw new BadRequestException('Channel is locked');
      }

      // Validate attachments
      if (messageData.attachments && !channel.settings.allowFiles) {
        throw new BadRequestException('Files not allowed in this channel');
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get sender info
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true, avatar: true },
      });

      // Process mentions
      const mentions = await this.processMentions(messageData.content, messageData.mentions || []);

      // Create message
      const message: ChatMessage = {
        id: messageId,
        content: messageData.content,
        type: messageData.type || 'text',
        senderId,
        senderName: sender?.name || 'Unknown User',
        senderAvatar: sender?.avatar,
        channelId: messageData.channelId,
        threadId: messageData.threadId,
        replyToId: messageData.replyToId,
        mentions: mentions,
        reactions: [],
        attachments: messageData.attachments || [],
        metadata: {
          isEncrypted: true,
          priority: messageData.priority || 'normal',
          tags: [],
        },
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.prisma.chatMessage.create({
        data: {
          id: messageId,
          content: message.content,
          type: message.type,
          senderId,
          channelId: messageData.channelId,
          threadId: messageData.threadId,
          replyToId: messageData.replyToId,
          mentions: mentions,
          attachments: messageData.attachments || [],
          metadata: message.metadata,
          tenantId,
          createdAt: message.createdAt,
        },
      });

      // Update channel's last message
      await this.updateChannelLastMessage(messageData.channelId, message);

      // Cache message for real-time access
      await this.redis.setex(`message:${messageId}`, 3600, JSON.stringify(message));

      // Publish to channel subscribers
      await this.publishMessage(messageData.channelId, message);

      // Send push notifications for mentions
      if (mentions.length > 0) {
        await this.sendMentionNotifications(mentions, message);
      }

      // Update user activity
      await this.updateUserActivity(senderId);

      this.logger.log(`Message sent: ${messageId} to channel ${messageData.channelId}`);
      return message;
    } catch (error) {
      this.logger.error('Error sending message', error);
      throw error;
    }
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      threadId?: string;
      before?: Date;
      after?: Date;
      searchQuery?: string;
    } = {}
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    try {
      // Check channel access
      const hasAccess = await this.checkChannelAccess(channelId, userId, tenantId);
      if (!hasAccess) {
        throw new ForbiddenException('No access to this channel');
      }

      const limit = Math.min(options.limit || 50, 100);
      const offset = options.offset || 0;

      const where = {
        channelId,
        tenantId,
        isDeleted: false,
        ...(options.threadId && { threadId: options.threadId }),
        ...(options.before && { createdAt: { lt: options.before } }),
        ...(options.after && { createdAt: { gt: options.after } }),
        ...(options.searchQuery && {
          content: { contains: options.searchQuery, mode: 'insensitive' as any },
        }),
      };

      const [messages, total] = await Promise.all([
        this.prisma.chatMessage.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            sender: {
              select: { id: true, name: true, avatar: true },
            },
          },
        }),
        this.prisma.chatMessage.count({ where }),
      ]);

      const formattedMessages = messages.map(msg => this.formatMessage(msg));
      
      // Mark messages as read
      await this.markMessagesAsRead(channelId, userId, formattedMessages.map(m => m.id));

      return {
        messages: formattedMessages.reverse(), // Return in chronological order
        hasMore: total > offset + messages.length,
      };
    } catch (error) {
      this.logger.error('Error getting channel messages', error);
      throw error;
    }
  }

  async createChannel(
    userId: string,
    tenantId: string,
    channelData: {
      name: string;
      description?: string;
      type: 'direct' | 'group' | 'public' | 'private';
      memberIds?: string[];
      settings?: Partial<ChannelSettings>;
    }
  ): Promise<ChatChannel> {
    try {
      const channelId = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // For direct messages, ensure only 2 members
      if (channelData.type === 'direct' && channelData.memberIds?.length !== 1) {
        throw new BadRequestException('Direct message must have exactly 2 participants');
      }

      const members: ChannelMember[] = [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
          lastReadAt: new Date(),
          isMuted: false,
          notifications: 'all',
        },
      ];

      // Add other members
      if (channelData.memberIds) {
        for (const memberId of channelData.memberIds) {
          if (memberId !== userId) {
            members.push({
              userId: memberId,
              role: 'member',
              joinedAt: new Date(),
              lastReadAt: new Date(),
              isMuted: false,
              notifications: 'all',
            });
          }
        }
      }

      const channel: ChatChannel = {
        id: channelId,
        name: channelData.name,
        description: channelData.description,
        type: channelData.type,
        workspaceId: tenantId,
        members,
        settings: {
          isArchived: false,
          isLocked: false,
          allowFiles: true,
          allowImages: true,
          allowReactions: true,
          allowThreads: true,
          moderationLevel: 'basic',
          ...channelData.settings,
        },
        unreadCount: 0,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.prisma.chatChannel.create({
        data: {
          id: channelId,
          name: channel.name,
          description: channel.description,
          type: channel.type,
          workspaceId: tenantId,
          members: members,
          settings: channel.settings,
          createdBy: userId,
          tenantId,
          createdAt: channel.createdAt,
        },
      });

      // Cache channel
      await this.redis.setex(`channel:${channelId}`, 1800, JSON.stringify(channel));

      // Add members to channel subscriber lists
      for (const member of members) {
        await this.redis.sadd(`channel:${channelId}:members`, member.userId);
        await this.redis.sadd(`user:${member.userId}:channels`, channelId);
      }

      this.logger.log(`Channel created: ${channelId} by ${userId}`);
      return channel;
    } catch (error) {
      this.logger.error('Error creating channel', error);
      throw error;
    }
  }

  async joinChannel(
    channelId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const channel = await this.getChannel(channelId, userId, tenantId, false);
      if (!channel) {
        throw new NotFoundException('Channel not found');
      }

      // Check if already a member
      const isMember = channel.members.some(m => m.userId === userId);
      if (isMember) {
        throw new BadRequestException('Already a member of this channel');
      }

      // Check if channel is public or user is invited
      if (channel.type === 'private') {
        throw new ForbiddenException('Cannot join private channel without invitation');
      }

      // Add user as member
      const newMember: ChannelMember = {
        userId,
        role: 'member',
        joinedAt: new Date(),
        lastReadAt: new Date(),
        isMuted: false,
        notifications: 'all',
      };

      channel.members.push(newMember);

      // Update database
      await this.prisma.chatChannel.update({
        where: { id: channelId },
        data: {
          members: channel.members,
          updatedAt: new Date(),
        },
      });

      // Update caches
      await this.redis.setex(`channel:${channelId}`, 1800, JSON.stringify(channel));
      await this.redis.sadd(`channel:${channelId}:members`, userId);
      await this.redis.sadd(`user:${userId}:channels`, channelId);

      // Send system message
      await this.sendSystemMessage(channelId, tenantId, `User joined the channel`, userId);

      this.logger.log(`User ${userId} joined channel ${channelId}`);
    } catch (error) {
      this.logger.error('Error joining channel', error);
      throw error;
    }
  }

  async addReaction(
    messageId: string,
    userId: string,
    tenantId: string,
    emoji: string
  ): Promise<ChatMessage> {
    try {
      // Get message
      const message = await this.getMessage(messageId, userId, tenantId);
      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Check channel access
      const hasAccess = await this.checkChannelAccess(message.channelId, userId, tenantId);
      if (!hasAccess) {
        throw new ForbiddenException('No access to this message');
      }

      // Find existing reaction
      const reaction = message.reactions.find(r => r.emoji === emoji);
      
      if (reaction) {
        // Toggle reaction
        if (reaction.users.includes(userId)) {
          reaction.users = reaction.users.filter(u => u !== userId);
          reaction.count = reaction.users.length;
          
          // Remove reaction if no users left
          if (reaction.count === 0) {
            message.reactions = message.reactions.filter(r => r.emoji !== emoji);
          }
        } else {
          reaction.users.push(userId);
          reaction.count = reaction.users.length;
        }
      } else {
        // Add new reaction
        message.reactions.push({
          emoji,
          users: [userId],
          count: 1,
        });
      }

      // Update database
      await this.prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          reactions: message.reactions,
          updatedAt: new Date(),
        },
      });

      // Update cache
      await this.redis.setex(`message:${messageId}`, 3600, JSON.stringify(message));

      // Publish reaction update
      await this.publishReactionUpdate(message.channelId, messageId, message.reactions);

      return message;
    } catch (error) {
      this.logger.error('Error adding reaction', error);
      throw error;
    }
  }

  async updatePresence(
    userId: string,
    status: 'online' | 'away' | 'busy' | 'offline',
    customMessage?: string
  ): Promise<void> {
    try {
      const presence: PresenceStatus = {
        userId,
        status,
        customMessage,
        lastSeen: new Date(),
        isTyping: false,
      };

      // Store in Redis with TTL
      await this.redis.setex(
        `presence:${userId}`,
        300, // 5 minutes
        JSON.stringify(presence)
      );

      // Publish presence update to all user's channels
      const userChannels = await this.redis.smembers(`user:${userId}:channels`);
      for (const channelId of userChannels) {
        await this.publishPresenceUpdate(channelId, presence);
      }

      this.logger.debug(`Presence updated for user ${userId}: ${status}`);
    } catch (error) {
      this.logger.error('Error updating presence', error);
    }
  }

  async setTypingStatus(
    userId: string,
    channelId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const key = `typing:${channelId}:${userId}`;
      
      if (isTyping) {
        await this.redis.setex(key, 10, '1'); // 10 seconds timeout
      } else {
        await this.redis.del(key);
      }

      // Publish typing status
      await this.publishTypingStatus(channelId, userId, isTyping);
    } catch (error) {
      this.logger.error('Error setting typing status', error);
    }
  }

  async searchMessages(
    userId: string,
    tenantId: string,
    query: string,
    options: {
      channelIds?: string[];
      fromUserId?: string;
      dateRange?: { start: Date; end: Date };
      messageType?: string;
      limit?: number;
    } = {}
  ): Promise<ChatMessage[]> {
    try {
      // Get user's accessible channels
      const userChannels = await this.getUserChannels(userId, tenantId);
      const accessibleChannelIds = userChannels.map(c => c.id);
      
      const channelIds = options.channelIds?.filter(id => 
        accessibleChannelIds.includes(id)
      ) || accessibleChannelIds;

      const where = {
        channelId: { in: channelIds },
        tenantId,
        isDeleted: false,
        content: { contains: query, mode: 'insensitive' as any },
        ...(options.fromUserId && { senderId: options.fromUserId }),
        ...(options.messageType && { type: options.messageType }),
        ...(options.dateRange && {
          createdAt: {
            gte: options.dateRange.start,
            lte: options.dateRange.end,
          },
        }),
      };

      const messages = await this.prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          channel: {
            select: { id: true, name: true, type: true },
          },
        },
      });

      return messages.map(msg => this.formatMessage(msg));
    } catch (error) {
      this.logger.error('Error searching messages', error);
      return [];
    }
  }

  private async checkChannelAccess(
    channelId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      const isMember = await this.redis.sismember(`channel:${channelId}:members`, userId);
      if (isMember) return true;

      // Fall back to database check
      const channel = await this.prisma.chatChannel.findFirst({
        where: { id: channelId, tenantId },
        select: { members: true, type: true },
      });

      if (!channel) return false;

      const members = channel.members as ChannelMember[];
      return members.some(m => m.userId === userId) || channel.type === 'public';
    } catch (error) {
      this.logger.error('Error checking channel access', error);
      return false;
    }
  }

  private async getChannel(
    channelId: string,
    userId: string,
    tenantId: string,
    checkAccess: boolean = true
  ): Promise<ChatChannel | null> {
    try {
      if (checkAccess) {
        const hasAccess = await this.checkChannelAccess(channelId, userId, tenantId);
        if (!hasAccess) return null;
      }

      // Try cache first
      const cached = await this.redis.get(`channel:${channelId}`);
      if (cached) {
        return JSON.parse(cached) as ChatChannel;
      }

      // Fall back to database
      const channel = await this.prisma.chatChannel.findFirst({
        where: { id: channelId, tenantId },
      });

      if (channel) {
        const formatted = this.formatChannel(channel);
        await this.redis.setex(`channel:${channelId}`, 1800, JSON.stringify(formatted));
        return formatted;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting channel', error);
      return null;
    }
  }

  private async getMessage(
    messageId: string,
    userId: string,
    tenantId: string
  ): Promise<ChatMessage | null> {
    try {
      // Try cache first
      const cached = await this.redis.get(`message:${messageId}`);
      if (cached) {
        return JSON.parse(cached) as ChatMessage;
      }

      // Fall back to database
      const message = await this.prisma.chatMessage.findFirst({
        where: { id: messageId, tenantId },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return message ? this.formatMessage(message) : null;
    } catch (error) {
      this.logger.error('Error getting message', error);
      return null;
    }
  }

  private async getUserChannels(userId: string, tenantId: string): Promise<ChatChannel[]> {
    try {
      const channels = await this.prisma.chatChannel.findMany({
        where: {
          tenantId,
          members: {
            path: '$[*].userId',
            array_contains: userId,
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return channels.map(c => this.formatChannel(c));
    } catch (error) {
      this.logger.error('Error getting user channels', error);
      return [];
    }
  }

  private formatMessage(message: any): ChatMessage {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: message.senderId,
      senderName: message.sender?.name || 'Unknown User',
      senderAvatar: message.sender?.avatar,
      channelId: message.channelId,
      threadId: message.threadId,
      replyToId: message.replyToId,
      mentions: message.mentions || [],
      reactions: message.reactions || [],
      attachments: message.attachments || [],
      metadata: message.metadata || {},
      isEdited: message.isEdited || false,
      isDeleted: message.isDeleted || false,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  private formatChannel(channel: any): ChatChannel {
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      type: channel.type,
      workspaceId: channel.workspaceId,
      members: channel.members || [],
      settings: channel.settings || {},
      unreadCount: 0, // This would be calculated dynamically
      createdBy: channel.createdBy,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private async processMentions(content: string, explicitMentions: string[]): Promise<string[]> {
    const mentions = new Set(explicitMentions);
    
    // Extract @username mentions from content
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      // Look up user ID by username
      const user = await this.prisma.user.findFirst({
        where: { name: { equals: username, mode: 'insensitive' as any } },
        select: { id: true },
      });
      
      if (user) {
        mentions.add(user.id);
      }
    }

    return Array.from(mentions);
  }

  private async updateChannelLastMessage(channelId: string, message: ChatMessage): Promise<void> {
    try {
      await this.prisma.chatChannel.update({
        where: { id: channelId },
        data: {
          lastMessageAt: message.createdAt,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn('Failed to update channel last message', error);
    }
  }

  private async markMessagesAsRead(
    channelId: string,
    userId: string,
    messageIds: string[]
  ): Promise<void> {
    try {
      // Update user's last read timestamp for the channel
      await this.redis.hset(
        `user:${userId}:read_status`,
        channelId,
        new Date().toISOString()
      );

      // Update channel member's lastReadAt
      const channel = await this.getChannel(channelId, userId, '', false);
      if (channel) {
        const member = channel.members.find(m => m.userId === userId);
        if (member) {
          member.lastReadAt = new Date();
          
          await this.prisma.chatChannel.update({
            where: { id: channelId },
            data: { members: channel.members },
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to mark messages as read', error);
    }
  }

  private async sendSystemMessage(
    channelId: string,
    tenantId: string,
    content: string,
    aboutUserId?: string
  ): Promise<void> {
    try {
      const systemMessage: Partial<ChatMessage> = {
        content,
        type: 'system',
        senderId: 'system',
        senderName: 'System',
        channelId,
        mentions: aboutUserId ? [aboutUserId] : [],
        reactions: [],
        attachments: [],
        metadata: {
          isEncrypted: false,
          priority: 'normal',
          tags: ['system'],
        },
        isEdited: false,
        isDeleted: false,
        createdAt: new Date(),
      };

      await this.publishMessage(channelId, systemMessage as ChatMessage);
    } catch (error) {
      this.logger.warn('Failed to send system message', error);
    }
  }

  private async updateUserActivity(userId: string): Promise<void> {
    try {
      await this.redis.setex(`activity:${userId}`, 300, new Date().toISOString());
    } catch (error) {
      this.logger.warn('Failed to update user activity', error);
    }
  }

  private async publishMessage(channelId: string, message: ChatMessage): Promise<void> {
    try {
      await this.redis.publish(
        `channel:${channelId}:messages`,
        JSON.stringify({
          type: 'new_message',
          data: message,
        })
      );
    } catch (error) {
      this.logger.warn('Failed to publish message', error);
    }
  }

  private async publishReactionUpdate(
    channelId: string,
    messageId: string,
    reactions: MessageReaction[]
  ): Promise<void> {
    try {
      await this.redis.publish(
        `channel:${channelId}:messages`,
        JSON.stringify({
          type: 'reaction_update',
          data: { messageId, reactions },
        })
      );
    } catch (error) {
      this.logger.warn('Failed to publish reaction update', error);
    }
  }

  private async publishPresenceUpdate(channelId: string, presence: PresenceStatus): Promise<void> {
    try {
      await this.redis.publish(
        `channel:${channelId}:presence`,
        JSON.stringify({
          type: 'presence_update',
          data: presence,
        })
      );
    } catch (error) {
      this.logger.warn('Failed to publish presence update', error);
    }
  }

  private async publishTypingStatus(
    channelId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      await this.redis.publish(
        `channel:${channelId}:typing`,
        JSON.stringify({
          type: 'typing_status',
          data: { userId, isTyping },
        })
      );
    } catch (error) {
      this.logger.warn('Failed to publish typing status', error);
    }
  }

  private async sendMentionNotifications(
    mentionedUserIds: string[],
    message: ChatMessage
  ): Promise<void> {
    try {
      // This would integrate with the notification service
      for (const userId of mentionedUserIds) {
        this.logger.debug(`Sending mention notification to user ${userId}`);
        // await this.notificationService.sendMentionNotification(userId, message);
      }
    } catch (error) {
      this.logger.warn('Failed to send mention notifications', error);
    }
  }
}