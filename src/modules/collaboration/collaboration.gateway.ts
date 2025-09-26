// path: backend/src/modules/collaboration/collaboration.gateway.ts
// purpose: WebSocket gateway for real-time collaboration features
// dependencies: @nestjs/websockets, socket.io, redis, jwt

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { CollaborationSessionService } from './services/collaboration-session.service';
import { DocumentActivityService } from './services/document-activity.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  tenantId: string;
  documentId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/collaboration',
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly sessionService: CollaborationSessionService,
    private readonly activityService: DocumentActivityService,
  ) {
    // Subscribe to Redis for cross-instance broadcasting
    const redisClient = this.redis.getClient();
    if (redisClient) {
      redisClient.psubscribe('collaboration:*');
      redisClient.on('pmessage', (pattern, channel, message) => {
        const documentId = channel.split(':')[1];
        this.server.to(`document:${documentId}`).emit('document_change', JSON.parse(message));
      });
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.tenantId = payload.tenantId;

      this.logger.log(`Client connected: ${client.userId}`);
    } catch (error) {
      this.logger.error('Authentication failed', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.documentId) {
      await this.leaveDocument(client, { documentId: client.documentId });
    }
    this.logger.log(`Client disconnected: ${client.userId}`);
  }

  @SubscribeMessage('join_document')
  async joinDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string },
  ) {
    try {
      const { documentId } = data;
      
      // Join document room
      await client.join(`document:${documentId}`);
      client.documentId = documentId;

      // Update collaboration session
      await this.sessionService.updateSession(documentId, client.userId, {
        isActive: true,
        lastActivity: new Date(),
      });

      // Notify other collaborators
      client.to(`document:${documentId}`).emit('user_joined', {
        userId: client.userId,
        timestamp: new Date(),
      });

      // Log activity
      await this.activityService.logActivity({
        documentId,
        userId: client.userId,
        tenantId: client.tenantId,
        action: 'DOCUMENT_JOINED',
      });

      this.logger.log(`User ${client.userId} joined document ${documentId}`);
    } catch (error) {
      this.logger.error('Error joining document', error);
      client.emit('error', { message: 'Failed to join document' });
    }
  }

  @SubscribeMessage('leave_document')
  async leaveDocument(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string },
  ) {
    try {
      const { documentId } = data;
      
      // Leave document room
      await client.leave(`document:${documentId}`);
      client.documentId = undefined;

      // Update collaboration session
      await this.sessionService.updateSession(documentId, client.userId, {
        isActive: false,
        leftAt: new Date(),
      });

      // Notify other collaborators
      client.to(`document:${documentId}`).emit('user_left', {
        userId: client.userId,
        timestamp: new Date(),
      });

      // Log activity
      await this.activityService.logActivity({
        documentId,
        userId: client.userId,
        tenantId: client.tenantId,
        action: 'DOCUMENT_LEFT',
      });

      this.logger.log(`User ${client.userId} left document ${documentId}`);
    } catch (error) {
      this.logger.error('Error leaving document', error);
    }
  }

  @SubscribeMessage('cursor_update')
  async updateCursor(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; cursor: any },
  ) {
    try {
      const { documentId, cursor } = data;

      // Update session with cursor position
      await this.sessionService.updateSession(documentId, client.userId, {
        cursor,
        lastActivity: new Date(),
      });

      // Broadcast to other collaborators
      client.to(`document:${documentId}`).emit('cursor_updated', {
        userId: client.userId,
        cursor,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error updating cursor', error);
    }
  }

  @SubscribeMessage('selection_update')
  async updateSelection(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; selection: any },
  ) {
    try {
      const { documentId, selection } = data;

      // Update session with selection
      await this.sessionService.updateSession(documentId, client.userId, {
        selection,
        lastActivity: new Date(),
      });

      // Broadcast to other collaborators
      client.to(`document:${documentId}`).emit('selection_updated', {
        userId: client.userId,
        selection,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error updating selection', error);
    }
  }

  @SubscribeMessage('typing_start')
  async startTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string },
  ) {
    const { documentId } = data;
    
    client.to(`document:${documentId}`).emit('user_typing', {
      userId: client.userId,
      isTyping: true,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing_stop')
  async stopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string },
  ) {
    const { documentId } = data;
    
    client.to(`document:${documentId}`).emit('user_typing', {
      userId: client.userId,
      isTyping: false,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('comment_add')
  async addComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { documentId: string; comment: any },
  ) {
    try {
      const { documentId, comment } = data;

      // Log activity
      await this.activityService.logActivity({
        documentId,
        userId: client.userId,
        tenantId: client.tenantId,
        action: 'COMMENT_ADDED',
        details: comment,
      });

      // Broadcast to other collaborators
      client.to(`document:${documentId}`).emit('comment_added', {
        userId: client.userId,
        comment,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error adding comment', error);
    }
  }

  // Broadcast document changes to all connected clients
  async broadcastDocumentChange(documentId: string, change: any) {
    this.server.to(`document:${documentId}`).emit('document_change', change);
  }
}