// path: backend/src/remote-desktop-access/services/session.service.ts
// purpose: Service for remote desktop session management
// dependencies: @nestjs/common, prisma, docker, vnc, rdp

import { Injectable, NotFoundException, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, RemoteSession } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto, SessionType, SessionStatus, OperatingSystem, InstanceSize } from '../dto/create-session.dto';
import * as crypto from 'crypto';

export interface SessionEntity {
  id: string;
  name: string;
  description?: string;
  type: SessionType;
  status: SessionStatus;
  sessionId: string;
  targetHost?: string;
  targetPort?: number;
  username?: string;
  operatingSystem?: OperatingSystem;
  instanceSize?: InstanceSize;
  duration: number;
  connectionUrl: string;
  vncPort?: number;
  rdpPort?: number;
  sshPort?: number;
  settings: {
    enableClipboard: boolean;
    enableFileTransfer: boolean;
    enableAudio: boolean;
    enablePrinting: boolean;
    enableMultiMonitor: boolean;
    screenWidth: number;
    screenHeight: number;
    colorDepth: number;
    recordSession: boolean;
    isPersistent: boolean;
  };
  allowedUsers: string[];
  tags: string[];
  applications: string[];
  environmentVariables: Record<string, string>;
  securitySettings: any;
  containerId?: string;
  instanceId?: string;
  recordingUrl?: string;
  startedAt?: Date;
  endedAt?: Date;
  lastAccessedAt?: Date;
  tenantId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly baseUrl = process.env.RDP_BASE_URL || 'https://rdp.cubecore.ai';

  constructor(private prisma: PrismaService) {}

  async create(
    createSessionDto: CreateSessionDto,
    tenantId: string,
    userId: string
  ): Promise<SessionEntity> {
    try {
      this.logger.log(`Creating remote desktop session: ${createSessionDto.name}`);

      // Generate unique session ID
      const sessionId = this.generateSessionId();

      // Determine ports based on session type
      const ports = this.assignPorts(createSessionDto.type);

      // Generate connection URL
      const connectionUrl = this.generateConnectionUrl(sessionId, createSessionDto.type);

      // Create session record
      const session = await this.prisma.remoteSession.create({
        data: {
          name: createSessionDto.name,
          description: createSessionDto.description,
          type: createSessionDto.type,
          status: SessionStatus.PENDING,
          sessionId,
          targetHost: createSessionDto.targetHost,
          targetPort: createSessionDto.targetPort,
          username: createSessionDto.username,
          operatingSystem: createSessionDto.operatingSystem,
          instanceSize: createSessionDto.instanceSize,
          duration: createSessionDto.duration || 480,
          connectionUrl,
          vncPort: ports.vnc,
          rdpPort: ports.rdp,
          sshPort: ports.ssh,
          settings: {
            enableClipboard: createSessionDto.enableClipboard !== false,
            enableFileTransfer: createSessionDto.enableFileTransfer !== false,
            enableAudio: createSessionDto.enableAudio || false,
            enablePrinting: createSessionDto.enablePrinting || false,
            enableMultiMonitor: createSessionDto.enableMultiMonitor || false,
            screenWidth: createSessionDto.screenWidth || 1920,
            screenHeight: createSessionDto.screenHeight || 1080,
            colorDepth: createSessionDto.colorDepth || 32,
            recordSession: createSessionDto.recordSession || false,
            isPersistent: createSessionDto.isPersistent || false
          },
          allowedUsers: createSessionDto.allowedUsers || [],
          tags: createSessionDto.tags || [],
          applications: createSessionDto.applications || [],
          environmentVariables: createSessionDto.environmentVariables || {},
          securitySettings: createSessionDto.securitySettings || {},
          tenantId,
          userId
        }
      });

      // Initialize the session based on type
      const mappedSession = this.mapRemoteSession(session);

      await this.initializeSession(mappedSession);

      this.logger.log(`Remote desktop session created successfully: ${session.id}`);
      return mappedSession;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    status?: SessionStatus,
    type?: SessionType,
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionEntity[]> {
    const whereCondition: any = {
      tenantId,
      OR: [
        { userId },
        {
          allowedUsers: {
            has: userId
          }
        }
      ]
    };

    if (status) {
      whereCondition.status = status;
    }

    if (type) {
      whereCondition.type = type;
    }

    const sessions = await this.prisma.remoteSession.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return sessions.map((session) => this.mapRemoteSession(session));
  }

  async findOne(id: string, tenantId: string, userId: string): Promise<SessionEntity> {
    const session = await this.prisma.remoteSession.findFirst({
      where: {
        id,
        tenantId,
        OR: [
          { userId },
          {
            allowedUsers: {
              has: userId
            }
          }
        ]
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapRemoteSession(session);
  }

  async connect(id: string, tenantId: string, userId: string): Promise<{ connectionUrl: string; credentials?: any }> {
    const session = await this.findOne(id, tenantId, userId);

    if (session.status === SessionStatus.TERMINATED) {
      throw new BadRequestException('Session has been terminated');
    }

    if (session.status === SessionStatus.ERROR) {
      throw new BadRequestException('Session is in error state');
    }

    // Check security settings
    if (session.securitySettings.requireMFA) {
      // TODO: Implement MFA verification
    }

    if (session.securitySettings.allowedIPs) {
      // TODO: Implement IP restriction check
    }

    // Update session status and last accessed time
    await this.prisma.remoteSession.update({
      where: { id },
      data: {
        status: SessionStatus.ACTIVE,
        lastAccessedAt: new Date(),
        startedAt: session.startedAt || new Date()
      }
    });

    this.logger.log(`User ${userId} connected to session ${id}`);

    return {
      connectionUrl: session.connectionUrl,
      credentials: {
        username: session.username,
        sessionId: session.sessionId
      }
    };
  }

  async disconnect(id: string, tenantId: string, userId: string): Promise<void> {
    const _session = await this.findOne(id, tenantId, userId);

    await this.prisma.remoteSession.update({
      where: { id },
      data: {
        status: SessionStatus.DISCONNECTED,
        lastAccessedAt: new Date()
      }
    });

    this.logger.log(`User ${userId} disconnected from session ${id}`);
  }

  async terminate(id: string, tenantId: string, userId: string): Promise<void> {
    const session = await this.findOne(id, tenantId, userId);

    // Only session owner can terminate
    if (session.userId !== userId) {
      throw new ForbiddenException('Only the session owner can terminate the session');
    }

    // Cleanup resources
    await this.cleanupSession(session);

    await this.prisma.remoteSession.update({
      where: { id },
      data: {
        status: SessionStatus.TERMINATED,
        endedAt: new Date()
      }
    });

    this.logger.log(`Session terminated: ${id}`);
  }

  async extendSession(
    id: string,
    additionalMinutes: number,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const session = await this.findOne(id, tenantId, userId);

    // Only session owner can extend
    if (session.userId !== userId) {
      throw new ForbiddenException('Only the session owner can extend the session');
    }

    await this.prisma.remoteSession.update({
      where: { id },
      data: {
        duration: session.duration + additionalMinutes
      }
    });

    this.logger.log(`Session ${id} extended by ${additionalMinutes} minutes`);
  }

  async shareSession(
    id: string,
    userIds: string[],
    tenantId: string,
    userId: string
  ): Promise<void> {
    const session = await this.findOne(id, tenantId, userId);

    // Only session owner can share
    if (session.userId !== userId) {
      throw new ForbiddenException('Only the session owner can share the session');
    }

    const updatedAllowedUsers = [...new Set([...session.allowedUsers, ...userIds])];

    await this.prisma.remoteSession.update({
      where: { id },
      data: {
        allowedUsers: updatedAllowedUsers
      }
    });

    this.logger.log(`Session ${id} shared with ${userIds.length} users`);
  }

  async getSessionRecording(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<{ recordingUrl?: string; available: boolean }> {
    const session = await this.findOne(id, tenantId, userId);

    if (!session.settings.recordSession) {
      return { available: false };
    }

    return {
      recordingUrl: session.recordingUrl,
      available: !!session.recordingUrl
    };
  }

  async getActiveSessions(tenantId: string): Promise<any[]> {
    return this.prisma.remoteSession.findMany({
      where: {
        tenantId,
        status: SessionStatus.ACTIVE
      },
      select: {
        id: true,
        name: true,
        type: true,
        userId: true,
        startedAt: true,
        lastAccessedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
  }

  async getStats(_tenantId: string, _userId: string): Promise<any> {
    // TODO: Implement session statistics
    return {
      totalSessions: 0,
      activeSessions: 0,
      totalDuration: 0,
      recordingsCount: 0,
      storageUsed: 0
    };
  }

  private mapRemoteSession(session: RemoteSession): SessionEntity {
    const settingsRaw = this.ensureRecord(session.settings);
    const securityRaw = this.ensureRecord(session.securitySettings);
    const envRaw = this.ensureRecord(session.environmentVariables);

    return {
      id: session.id,
      name: session.name,
      description: session.description ?? undefined,
      type: this.mapSessionType(session.type),
      status: this.mapSessionStatus(session.status),
      sessionId: session.sessionId,
      targetHost: session.targetHost ?? undefined,
      targetPort: session.targetPort ?? undefined,
      username: session.username ?? undefined,
      operatingSystem: session.operatingSystem as OperatingSystem | undefined,
      instanceSize: session.instanceSize as InstanceSize | undefined,
      duration: session.duration,
      connectionUrl: session.connectionUrl,
      vncPort: session.vncPort ?? undefined,
      rdpPort: session.rdpPort ?? undefined,
      sshPort: session.sshPort ?? undefined,
      settings: {
        enableClipboard: this.coerceBoolean(settingsRaw.enableClipboard ?? settingsRaw.clipboardEnabled, true),
        enableFileTransfer: this.coerceBoolean(settingsRaw.enableFileTransfer ?? settingsRaw.fileTransferEnabled, false),
        enableAudio: this.coerceBoolean(settingsRaw.enableAudio ?? settingsRaw.audioEnabled, false),
        enablePrinting: this.coerceBoolean(settingsRaw.enablePrinting ?? settingsRaw.printingEnabled, false),
        enableMultiMonitor: this.coerceBoolean(settingsRaw.enableMultiMonitor ?? settingsRaw.multiMonitorEnabled, false),
        screenWidth: this.coerceNumber(settingsRaw.screenWidth ?? settingsRaw.width, 1920),
        screenHeight: this.coerceNumber(settingsRaw.screenHeight ?? settingsRaw.height, 1080),
        colorDepth: this.coerceNumber(settingsRaw.colorDepth ?? settingsRaw.depth, 32),
        recordSession: this.coerceBoolean(settingsRaw.recordSession ?? settingsRaw.recordingEnabled, false),
        isPersistent: this.coerceBoolean(settingsRaw.isPersistent ?? settingsRaw.persistent, false),
      },
      allowedUsers: session.allowedUsers ?? [],
      tags: session.tags ?? [],
      applications: session.applications ?? [],
      environmentVariables: Object.fromEntries(Object.entries(envRaw).map(([key, value]) => [key, String(value)])),
      securitySettings: securityRaw,
      containerId: session.containerId ?? undefined,
      instanceId: session.instanceId ?? undefined,
      recordingUrl: session.recordingUrl ?? undefined,
      startedAt: session.startedAt ?? undefined,
      endedAt: session.endedAt ?? undefined,
      lastAccessedAt: session.lastAccessedAt ?? undefined,
      tenantId: session.tenantId,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private mapSessionType(type: string | null): SessionType {
    const normalized = (type ?? '').toUpperCase();
    if ((Object.values(SessionType) as string[]).includes(normalized)) {
      return normalized as SessionType;
    }
    switch (normalized) {
      case 'VDI':
        return SessionType.VDI;
      case 'VNC':
        return SessionType.VNC;
      case 'SSH':
        return SessionType.SSH;
      case 'RDP':
      default:
        return SessionType.RDP;
    }
  }

  private mapSessionStatus(status: string | null): SessionStatus {
    const normalized = (status ?? '').toUpperCase();
    if ((Object.values(SessionStatus) as string[]).includes(normalized)) {
      return normalized as SessionStatus;
    }
    return SessionStatus.PENDING;
  }

  private ensureRecord(value: Prisma.JsonValue | null | undefined): Record<string, any> {
    return isRecord(value) ? value : {};
  }

  private coerceBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
  }

  private coerceNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private generateSessionId(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  private assignPorts(type: SessionType): { vnc?: number; rdp?: number; ssh?: number } {
    const basePort = 5900;
    const randomOffset = Math.floor(Math.random() * 1000);

    switch (type) {
      case SessionType.VNC:
        return { vnc: basePort + randomOffset };
      case SessionType.RDP:
        return { rdp: 3389 + randomOffset };
      case SessionType.SSH:
        return { ssh: 22 + randomOffset };
      case SessionType.VDI:
        return {
          vnc: basePort + randomOffset,
          rdp: 3389 + randomOffset,
          ssh: 22 + randomOffset
        };
      default:
        return {};
    }
  }

  private generateConnectionUrl(sessionId: string, type: SessionType): string {
    return `${this.baseUrl}/connect/${type.toLowerCase()}/${sessionId}`;
  }

  private async initializeSession(session: SessionEntity): Promise<void> {
    try {
      this.logger.log(`Initializing session ${session.id} of type ${session.type}`);

      switch (session.type) {
        case SessionType.VDI:
          await this.createVDIInstance(session);
          break;
        case SessionType.RDP:
          await this.setupRDPConnection(session);
          break;
        case SessionType.VNC:
          await this.setupVNCConnection(session);
          break;
        case SessionType.SSH:
          await this.setupSSHConnection(session);
          break;
      }

      // Update session status
      await this.prisma.remoteSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.CONNECTING }
      });

    } catch (error) {
      this.logger.error(`Failed to initialize session ${session.id}: ${error.message}`);
      
      await this.prisma.remoteSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.ERROR }
      });
      
      throw error;
    }
  }

  private async createVDIInstance(session: any): Promise<void> {
    // TODO: Implement VDI instance creation using Docker or cloud provider
    this.logger.log(`Creating VDI instance for session ${session.id}`);
    
    // Simulate instance creation
    const instanceId = `vdi-${session.sessionId}`;
    
    await this.prisma.remoteSession.update({
      where: { id: session.id },
      data: { instanceId }
    });
  }

  private async setupRDPConnection(session: any): Promise<void> {
    // TODO: Implement RDP connection setup
    this.logger.log(`Setting up RDP connection for session ${session.id}`);
  }

  private async setupVNCConnection(session: any): Promise<void> {
    // TODO: Implement VNC connection setup
    this.logger.log(`Setting up VNC connection for session ${session.id}`);
  }

  private async setupSSHConnection(session: any): Promise<void> {
    // TODO: Implement SSH connection setup
    this.logger.log(`Setting up SSH connection for session ${session.id}`);
  }

  private async cleanupSession(session: SessionEntity): Promise<void> {
    try {
      this.logger.log(`Cleaning up session ${session.id}`);

      if (session.containerId) {
        // TODO: Stop and remove Docker container
      }

      if (session.instanceId) {
        // TODO: Terminate cloud instance
      }

      // TODO: Cleanup any temporary files or resources

    } catch (error) {
      this.logger.error(`Failed to cleanup session ${session.id}: ${error.message}`);
    }
  }
}

function isRecord(value: Prisma.JsonValue | null | undefined): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
