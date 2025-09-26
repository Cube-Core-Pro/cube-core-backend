// path: backend/src/tokenization/tokenization.gateway.ts
// purpose: Lightweight WebSocket gateway for tokenization real-time updates (stub)

import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/tokenization', cors: true })
export class TokenizationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TokenizationGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: any) {
    this.logger.debug(`Client connected to tokenization gateway: ${client.id}`);
  }

  handleDisconnect(client: any) {
    this.logger.debug(`Client disconnected from tokenization gateway: ${client.id}`);
  }

  emitUpdate(event: string, payload: Record<string, any>) {
    this.server?.emit(event, payload);
  }
}

