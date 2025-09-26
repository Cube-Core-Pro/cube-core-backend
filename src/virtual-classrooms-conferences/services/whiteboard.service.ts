import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type WhiteboardOperationType = 'draw' | 'erase' | 'text' | 'shape' | 'sticky-note';

export interface WhiteboardOperationPayload {
  color?: string;
  thickness?: number;
  points?: Array<{ x: number; y: number }>;
  text?: string;
  fontSize?: number;
  shape?: 'rectangle' | 'ellipse' | 'triangle' | 'arrow';
  stickyNote?: {
    text: string;
    color: string;
  };
  [key: string]: unknown;
}

export interface WhiteboardOperation {
  operationId: string;
  boardId: string;
  performedBy: string;
  type: WhiteboardOperationType;
  payload: WhiteboardOperationPayload;
  sequence: number;
  createdAt: string;
}

export interface WhiteboardSnapshot {
  boardId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  operations: WhiteboardOperation[];
  participants: string[];
}

interface WhiteboardState {
  boardId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  operations: WhiteboardOperation[];
  participants: Set<string>;
}

@Injectable()
export class WhiteboardService {
  private readonly boards = new Map<string, WhiteboardState>();

  createBoard(sessionId: string, createdBy: string): WhiteboardSnapshot {
    if (!sessionId || !createdBy) {
      throw new BadRequestException('sessionId and createdBy are required');
    }

    const boardId = randomUUID();
    const now = new Date().toISOString();
    const board: WhiteboardState = {
      boardId,
      sessionId,
      createdAt: now,
      updatedAt: now,
      operations: [],
      participants: new Set([createdBy]),
    };

    this.boards.set(boardId, board);
    return this.toSnapshot(board);
  }

  joinBoard(boardId: string, participantId: string): WhiteboardSnapshot {
    const board = this.requireBoard(boardId);
    board.participants.add(participantId);
    board.updatedAt = new Date().toISOString();
    return this.toSnapshot(board);
  }

  leaveBoard(boardId: string, participantId: string) {
    const board = this.requireBoard(boardId);
    board.participants.delete(participantId);
    board.updatedAt = new Date().toISOString();
  }

  appendOperation(
    boardId: string,
    performedBy: string,
    type: WhiteboardOperationType,
    payload: WhiteboardOperationPayload,
  ): WhiteboardOperation {
    const board = this.requireBoard(boardId);
    const operation: WhiteboardOperation = {
      operationId: randomUUID(),
      boardId,
      performedBy,
      type,
      payload,
      sequence: board.operations.length + 1,
      createdAt: new Date().toISOString(),
    };

    board.operations.push(operation);
    board.updatedAt = operation.createdAt;
    board.participants.add(performedBy);
    return { ...operation, payload: { ...payload } };
  }

  getBoard(boardId: string): WhiteboardSnapshot {
    return this.toSnapshot(this.requireBoard(boardId));
  }

  getOperationsSince(boardId: string, afterSequence = 0): WhiteboardOperation[] {
    const board = this.requireBoard(boardId);
    return board.operations
      .filter((operation) => operation.sequence > afterSequence)
      .map((operation) => ({ ...operation, payload: { ...operation.payload } }));
  }

  resetBoard(boardId: string, performedBy: string) {
    const board = this.requireBoard(boardId);
    board.operations = [];
    board.participants = new Set([performedBy]);
    board.updatedAt = new Date().toISOString();
  }

  listBoardsBySession(sessionId: string): WhiteboardSnapshot[] {
    return Array.from(this.boards.values())
      .filter((board) => board.sessionId === sessionId)
      .map((board) => this.toSnapshot(board));
  }

  getActiveBoardCount(): number {
    return this.boards.size;
  }

  private requireBoard(boardId: string): WhiteboardState {
    const board = this.boards.get(boardId);
    if (!board) {
      throw new NotFoundException(`Whiteboard ${boardId} not found`);
    }
    return board;
  }

  private toSnapshot(board: WhiteboardState): WhiteboardSnapshot {
    return {
      boardId: board.boardId,
      sessionId: board.sessionId,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      operations: board.operations.map((operation) => ({
        ...operation,
        payload: { ...operation.payload },
      })),
      participants: Array.from(board.participants),
    };
  }
}
