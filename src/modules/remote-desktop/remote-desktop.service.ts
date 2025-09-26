// path: backend/src/modules/remote-desktop/remote-desktop.service.ts
// purpose: Remote Desktop/VDI service with RDP/VPN, multi-monitor, session management, and security
// dependencies: @nestjs/common, prisma, redis, rdp-client, docker, security

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Docker from 'dockerode';
import {
  CreateSessionDto,
  ConnectSessionDto,
  UpdateSessionDto,
  CreateVdiInstanceDto,
  
} from './dto';

export interface VdiInstance {
  id: string;
  name: string;
  type: 'windows' | 'linux' | 'macos';
  template: string;
  resources: {
    cpu: number;
    memory: number;
    storage: number;
    gpu?: boolean;
  };
  network: {
    ip?: string;
    ports: number[];
    vpnEnabled: boolean;
  };
  status: 'creating' | 'running' | 'stopped' | 'error' | 'maintenance';
  containerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RemoteSession {
  id: string;
  userId: string;
  tenantId: string;
  vdiInstanceId: string;
  type: 'rdp' | 'vnc' | 'ssh' | 'web';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionInfo: {
    host: string;
    port: number;
    protocol: string;
    credentials?: {
      username: string;
      password?: string;
      keyFile?: string;
    };
  };
  settings: {
    resolution: string;
    colorDepth: number;
    multiMonitor: boolean;
    audioEnabled: boolean;
    clipboardEnabled: boolean;
    fileTransferEnabled: boolean;
    recordingEnabled: boolean;
  };
  metrics: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    bytesTransferred: number;
    latency: number;
    quality: 'low' | 'medium' | 'high';
  };
  security: {
    encrypted: boolean;
    vpnRequired: boolean;
    mfaRequired: boolean;
    ipWhitelist?: string[];
    sessionTimeout: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RemoteDesktopService {
  private readonly logger = new Logger(RemoteDesktopService.name);
  private activeSessions = new Map<string, RemoteSession>();
  private vdiInstances = new Map<string, VdiInstance>();
  private docker: Docker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.docker = new Docker();
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Load active sessions from Redis
      await this.loadActiveSessions();
      
      // Load VDI instances
      await this.loadVdiInstances();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.logger.log('Remote Desktop Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Remote Desktop Service:', error);
    }
  }

  async createSession(userId: string, tenantId: string, dto: CreateSessionDto): Promise<RemoteSession> {
    try {
      // Validate user permissions
      await this.validateSessionPermissions(userId, tenantId, dto);

      // Get or create VDI instance
      let vdiInstance = await this.getVdiInstance(dto.vdiInstanceId);
      if (!vdiInstance) {
        // Validate and normalize OS type
        const validOsTypes = ['windows', 'linux', 'macos'] as const;
        const osType = validOsTypes.includes(dto.osType as any) ? dto.osType as 'windows' | 'linux' | 'macos' : 'windows';
        
        vdiInstance = await this.createVdiInstance(tenantId, userId, {
          name: dto.instanceName || `vdi-${userId}-${Date.now()}`,
          type: osType,
          template: dto.template || 'windows-10-pro',
          resources: dto.resources || {
            cpu: 2,
            memory: 4096,
            storage: 50,
          },
        });
      }

      // Ensure VDI instance is running
      await this.ensureVdiInstanceRunning(vdiInstance.id);

      // Generate session credentials
      const sessionId = crypto.randomUUID();
      const credentials = await this.generateSessionCredentials(vdiInstance, dto.type);

      // Create session record
      const session: RemoteSession = {
        id: sessionId,
        userId,
        tenantId,
        vdiInstanceId: vdiInstance.id,
        type: dto.type || 'rdp',
        status: 'connecting',
        connectionInfo: {
          host: vdiInstance.network.ip || 'localhost',
          port: this.getSessionPort(dto.type || 'rdp'),
          protocol: dto.type || 'rdp',
          credentials,
        },
        settings: {
          resolution: dto.settings?.resolution || '1920x1080',
          colorDepth: dto.settings?.colorDepth || 32,
          multiMonitor: dto.settings?.multiMonitorEnabled || false,
          audioEnabled: dto.settings?.audioEnabled !== false,
          clipboardEnabled: dto.settings?.clipboardEnabled !== false,
          fileTransferEnabled: dto.settings?.fileTransferEnabled !== false,
          recordingEnabled: dto.settings?.recordingEnabled || false,
        },
        metrics: {
          startTime: new Date(),
          bytesTransferred: 0,
          latency: 0,
          quality: 'high',
        },
        security: {
          encrypted: true,
          vpnRequired: dto.vpnRequired || false,
          mfaRequired: dto.mfaRequired || false,
          ipWhitelist: dto.ipWhitelist,
          sessionTimeout: dto.sessionTimeout || 3600, // 1 hour default
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      await this.redis.setex(`rdp:session:${sessionId}`, session.security.sessionTimeout, JSON.stringify(session));

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CREATE',
        resource: 'REMOTE_SESSION',
        resourceId: sessionId,
        details: {
          vdiInstanceId: vdiInstance.id,
          sessionType: session.type,
          resolution: session.settings.resolution,
          multiMonitor: session.settings.multiMonitor,
          instanceType: vdiInstance.type,
          encrypted: session.security.encrypted,
          recordingEnabled: session.settings.recordingEnabled,
        },
      });

      // Send notification
      await this.notificationService.sendNotification({
        tenantId,
        type: 'IN_APP' as any,
        priority: 'NORMAL' as any,
        subject: 'Remote Desktop Session Created',
        body: `Remote desktop session created for ${vdiInstance.name}`,
        recipients: [{ userId }],
        data: {
          sessionId,
          vdiInstanceId: vdiInstance.id,
          connectionInfo: {
            host: session.connectionInfo.host,
            port: session.connectionInfo.port,
            protocol: session.connectionInfo.protocol,
          },
        },
        metadata: {
          source: 'remote-desktop',
          sessionId,
          actionType: 'session_created',
        },
      });

      return session;
    } catch (error) {
      this.logger.error('Error creating remote session:', error);
      throw error;
    }
  }

  async getSessions(userId: string, tenantId: string, query: any): Promise<{ data: RemoteSession[]; total: number; active: number }> {
    try {
      const sessions = Array.from(this.activeSessions.values())
        .filter(session => session.tenantId === tenantId && (query.userId ? session.userId === query.userId : true));

      const filteredSessions = sessions.filter(session => {
        if (query.status && session.status !== query.status) return false;
        if (query.type && session.type !== query.type) return false;
        if (query.vdiInstanceId && session.vdiInstanceId !== query.vdiInstanceId) return false;
        return true;
      });

      const activeSessions = filteredSessions.filter(session => 
        session.status === 'connected' || session.status === 'connecting'
      );

      return {
        data: filteredSessions,
        total: filteredSessions.length,
        active: activeSessions.length,
      };
    } catch (error) {
      this.logger.error('Error getting sessions:', error);
      throw error;
    }
  }

  async connectToSession(userId: string, tenantId: string, sessionId: string, dto: ConnectSessionDto): Promise<{ connectionUrl: string; credentials: any }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) {
        throw new NotFoundException('Session not found');
      }

      // Validate user permissions
      if (session.userId !== userId) {
        await this.validateSessionAccess(userId, tenantId, sessionId);
      }

      // Update session status
      session.status = 'connected';
      session.updatedAt = new Date();
      this.activeSessions.set(sessionId, session);

      // Generate connection URL
      const connectionUrl = this.generateConnectionUrl(session, dto);

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CONNECT',
        resource: 'REMOTE_SESSION',
        resourceId: sessionId,
        details: {
          sessionType: session.type,
          clientInfo: dto.clientInfo,
          connectionMethod: dto.connectionMethod || 'web',
          userAgent: dto.userAgent,
        },
      });

      return {
        connectionUrl,
        credentials: session.connectionInfo.credentials,
      };
    } catch (error) {
      this.logger.error('Error connecting to session:', error);
      throw error;
    }
  }

  async disconnectSession(userId: string, tenantId: string, sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session || session.tenantId !== tenantId) {
        throw new NotFoundException('Session not found');
      }

      // Update session status
      session.status = 'disconnected';
      session.metrics.endTime = new Date();
      session.metrics.duration = session.metrics.endTime.getTime() - session.metrics.startTime.getTime();
      session.updatedAt = new Date();

      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      await this.redis.del(`rdp:session:${sessionId}`);

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'DISCONNECT',
        resource: 'REMOTE_SESSION',
        resourceId: sessionId,
        details: {
          sessionDuration: session.metrics.duration,
          bytesTransferred: session.metrics.bytesTransferred,
          sessionType: session.type,
          endReason: 'user_disconnect',
        },
      });

      this.logger.log(`Session ${sessionId} disconnected by user ${userId}`);
    } catch (error) {
      this.logger.error('Error disconnecting session:', error);
      throw error;
    }
  }

  async createVdiInstance(tenantId: string, userId: string, dto: CreateVdiInstanceDto): Promise<VdiInstance> {
    try {
      const instanceId = crypto.randomUUID();
      
      // Create Docker container for VDI instance
      const container = await this.createVdiContainer(instanceId, dto);
      
      const instance: VdiInstance = {
        id: instanceId,
        name: dto.name,
        type: dto.type,
        template: dto.template,
        resources: dto.resources,
        network: {
          ports: this.getRequiredPorts(dto.type),
          vpnEnabled: dto.vpnEnabled || false,
        },
        status: 'creating',
        containerId: container.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store instance
      this.vdiInstances.set(instanceId, instance);
      await this.redis.setex(`rdp:vdi:${instanceId}`, 86400, JSON.stringify(instance)); // 24 hours

      // Start container
      await container.start();
      
      // Wait for container to be ready
      await this.waitForContainerReady(container.id);
      
      // Update instance status
      instance.status = 'running';
      instance.network.ip = await this.getContainerIp(container.id);
      instance.updatedAt = new Date();
      
      this.vdiInstances.set(instanceId, instance);
      await this.redis.setex(`rdp:vdi:${instanceId}`, 86400, JSON.stringify(instance));

      // Log audit event
      await this.auditService.logActivity({
        tenantId,
        userId,
        action: 'CREATE',
        resource: 'VDI_INSTANCE',
        resourceId: instanceId,
        details: {
          instanceName: instance.name,
          instanceType: instance.type,
          template: instance.template,
          resources: instance.resources,
          containerId: container.id,
          networkIp: instance.network.ip,
        },
      });

      return instance;
    } catch (error) {
      this.logger.error('Error creating VDI instance:', error);
      throw error;
    }
  }

  // Private helper methods
  private async validateSessionPermissions(userId: string, tenantId: string, _dto: CreateSessionDto): Promise<void> {
    // Implementation would check user permissions, quotas, etc.
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      select: { role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('User not authorized for remote desktop access');
    }
  }

  private async validateSessionAccess(_userId: string, _tenantId: string, _sessionId: string): Promise<void> {
    // Implementation would check if user has access to this session
    // For now, allow access if user is in same tenant
  }

  private async getVdiInstance(instanceId?: string): Promise<VdiInstance | null> {
    if (!instanceId) return null;
    return this.vdiInstances.get(instanceId) || null;
  }

  private async ensureVdiInstanceRunning(instanceId: string): Promise<void> {
    const instance = this.vdiInstances.get(instanceId);
    if (!instance) {
      throw new NotFoundException('VDI instance not found');
    }

    if (instance.status !== 'running') {
      // Start the instance
      if (instance.containerId) {
        const container = this.docker.getContainer(instance.containerId);
        await container.start();
        instance.status = 'running';
        instance.updatedAt = new Date();
        this.vdiInstances.set(instanceId, instance);
      }
    }
  }

  private async generateSessionCredentials(_instance: VdiInstance, _sessionType?: string): Promise<any> {
    // Generate secure credentials for the session
    const username = `user_${crypto.randomBytes(4).toString('hex')}`;
    const password = crypto.randomBytes(16).toString('base64');
    
    return {
      username,
      password,
      // Additional credentials based on session type
    };
  }

  private getSessionPort(sessionType: string): number {
    const portMap: Record<RemoteSession['type'], number> = {
      rdp: 3389,
      vnc: 5900,
      ssh: 22,
      web: 8080,
    };
    const key = (sessionType as RemoteSession['type']);
    return portMap[key] ?? 3389;
  }

  private getRequiredPorts(instanceType: string): number[] {
    const portMap: Record<VdiInstance['type'], number[]> = {
      windows: [3389, 5985, 5986], // RDP, WinRM
      linux: [22, 5900, 8080], // SSH, VNC, Web
      macos: [22, 5900, 5988], // SSH, VNC, ARD
    };
    const key = (instanceType as VdiInstance['type']);
    return portMap[key] ?? [3389];
  }

  private async createVdiContainer(instanceId: string, dto: CreateVdiInstanceDto): Promise<any> {
    const imageMap = {
      'windows-10-pro': 'mcr.microsoft.com/windows:10.0.19041.1415',
      'ubuntu-20.04': 'ubuntu:20.04',
      'centos-8': 'centos:8',
    };

  const image = imageMap[(dto.template as keyof typeof imageMap)] ?? imageMap['ubuntu-20.04'];
    
    return await this.docker.createContainer({
      Image: image,
      name: `vdi-${instanceId}`,
      Env: [
        `VDI_INSTANCE_ID=${instanceId}`,
        `VDI_TYPE=${dto.type}`,
      ],
      HostConfig: {
        Memory: dto.resources.memory * 1024 * 1024, // Convert MB to bytes
        CpuShares: dto.resources.cpu * 1024,
        PortBindings: this.generatePortBindings(dto.type),
      },
      ExposedPorts: this.generateExposedPorts(dto.type),
    });
  }

  private generatePortBindings(instanceType: string): any {
    const ports = this.getRequiredPorts(instanceType);
  const bindings: Record<string, Array<{ HostPort: string }>> = {};
    
    ports.forEach(port => {
  bindings[`${port}/tcp`] = [{ HostPort: port.toString() }];
    });
    
    return bindings;
  }

  private generateExposedPorts(instanceType: string): any {
    const ports = this.getRequiredPorts(instanceType);
  const exposed: Record<string, unknown> = {};
    
    ports.forEach(port => {
      exposed[`${port}/tcp`] = {};
    });
    
    return exposed;
  }

  private async waitForContainerReady(_containerId: string): Promise<void> {
    // Implementation would wait for container to be ready
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simple 5 second wait
  }

  private async getContainerIp(containerId: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();
    return info.NetworkSettings.IPAddress || 'localhost';
  }

  private generateConnectionUrl(session: RemoteSession, dto: ConnectSessionDto): string {
    const baseUrl = this.configService.get('RDP_BASE_URL', 'https://rdp.example.com');
    return `${baseUrl}/connect/${session.id}?type=${session.type}&method=${dto.connectionMethod || 'web'}`;
  }

  private async loadActiveSessions(): Promise<void> {
    try {
      const keys = await this.redis.keys('rdp:session:*');
      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          this.activeSessions.set(session.id, session);
        }
      }
      this.logger.log(`Loaded ${this.activeSessions.size} active sessions`);
    } catch (error) {
      this.logger.error('Error loading active sessions:', error);
    }
  }

  private async loadVdiInstances(): Promise<void> {
    try {
      const keys = await this.redis.keys('rdp:vdi:*');
      for (const key of keys) {
        const instanceData = await this.redis.get(key);
        if (instanceData) {
          const instance = JSON.parse(instanceData);
          this.vdiInstances.set(instance.id, instance);
        }
      }
      this.logger.log(`Loaded ${this.vdiInstances.size} VDI instances`);
    } catch (error) {
      this.logger.error('Error loading VDI instances:', error);
    }
  }

  private startHealthMonitoring(): void {
    // Monitor sessions and instances every 30 seconds
    setInterval(async () => {
      await this.monitorSessions();
      await this.monitorVdiInstances();
    }, 30000);
  }

  private async monitorSessions(): Promise<void> {
    try {
      for (const [sessionId, session] of this.activeSessions.entries()) {
        // Check session timeout
        const now = new Date();
        const sessionAge = now.getTime() - session.createdAt.getTime();
        
        if (sessionAge > session.security.sessionTimeout * 1000) {
          this.logger.warn(`Session ${sessionId} timed out, disconnecting`);
          await this.disconnectSession(session.userId, session.tenantId, sessionId);
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring sessions:', error);
    }
  }

  private async monitorVdiInstances(): Promise<void> {
    try {
      for (const [instanceId, instance] of this.vdiInstances.entries()) {
        if (instance.containerId) {
          try {
            const container = this.docker.getContainer(instance.containerId);
            const info = await container.inspect();
            
            const newStatus = info.State.Running ? 'running' : 'stopped';
            if (newStatus !== instance.status) {
              instance.status = newStatus as any;
              instance.updatedAt = new Date();
              this.vdiInstances.set(instanceId, instance);
              await this.redis.setex(`rdp:vdi:${instanceId}`, 86400, JSON.stringify(instance));
            }
          } catch (error) {
            this.logger.error(`Error checking container ${instance.containerId}:`, error);
            instance.status = 'error';
            this.vdiInstances.set(instanceId, instance);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring VDI instances:', error);
    }
  }

  async getSession(userId: string, tenantId: string, sessionId: string): Promise<RemoteSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException('Session not found');
    }

    // Validate user access
    if (session.userId !== userId) {
      await this.validateSessionAccess(userId, tenantId, sessionId);
    }

    return session;
  }

  async getVdiInstances(_tenantId: string, _userId: string): Promise<VdiInstance[]> {
    return Array.from(this.vdiInstances.values())
      .filter(_instance => {
        // Filter by tenant - in a real implementation, you'd check ownership
        return true; // For now, return all instances
      });
  }

  async deleteVdiInstance(tenantId: string, userId: string, instanceId: string): Promise<void> {
    const instance = this.vdiInstances.get(instanceId);
    if (!instance) {
      throw new NotFoundException('VDI instance not found');
    }

    // Stop and remove container
    if (instance.containerId) {
      try {
        const container = this.docker.getContainer(instance.containerId);
        await container.stop();
        await container.remove();
      } catch (error) {
        this.logger.error(`Error removing container ${instance.containerId}:`, error);
      }
    }

    // Remove from memory and cache
    this.vdiInstances.delete(instanceId);
    await this.redis.del(`rdp:vdi:${instanceId}`);

    // Log audit event
    await this.auditService.logActivity({
      tenantId,
      userId,
      action: 'DELETE',
      resource: 'VDI_INSTANCE',
      resourceId: instanceId,
      details: {
        instanceName: instance.name,
        instanceType: instance.type,
        containerId: instance.containerId,
      },
    });
  }

  async updateSession(userId: string, tenantId: string, sessionId: string, dto: UpdateSessionDto): Promise<RemoteSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException('Session not found');
    }

    // Validate user access
    if (session.userId !== userId) {
      await this.validateSessionAccess(userId, tenantId, sessionId);
    }

    // Update session settings
    if (dto.settings) {
      session.settings = { ...session.settings, ...dto.settings };
    }

    if (dto.security) {
      session.security = { ...session.security, ...dto.security };
    }

    session.updatedAt = new Date();
    this.activeSessions.set(sessionId, session);

    // Update cache
    await this.redis.setex(`rdp:session:${sessionId}`, session.security.sessionTimeout, JSON.stringify(session));

    // Log audit event
    await this.auditService.logActivity({
      tenantId,
      userId,
      action: 'UPDATE',
      resource: 'REMOTE_SESSION',
      resourceId: sessionId,
      details: {
        updatedFields: Object.keys(dto),
        sessionType: session.type,
      },
    });

    return session;
  }

  async deleteSession(userId: string, tenantId: string, sessionId: string): Promise<void> {
    await this.disconnectSession(userId, tenantId, sessionId);
  }

  async getAnalytics(userId: string, tenantId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    avgSessionDuration: number;
    bandwidthUsage: number;
    connectionQuality: string;
    sessionsByType: Record<string, number>;
    instancesByType: Record<string, number>;
    resourceUtilization: {
      cpu: number;
      memory: number;
      storage: number;
    };
  }> {
    try {
      const sessions = Array.from(this.activeSessions.values())
        .filter(session => session.tenantId === tenantId);

      const instances = Array.from(this.vdiInstances.values());

      const activeSessions = sessions.filter(s => s.status === 'connected' || s.status === 'connecting');

      const completedSessions = sessions.filter(s => s.metrics.endTime);
      const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.metrics.duration || 0), 0) / completedSessions.length
        : 0;

      const totalBandwidth = sessions.reduce((sum, s) => sum + s.metrics.bytesTransferred, 0);

      const sessionsByType = sessions.reduce((acc, session) => {
        acc[session.type] = (acc[session.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const instancesByType = instances.reduce((acc, instance) => {
        acc[instance.type] = (acc[instance.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalCpu = instances.reduce((sum, i) => sum + i.resources.cpu, 0);
      const totalMemory = instances.reduce((sum, i) => sum + i.resources.memory, 0);
      const totalStorage = instances.reduce((sum, i) => sum + i.resources.storage, 0);

      return {
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        avgSessionDuration: Math.round(avgDuration / 1000), // Convert to seconds
        bandwidthUsage: totalBandwidth,
        connectionQuality: this.calculateConnectionQuality(sessions),
        sessionsByType,
        instancesByType,
        resourceUtilization: {
          cpu: totalCpu,
          memory: totalMemory,
          storage: totalStorage,
        },
      };
    } catch (error) {
      this.logger.error('Error getting analytics:', error);
      throw error;
    }
  }

  private calculateConnectionQuality(sessions: RemoteSession[]): string {
    if (sessions.length === 0) return 'unknown';

    const avgLatency = sessions.reduce((sum, s) => sum + s.metrics.latency, 0) / sessions.length;

    if (avgLatency < 50) return 'excellent';
    if (avgLatency < 100) return 'good';
    if (avgLatency < 200) return 'fair';
    return 'poor';
  }
}