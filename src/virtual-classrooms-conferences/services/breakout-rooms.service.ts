import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface BreakoutParticipant {
  participantId: string;
  joinedAt: string;
  role: 'host' | 'cohost' | 'participant';
}

export interface BreakoutRoom {
  roomId: string;
  sessionId: string;
  name: string;
  createdAt: string;
  assignments: BreakoutParticipant[];
  isLocked: boolean;
}

export interface BreakoutSessionSnapshot {
  breakoutSessionId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  rooms: BreakoutRoom[];
  status: 'draft' | 'live' | 'closed';
  autoAssign: boolean;
}

interface BreakoutSessionState extends BreakoutSessionSnapshot {
  rooms: BreakoutRoom[];
}

@Injectable()
export class BreakoutRoomsService {
  private readonly breakoutSessions = new Map<string, BreakoutSessionState>();

  createBreakoutSession(
    sessionId: string,
    rooms: Array<{ name: string; isLocked?: boolean }>,
    autoAssign = false,
  ): BreakoutSessionSnapshot {
    const now = new Date().toISOString();
    const breakoutSessionId = randomUUID();

    const state: BreakoutSessionState = {
      breakoutSessionId,
      sessionId,
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      autoAssign,
      rooms: rooms.map((room) => ({
        roomId: randomUUID(),
        sessionId,
        name: room.name,
        createdAt: now,
        assignments: [],
        isLocked: Boolean(room.isLocked),
      })),
    };

    this.breakoutSessions.set(breakoutSessionId, state);
    return this.toSnapshot(state);
  }

  startBreakout(breakoutSessionId: string) {
    const session = this.requireBreakoutSession(breakoutSessionId);
    session.status = 'live';
    session.updatedAt = new Date().toISOString();
    return this.toSnapshot(session);
  }

  closeBreakout(breakoutSessionId: string) {
    const session = this.requireBreakoutSession(breakoutSessionId);
    session.status = 'closed';
    session.updatedAt = new Date().toISOString();
    return this.toSnapshot(session);
  }

  assignParticipant(
    breakoutSessionId: string,
    roomId: string,
    participantId: string,
    role: BreakoutParticipant['role'] = 'participant',
  ) {
    const session = this.requireBreakoutSession(breakoutSessionId);
    const room = this.requireRoom(session, roomId);
    const now = new Date().toISOString();

    room.assignments = room.assignments.filter((assignment) => assignment.participantId !== participantId);
    room.assignments.push({ participantId, joinedAt: now, role });
    session.updatedAt = now;
    return this.toSnapshot(session);
  }

  moveParticipant(
    breakoutSessionId: string,
    fromRoomId: string,
    toRoomId: string,
    participantId: string,
  ) {
    const session = this.requireBreakoutSession(breakoutSessionId);
    const fromRoom = this.requireRoom(session, fromRoomId);
    const toRoom = this.requireRoom(session, toRoomId);

    const participant = fromRoom.assignments.find((assignment) => assignment.participantId === participantId);
    if (!participant) {
      throw new NotFoundException(`Participant ${participantId} not found in room ${fromRoomId}`);
    }

    fromRoom.assignments = fromRoom.assignments.filter((assignment) => assignment.participantId !== participantId);
    toRoom.assignments.push({ ...participant, joinedAt: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    return this.toSnapshot(session);
  }

  toggleRoomLock(breakoutSessionId: string, roomId: string, isLocked: boolean) {
    const session = this.requireBreakoutSession(breakoutSessionId);
    const room = this.requireRoom(session, roomId);
    room.isLocked = isLocked;
    session.updatedAt = new Date().toISOString();
    return this.toSnapshot(session);
  }

  getBreakoutSession(breakoutSessionId: string): BreakoutSessionSnapshot {
    return this.toSnapshot(this.requireBreakoutSession(breakoutSessionId));
  }

  listBreakoutsBySession(sessionId: string): BreakoutSessionSnapshot[] {
    return Array.from(this.breakoutSessions.values())
      .filter((session) => session.sessionId === sessionId)
      .map((session) => this.toSnapshot(session));
  }

  getLiveBreakoutCount(): number {
    let count = 0;
    for (const session of this.breakoutSessions.values()) {
      if (session.status === 'live') {
        count += 1;
      }
    }
    return count;
  }

  private requireBreakoutSession(breakoutSessionId: string): BreakoutSessionState {
    const session = this.breakoutSessions.get(breakoutSessionId);
    if (!session) {
      throw new NotFoundException(`Breakout session ${breakoutSessionId} not found`);
    }
    return session;
  }

  private requireRoom(session: BreakoutSessionState, roomId: string): BreakoutRoom {
    const room = session.rooms.find((item) => item.roomId === roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} does not exist in breakout session ${session.breakoutSessionId}`);
    }
    return room;
  }

  private toSnapshot(session: BreakoutSessionState): BreakoutSessionSnapshot {
    return {
      breakoutSessionId: session.breakoutSessionId,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      status: session.status,
      autoAssign: session.autoAssign,
      rooms: session.rooms.map((room) => ({
        roomId: room.roomId,
        sessionId: room.sessionId,
        name: room.name,
        createdAt: room.createdAt,
        assignments: room.assignments.map((assignment) => ({ ...assignment })),
        isLocked: room.isLocked,
      })),
    };
  }
}
