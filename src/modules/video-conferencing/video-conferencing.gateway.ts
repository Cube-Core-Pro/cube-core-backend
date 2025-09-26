// path: backend/src/modules/video-conferencing/video-conferencing.gateway.ts
// purpose: WebSocket Gateway for real-time video conferencing features
// dependencies: @nestjs/websockets, socket.io, video-conferencing.service

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
import { VideoConferencingService } from './video-conferencing.service';
import { Logger } from '@nestjs/common';
import { RTCSessionDescriptionInit, RTCIceCandidateInit } from './webrtc-types';

interface MeetingSocket extends Socket {
  userId?: string;
  meetingId?: string;
  participantId?: string;
  tenantId?: string;
}

@WebSocketGateway({
  namespace: 'video-conferencing',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class VideoConferencingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('VideoConferencingGateway');

  constructor(private readonly videoConferencingService: VideoConferencingService) {}

  async handleConnection(client: MeetingSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: MeetingSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.meetingId && client.userId && client.tenantId) {
      // Handle participant leaving when disconnecting
      await this.videoConferencingService.leaveMeeting(client.userId, client.tenantId, client.meetingId);
      
      // Notify other participants
      client.to(`meeting:${client.meetingId}`).emit('participant-left', {
        userId: client.userId,
        participantId: client.participantId,
      });
    }
  }

  // Meeting Events
  @SubscribeMessage('join-meeting')
  async handleJoinMeeting(
    @MessageBody() data: { meetingId: string; userId: string; displayName: string; tenantId: string },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    try {
      const { meetingId, userId, displayName, tenantId } = data;
      
      // Join the meeting room
      await client.join(`meeting:${meetingId}`);
      client.meetingId = meetingId;
      client.userId = userId;
      client.tenantId = tenantId;
      
      // Add participant to meeting
      const participant = await this.videoConferencingService.joinMeeting(
        userId,
        tenantId,
        meetingId,
        { displayName },
      );
      
      client.participantId = participant.id;
      
      // Notify other participants
      client.to(`meeting:${meetingId}`).emit('participant-joined', {
        participant,
        userId,
      });
      
      // Send current meeting state to new participant
      const meeting = await this.videoConferencingService.getMeeting(userId, tenantId, meetingId);
      client.emit('meeting-state', meeting);
      
      return { success: true, participant };
    } catch (error) {
      this.logger.error('Error joining meeting:', error);
      client.emit('error', { message: 'Failed to join meeting' });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-meeting')
  async handleLeaveMeeting(
    @MessageBody() data: { meetingId: string },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    try {
      const { meetingId } = data;
      
      if (client.userId && client.tenantId) {
        await this.videoConferencingService.leaveMeeting(client.userId, client.tenantId, meetingId);
        
        // Notify other participants
        client.to(`meeting:${meetingId}`).emit('participant-left', {
          userId: client.userId,
          participantId: client.participantId,
        });
      }
      
      await client.leave(`meeting:${meetingId}`);
      client.meetingId = undefined;
      client.userId = undefined;
      client.participantId = undefined;
      client.tenantId = undefined;
      
      return { success: true };
    } catch (error) {
      this.logger.error('Error leaving meeting:', error);
      return { success: false, error: error.message };
    }
  }

  // WebRTC Signaling
  @SubscribeMessage('webrtc-offer')
  handleWebRTCOffer(
    @MessageBody() data: { targetUserId: string; offer: RTCSessionDescriptionInit },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    const { targetUserId, offer } = data;
    
    // Forward offer to target participant
    this.server.to(`meeting:${client.meetingId}`).emit('webrtc-offer', {
      fromUserId: client.userId,
      offer,
    });
  }

  @SubscribeMessage('webrtc-answer')
  handleWebRTCAnswer(
    @MessageBody() data: { targetUserId: string; answer: RTCSessionDescriptionInit },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    const { targetUserId, answer } = data;
    
    // Forward answer to target participant
    this.server.to(`meeting:${client.meetingId}`).emit('webrtc-answer', {
      fromUserId: client.userId,
      answer,
    });
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleWebRTCIceCandidate(
    @MessageBody() data: { targetUserId: string; candidate: RTCIceCandidateInit },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    const { targetUserId, candidate } = data;
    
    // Forward ICE candidate to target participant
    this.server.to(`meeting:${client.meetingId}`).emit('webrtc-ice-candidate', {
      fromUserId: client.userId,
      candidate,
    });
  }

  // Media Controls
  @SubscribeMessage('toggle-audio')
  handleToggleAudio(
    @MessageBody() data: { enabled: boolean },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Notify other participants about audio state change
    client.to(`meeting:${client.meetingId}`).emit('participant-audio-changed', {
      userId: client.userId,
      audioEnabled: data.enabled,
    });
  }

  @SubscribeMessage('toggle-video')
  handleToggleVideo(
    @MessageBody() data: { enabled: boolean },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Notify other participants about video state change
    client.to(`meeting:${client.meetingId}`).emit('participant-video-changed', {
      userId: client.userId,
      videoEnabled: data.enabled,
    });
  }

  @SubscribeMessage('start-screen-share')
  async handleStartScreenShare(@ConnectedSocket() client: MeetingSocket) {
    if (client.meetingId && client.userId && client.tenantId) {
      await this.videoConferencingService.startScreenShare(client.userId, client.tenantId, client.meetingId);
      
      // Notify other participants
      client.to(`meeting:${client.meetingId}`).emit('screen-share-started', {
        userId: client.userId,
      });
    }
  }

  @SubscribeMessage('stop-screen-share')
  async handleStopScreenShare(@ConnectedSocket() client: MeetingSocket) {
    if (client.meetingId && client.userId && client.tenantId) {
      await this.videoConferencingService.stopScreenShare(client.userId, client.tenantId, client.meetingId);
      
      // Notify other participants
      client.to(`meeting:${client.meetingId}`).emit('screen-share-stopped', {
        userId: client.userId,
      });
    }
  }

  // Chat Messages
  @SubscribeMessage('send-chat-message')
  handleSendChatMessage(
    @MessageBody() data: { message: string; type?: 'text' | 'emoji' },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Broadcast message to all participants
    this.server.to(`meeting:${client.meetingId}`).emit('chat-message', {
      userId: client.userId,
      participantId: client.participantId,
      message: data.message,
      type: data.type || 'text',
      timestamp: new Date().toISOString(),
    });
  }

  // Meeting Polls
  @SubscribeMessage('create-poll')
  handleCreatePoll(
    @MessageBody() data: { question: string; options: string[]; duration?: number },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Broadcast poll to all participants
    this.server.to(`meeting:${client.meetingId}`).emit('poll-created', {
      createdBy: client.userId,
      question: data.question,
      options: data.options,
      duration: data.duration,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('vote-poll')
  handleVotePoll(
    @MessageBody() data: { pollId: string; optionIndex: number },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Broadcast vote (without revealing who voted)
    client.to(`meeting:${client.meetingId}`).emit('poll-vote-cast', {
      pollId: data.pollId,
      optionIndex: data.optionIndex,
    });
  }

  // Reactions
  @SubscribeMessage('send-reaction')
  handleSendReaction(
    @MessageBody() data: { reaction: string },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    // Broadcast reaction to all participants
    client.to(`meeting:${client.meetingId}`).emit('participant-reaction', {
      userId: client.userId,
      reaction: data.reaction,
      timestamp: new Date().toISOString(),
    });
  }

  // Hand Raising
  @SubscribeMessage('raise-hand')
  handleRaiseHand(@ConnectedSocket() client: MeetingSocket) {
    client.to(`meeting:${client.meetingId}`).emit('hand-raised', {
      userId: client.userId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('lower-hand')
  handleLowerHand(@ConnectedSocket() client: MeetingSocket) {
    client.to(`meeting:${client.meetingId}`).emit('hand-lowered', {
      userId: client.userId,
    });
  }

  // Breakout Rooms
  @SubscribeMessage('join-breakout-room')
  async handleJoinBreakoutRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    try {
      if (client.meetingId && client.userId && client.tenantId) {
        await this.videoConferencingService.joinBreakoutRoom(
          client.userId,
          client.tenantId,
          client.meetingId,
          data.roomId,
        );
        
        // Join breakout room
        await client.join(`breakout:${data.roomId}`);
        
        // Notify main meeting and breakout room
        client.to(`meeting:${client.meetingId}`).emit('participant-joined-breakout', {
          userId: client.userId,
          roomId: data.roomId,
        });
        
        client.to(`breakout:${data.roomId}`).emit('participant-joined-breakout-room', {
          userId: client.userId,
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to join breakout room' });
    }
  }

  @SubscribeMessage('leave-breakout-room')
  async handleLeaveBreakoutRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: MeetingSocket,
  ) {
    try {
      if (client.meetingId && client.userId && client.tenantId) {
        await this.videoConferencingService.leaveBreakoutRoom(
          client.userId,
          client.tenantId,
          client.meetingId,
          data.roomId,
        );
        
        // Leave breakout room
        await client.leave(`breakout:${data.roomId}`);
        
        // Notify main meeting and breakout room
        client.to(`meeting:${client.meetingId}`).emit('participant-left-breakout', {
          userId: client.userId,
          roomId: data.roomId,
        });
        
        client.to(`breakout:${data.roomId}`).emit('participant-left-breakout-room', {
          userId: client.userId,
        });
      }
    } catch (error) {
      client.emit('error', { message: 'Failed to leave breakout room' });
    }
  }
}