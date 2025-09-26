// path: backend/src/office/office.gateway.ts
// purpose: WebSocket gateway for real-time collaboration features
// dependencies: WebSocket, Redis, authentication

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CollaborationService } from './services/collaboration.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  user?: any;
}

@WebSocketGateway({
  namespace: '/office',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class OfficeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OfficeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly collaborationService: CollaborationService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn('Client connected without token');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, tenantId: true, firstName: true, lastName: true, avatar: true }
      });

      if (!user) {
        this.logger.warn('Invalid user token');
        client.disconnect();
        return;
      }

      // Attach user info to socket
      client.userId = user.id;
      client.tenantId = user.tenantId;
      client.user = user;

      this.logger.log(`User ${user.firstName} ${user.lastName} connected to office namespace`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to Office collaboration',
        user: client.user,
      });

    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`User ${client.userId} disconnected from office namespace`);
      
      // Clean up presence data
      const presenceKeys = await this.redis.keys(`presence:*:${client.userId}`);
      if (presenceKeys.length > 0) {
        for (const key of presenceKeys) {
          await this.redis.del(key);
        }
      }

      // Notify other collaborators
      client.broadcast.emit('user-disconnected', {
        userId: client.userId,
        user: client.user,
      });
    }
  }

  @SubscribeMessage('join-document')
  async handleJoinDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string }
  ) {
    try {
      const { documentId } = data;

      // Verify user has access to document
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId: client.tenantId,
          OR: [
            { createdBy: client.userId },
            { shares: { some: { userId: client.userId } } }
          ]
        }
      });

      if (!document) {
        client.emit('error', { message: 'Document not found or access denied' });
        return;
      }

      // Join document room
      await client.join(`document:${documentId}`);

      // Update presence
      await this.collaborationService.updatePresence(
        client.tenantId!,
        client.userId!,
        documentId,
        { isOnline: true }
      );

      // Notify other collaborators
      client.to(`document:${documentId}`).emit('user-joined', {
        userId: client.userId,
        user: client.user,
        documentId,
      });

      // Send current collaborators to new user
      const collaborators = await this.collaborationService.getCollaborators(
        client.tenantId!,
        client.userId!,
        documentId
      );

      client.emit('document-joined', {
        documentId,
        collaborators,
      });

    } catch (error) {
      this.logger.error('Error joining document:', error);
      client.emit('error', { message: 'Failed to join document' });
    }
  }

  @SubscribeMessage('leave-document')
  async handleLeaveDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string }
  ) {
    try {
      const { documentId } = data;

      // Leave document room
      await client.leave(`document:${documentId}`);

      // Clean up presence
      const presenceKey = `presence:${documentId}:${client.userId}`;
      await this.redis.del(presenceKey);

      // Notify other collaborators
      client.to(`document:${documentId}`).emit('user-left', {
        userId: client.userId,
        user: client.user,
        documentId,
      });

    } catch (error) {
      this.logger.error('Error leaving document:', error);
    }
  }

  @SubscribeMessage('cursor-update')
  async handleCursorUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; cursor: any; selection?: any }
  ) {
    try {
      const { documentId, cursor, selection } = data;

      // Update presence with cursor position
      await this.collaborationService.updatePresence(
        client.tenantId!,
        client.userId!,
        documentId,
        { cursor, selection, isTyping: false }
      );

      // Broadcast cursor position to other collaborators
      client.to(`document:${documentId}`).emit('cursor-updated', {
        userId: client.userId,
        user: client.user,
        cursor,
        selection,
      });

    } catch (error) {
      this.logger.error('Error updating cursor:', error);
    }
  }

  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string }
  ) {
    try {
      const { documentId } = data;

      // Update presence with typing status
      await this.collaborationService.updatePresence(
        client.tenantId!,
        client.userId!,
        documentId,
        { isTyping: true }
      );

      // Broadcast typing status
      client.to(`document:${documentId}`).emit('user-typing', {
        userId: client.userId,
        user: client.user,
        isTyping: true,
      });

    } catch (error) {
      this.logger.error('Error handling typing start:', error);
    }
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string }
  ) {
    try {
      const { documentId } = data;

      // Update presence with typing status
      await this.collaborationService.updatePresence(
        client.tenantId!,
        client.userId!,
        documentId,
        { isTyping: false }
      );

      // Broadcast typing status
      client.to(`document:${documentId}`).emit('user-typing', {
        userId: client.userId,
        user: client.user,
        isTyping: false,
      });

    } catch (error) {
      this.logger.error('Error handling typing stop:', error);
    }
  }

  @SubscribeMessage('content-change')
  async handleContentChange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; changes: any[]; version?: number }
  ) {
    try {
      const { documentId, changes, version } = data;

      // Track changes
      await this.collaborationService.trackChanges(
        client.tenantId!,
        client.userId!,
        documentId,
        changes
      );

      // Broadcast changes to other collaborators
      client.to(`document:${documentId}`).emit('content-changed', {
        userId: client.userId,
        user: client.user,
        changes,
        version,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error handling content change:', error);
    }
  }

  @SubscribeMessage('comment-added')
  async handleCommentAdded(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; comment: any }
  ) {
    try {
      const { documentId, comment } = data;

      // Broadcast new comment to other collaborators
      client.to(`document:${documentId}`).emit('comment-added', {
        userId: client.userId,
        user: client.user,
        comment,
        documentId,
      });

    } catch (error) {
      this.logger.error('Error handling comment added:', error);
    }
  }

  @SubscribeMessage('comment-resolved')
  async handleCommentResolved(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; commentId: string }
  ) {
    try {
      const { documentId, commentId } = data;

      // Broadcast comment resolution to other collaborators
      client.to(`document:${documentId}`).emit('comment-resolved', {
        userId: client.userId,
        user: client.user,
        commentId,
        documentId,
      });

    } catch (error) {
      this.logger.error('Error handling comment resolved:', error);
    }
  }

  @SubscribeMessage('slideshow-control')
  async handleSlideshowControl(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; action: string; slideIndex?: number }
  ) {
    try {
      const { documentId, action, slideIndex } = data;

      // Broadcast slideshow control to other collaborators
      client.to(`document:${documentId}`).emit('slideshow-controlled', {
        userId: client.userId,
        user: client.user,
        action,
        slideIndex,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Error handling slideshow control:', error);
    }
  }

  @SubscribeMessage('request-sync')
  async handleRequestSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string }
  ) {
    try {
      const { documentId } = data;

      // Get latest document content
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId: client.tenantId,
          OR: [
            { createdBy: client.userId },
            { shares: { some: { userId: client.userId } } }
          ]
        }
      });

      if (document) {
        client.emit('sync-response', {
          documentId,
          content: document.content,
          version: document.version || 1,
          lastModified: document.updatedAt,
        });
      }

    } catch (error) {
      this.logger.error('Error handling sync request:', error);
    }
  }

  // Utility method to broadcast to document collaborators
  async broadcastToDocument(documentId: string, event: string, data: any, excludeUserId?: string) {
    if (excludeUserId) {
      this.server.to(`document:${documentId}`).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      this.server.to(`document:${documentId}`).emit(event, data);
    }
  }
}