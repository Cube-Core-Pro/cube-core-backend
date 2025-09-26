// path: backend/src/webmail/webmail.gateway.ts
// purpose: WebSocket gateway for real-time webmail features
// dependencies: Socket.IO, JWT auth, real-time notifications

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  email?: string;
}

@WebSocketGateway({
  namespace: '/webmail',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class WebmailGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebmailGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.tenantId = payload.tenantId;
      client.email = payload.email;

      // Add to connected users
      if (!this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, new Set());
      }
      this.connectedUsers.get(client.userId).add(client.id);

      // Join user-specific room
      client.join(`user:${client.userId}`);
      client.join(`tenant:${client.tenantId}`);

      // Update user presence
      await this.updateUserPresence(client.userId, 'online');

      // Send initial data
      await this.sendInitialData(client);

      this.logger.log(`WebMail client connected: ${client.userId} (${client.id})`);
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          await this.updateUserPresence(client.userId, 'offline');
        }
      }

      this.logger.log(`WebMail client disconnected: ${client.userId} (${client.id})`);
    }
  }

  @SubscribeMessage('join_mailbox')
  async handleJoinMailbox(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { mailboxId: string },
  ) {
    try {
      // Verify user has access to mailbox
      const mailbox = await this.prisma.emailMailbox.findFirst({
        where: {
          id: data.mailboxId,
          userId: client.userId,
          tenantId: client.tenantId,
        },
      });

      if (mailbox) {
        client.join(`mailbox:${data.mailboxId}`);
        client.emit('mailbox_joined', { mailboxId: data.mailboxId });
      } else {
        client.emit('error', { message: 'Mailbox not found or access denied' });
      }
    } catch (error) {
      this.logger.error('Error joining mailbox', error);
      client.emit('error', { message: 'Failed to join mailbox' });
    }
  }

  @SubscribeMessage('leave_mailbox')
  async handleLeaveMailbox(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { mailboxId: string },
  ) {
    client.leave(`mailbox:${data.mailboxId}`);
    client.emit('mailbox_left', { mailboxId: data.mailboxId });
  }

  @SubscribeMessage('mark_typing')
  async handleMarkTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { emailId?: string; isTyping: boolean },
  ) {
    if (data.emailId) {
      // Notify others that user is typing a reply
      client.to(`email:${data.emailId}`).emit('user_typing', {
        userId: client.userId,
        email: client.email,
        isTyping: data.isTyping,
        emailId: data.emailId,
      });
    }
  }

  @SubscribeMessage('request_sync')
  async handleRequestSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { mailboxId?: string },
  ) {
    try {
      // Trigger mailbox sync
      if (data.mailboxId) {
        await this.triggerMailboxSync(client.tenantId, client.userId, data.mailboxId);
      } else {
        await this.triggerAllMailboxSync(client.tenantId, client.userId);
      }

      client.emit('sync_requested', { mailboxId: data.mailboxId });
    } catch (error) {
      this.logger.error('Error requesting sync', error);
      client.emit('error', { message: 'Failed to request sync' });
    }
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const unreadCount = await this.getUnreadCount(client.tenantId, client.userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error('Error getting unread count', error);
    }
  }

  // Public methods for external services to emit events
  async notifyNewEmail(userId: string, email: any) {
    this.server.to(`user:${userId}`).emit('new_email', {
      email: {
        id: email.id,
        subject: email.subject,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        receivedAt: email.receivedAt,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        folderId: email.folderId,
        mailboxId: email.mailboxId,
      },
    });

    // Update unread count
    const unreadCount = await this.getUnreadCount(email.tenantId, userId);
    this.server.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
  }

  async notifyEmailRead(userId: string, emailIds: string[]) {
    this.server.to(`user:${userId}`).emit('emails_read', { emailIds });
    
    // Update unread count
    const unreadCount = await this.getUnreadCount(null, userId);
    this.server.to(`user:${userId}`).emit('unread_count', { count: unreadCount });
  }

  async notifyEmailMoved(userId: string, emailIds: string[], targetFolderId: string) {
    this.server.to(`user:${userId}`).emit('emails_moved', {
      emailIds,
      targetFolderId,
    });
  }

  async notifyEmailDeleted(userId: string, emailIds: string[]) {
    this.server.to(`user:${userId}`).emit('emails_deleted', { emailIds });
  }

  async notifySpamDetected(userId: string, email: any, spamResult: any) {
    this.server.to(`user:${userId}`).emit('spam_detected', {
      emailId: email.id,
      spamScore: spamResult.spamScore,
      actions: spamResult.actions,
    });
  }

  async notifyVirusDetected(userId: string, attachment: any, virusResult: any) {
    this.server.to(`user:${userId}`).emit('virus_detected', {
      attachmentId: attachment.id,
      filename: attachment.filename,
      threatName: virusResult.threatName,
      quarantined: true,
    });
  }

  async notifySyncProgress(userId: string, mailboxId: string, progress: {
    status: 'started' | 'progress' | 'completed' | 'error';
    processed?: number;
    total?: number;
    error?: string;
  }) {
    this.server.to(`user:${userId}`).emit('sync_progress', {
      mailboxId,
      ...progress,
    });
  }

  async notifyAiSuggestion(userId: string, suggestion: {
    type: 'smart_reply' | 'categorization' | 'action_items' | 'summary';
    emailId: string;
    suggestion: any;
  }) {
    this.server.to(`user:${userId}`).emit('ai_suggestion', suggestion);
  }

  async notifyCalendarEvent(userId: string, event: {
    type: 'created' | 'updated' | 'deleted' | 'reminder';
    event: any;
  }) {
    this.server.to(`user:${userId}`).emit('calendar_event', event);
  }

  async notifySecurityAlert(tenantId: string, alert: {
    type: 'spam_surge' | 'virus_detected' | 'suspicious_login' | 'policy_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: any;
  }) {
    this.server.to(`tenant:${tenantId}`).emit('security_alert', alert);
  }

  // Private helper methods
  private async updateUserPresence(userId: string, status: 'online' | 'offline') {
    try {
      const key = `webmail:presence:${userId}`;
      if (status === 'online') {
        await this.redis.setex(key, 300, JSON.stringify({
          status,
          lastSeen: new Date(),
        })); // 5 minutes TTL
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      this.logger.error('Error updating user presence', error);
    }
  }

  private async sendInitialData(client: AuthenticatedSocket) {
    try {
      // Send unread count
      const unreadCount = await this.getUnreadCount(client.tenantId, client.userId);
      client.emit('unread_count', { count: unreadCount });

      // Send recent notifications
      const notifications = await this.getRecentNotifications(client.tenantId, client.userId);
      client.emit('notifications', { notifications });

      // Send sync status
      const syncStatus = await this.getSyncStatus(client.tenantId, client.userId);
      client.emit('sync_status', syncStatus);

    } catch (error) {
      this.logger.error('Error sending initial data', error);
    }
  }

  private async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    try {
      const mailboxes = await this.prisma.emailMailbox.findMany({
        where: { tenantId, userId },
        select: { id: true },
      });

      if (!mailboxes.length) {
        return 0;
      }

      const mailboxIds = mailboxes.map((mailbox) => mailbox.id);

      return await this.prisma.email.count({
        where: {
          tenantId,
          mailboxId: { in: mailboxIds },
          isRead: false,
          isDeleted: false,
        },
      });
    } catch (error) {
      this.logger.error('Error getting unread count', error);
      return 0;
    }
  }

  private async getRecentNotifications(tenantId: string, userId: string) {
    try {
      return await this.prisma.notification.findMany({
        where: {
          tenantId,
          type: {
            in: ['EMAIL_RECEIVED', 'SPAM_DETECTED', 'VIRUS_DETECTED', 'SYNC_COMPLETED'],
          },
          userNotifications: {
            some: {
              userId,
              isRead: false,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } catch (error) {
      this.logger.error('Error getting recent notifications', error);
      return [];
    }
  }

  private async getSyncStatus(tenantId: string, userId: string) {
    try {
      const mailboxes = await this.prisma.emailAccount.findMany({
        where: {
          tenantId,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          lastSync: true,
        },
      });

      return {
        mailboxes: mailboxes.map(mailbox => ({
          id: mailbox.id,
          email: mailbox.email,
          lastSync: mailbox.lastSync,
          status: 'idle', // Default status since syncStatus doesn't exist in EmailAccount
        })),
      };
    } catch (error) {
      this.logger.error('Error getting sync status', error);
      return { mailboxes: [] };
    }
  }

  private async triggerMailboxSync(tenantId: string, userId: string, mailboxId: string) {
    // This would trigger the actual sync process
    // For now, just emit a sync started event
    this.notifySyncProgress(userId, mailboxId, { status: 'started' });
  }

  private async triggerAllMailboxSync(tenantId: string, userId: string) {
    try {
      const mailboxes = await this.prisma.emailAccount.findMany({
        where: {
          tenantId,
          userId,
          isActive: true,
        },
        select: { id: true },
      });

      for (const mailbox of mailboxes) {
        await this.triggerMailboxSync(tenantId, userId, mailbox.id);
      }
    } catch (error) {
      this.logger.error('Error triggering all mailbox sync', error);
    }
  }

  // Utility method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Broadcast to all connected users in a tenant
  broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
