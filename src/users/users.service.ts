// path: backend/src/users/users.service.ts
// purpose: Users service with comprehensive user management operations
// dependencies: PrismaService, Logger

import { Injectable, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as crypto from "crypto";
import { Fortune500UsersConfig } from '../types/fortune500-types';

// Fortune 500 User Management with Enterprise Features
interface EnterpriseUserProfile {
  complianceStatus: string;
  securityClearance: string;
  accessPrivileges: string[];
  auditTrail: AuditEntry[];
  behavioralAnalytics: UserBehaviorData;
  riskScore: number;
}

interface AuditEntry {
  action: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  risk: string;
}

interface UserBehaviorData {
  loginPatterns: any[];
  accessPatterns: any[];
  anomalies: any[];
  trustScore: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  // Fortune 500 Enterprise User Provisioning with Compliance
  async createEnterpriseUser(createUserDto: CreateUserDto, enterpriseConfig?: any) {
    const user = await this.create(createUserDto);
    
    // Initialize enterprise profile
    await this.initializeEnterpriseProfile(user.id, {
      complianceStatus: 'PENDING_VERIFICATION',
      securityClearance: enterpriseConfig?.clearance || 'STANDARD',
      accessPrivileges: enterpriseConfig?.privileges || ['BASIC_ACCESS'],
      auditTrail: [],
      behavioralAnalytics: {
        loginPatterns: [],
        accessPatterns: [],
        anomalies: [],
        trustScore: 0.5 // Initial neutral trust
      },
      riskScore: 0.3 // Low initial risk
    });

    return user;
  }

  // Fortune 500 User Risk Assessment
  async assessUserRisk(userId: string): Promise<number> {
    const profile = await this.getEnterpriseProfile(userId);
    let riskScore = 0.0;

    // Compliance status risk
    if (profile.complianceStatus !== 'COMPLIANT') riskScore += 0.3;
    
    // Security clearance risk
    const clearanceRisk = {
      'TOP_SECRET': 0.0,
      'SECRET': 0.1,
      'CONFIDENTIAL': 0.2,
      'STANDARD': 0.3
    };
    riskScore += clearanceRisk[profile.securityClearance] || 0.5;

    // Behavioral analytics risk
    riskScore += (1 - profile.behavioralAnalytics.trustScore) * 0.4;

    return Math.min(riskScore, 1.0);
  }

  // Fortune 500 Privilege Escalation with Approval Workflow
  async requestPrivilegeEscalation(userId: string, requestedPrivileges: string[], justification: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const escalationRequest = {
      id: crypto.randomUUID(),
      userId,
      requestedPrivileges,
      justification,
      status: 'PENDING_APPROVAL',
      requestedAt: new Date(),
      approvals: [],
      riskAssessment: await this.assessUserRisk(userId)
    };

    // Store escalation request for approval workflow
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...((user as any).preferences || {}),
          privilegeEscalationRequests: [
            ...((user as any).preferences?.privilegeEscalationRequests || []),
            escalationRequest
          ]
        }
      }
    });

    // Trigger approval workflow based on risk level
    if (escalationRequest.riskAssessment > 0.7) {
      await this.triggerHighRiskApprovalWorkflow(escalationRequest);
    } else {
      await this.triggerStandardApprovalWorkflow(escalationRequest);
    }

    return escalationRequest;
  }

  // Fortune 500 Continuous User Monitoring
  async updateUserBehaviorAnalytics(userId: string, activity: any) {
    const profile = await this.getEnterpriseProfile(userId);
    
    // Update login patterns
    if (activity.type === 'LOGIN') {
      profile.behavioralAnalytics.loginPatterns.push({
        timestamp: new Date(),
        ipAddress: activity.ipAddress,
        location: activity.location,
        device: activity.device,
        success: activity.success
      });
    }

    // Update access patterns
    if (activity.type === 'RESOURCE_ACCESS') {
      profile.behavioralAnalytics.accessPatterns.push({
        timestamp: new Date(),
        resource: activity.resource,
        action: activity.action,
        duration: activity.duration
      });
    }

    // Detect anomalies using ML/statistical analysis
    const anomalies = await this.detectBehavioralAnomalies(profile.behavioralAnalytics);
    if (anomalies.length > 0) {
      profile.behavioralAnalytics.anomalies.push(...anomalies);
      // Trigger security alert for anomalies
      await this.triggerSecurityAlert(userId, anomalies);
    }

    // Recalculate trust score
    profile.behavioralAnalytics.trustScore = await this.calculateTrustScore(profile.behavioralAnalytics);

    await this.updateEnterpriseProfile(userId, profile);
  }

  // Fortune 500 Compliance and Audit Trail
  async logUserAuditEntry(userId: string, entry: Omit<AuditEntry, 'timestamp'>) {
    const profile = await this.getEnterpriseProfile(userId);
    
    const auditEntry: AuditEntry = {
      ...entry,
      timestamp: new Date()
    };

    profile.auditTrail.push(auditEntry);
    
    // Keep only last 1000 audit entries for performance
    if (profile.auditTrail.length > 1000) {
      profile.auditTrail = profile.auditTrail.slice(-1000);
    }

    await this.updateEnterpriseProfile(userId, profile);
  }

  // Private helper methods for Fortune 500 features
  private async initializeEnterpriseProfile(userId: string, profile: EnterpriseUserProfile) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: this.buildEnterprisePreferences(profile)
      }
    });
  }

  private async getEnterpriseProfile(userId: string): Promise<EnterpriseUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });
    
    const rawProfile = (user?.preferences as any)?.enterpriseProfile;
    return this.deserializeEnterpriseProfile(rawProfile);
  }

  private async updateEnterpriseProfile(userId: string, profile: EnterpriseUserProfile) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: this.buildEnterprisePreferences(profile)
      }
    });
  }

  private buildEnterprisePreferences(profile: EnterpriseUserProfile): Prisma.InputJsonValue {
    return {
      enterpriseProfile: this.serializeEnterpriseProfile(profile)
    } satisfies Prisma.JsonObject;
  }

  private serializeEnterpriseProfile(profile: EnterpriseUserProfile): Prisma.JsonObject {
    return {
      ...profile,
      auditTrail: profile.auditTrail.map(entry => ({
        ...entry,
        timestamp: entry.timestamp instanceof Date ? entry.timestamp.toISOString() : entry.timestamp
      })),
      behavioralAnalytics: {
        ...profile.behavioralAnalytics
      }
    } satisfies Prisma.JsonObject;
  }

  private deserializeEnterpriseProfile(raw: any): EnterpriseUserProfile {
    const defaults = this.getDefaultEnterpriseProfile();

    if (!raw || typeof raw !== 'object') {
      return defaults;
    }

    const auditTrail = Array.isArray(raw.auditTrail)
      ? raw.auditTrail.map((entry: any) => ({
          action: entry?.action ?? 'UNKNOWN',
          timestamp: entry?.timestamp ? new Date(entry.timestamp) : new Date(),
          ipAddress: entry?.ipAddress ?? 'UNKNOWN',
          userAgent: entry?.userAgent ?? 'UNKNOWN',
          risk: entry?.risk ?? 'LOW'
        }))
      : [];

    return {
      complianceStatus: raw.complianceStatus ?? defaults.complianceStatus,
      securityClearance: raw.securityClearance ?? defaults.securityClearance,
      accessPrivileges: Array.isArray(raw.accessPrivileges) ? raw.accessPrivileges : defaults.accessPrivileges,
      auditTrail,
      behavioralAnalytics: {
        loginPatterns: raw.behavioralAnalytics?.loginPatterns ?? [],
        accessPatterns: raw.behavioralAnalytics?.accessPatterns ?? [],
        anomalies: raw.behavioralAnalytics?.anomalies ?? [],
        trustScore: raw.behavioralAnalytics?.trustScore ?? defaults.behavioralAnalytics.trustScore
      },
      riskScore: raw.riskScore ?? defaults.riskScore
    };
  }

  private getDefaultEnterpriseProfile(): EnterpriseUserProfile {
    return {
      complianceStatus: 'UNKNOWN',
      securityClearance: 'STANDARD',
      accessPrivileges: ['BASIC_ACCESS'],
      auditTrail: [],
      behavioralAnalytics: {
        loginPatterns: [],
        accessPatterns: [],
        anomalies: [],
        trustScore: 0.5
      },
      riskScore: 0.5
    };
  }

  private async detectBehavioralAnomalies(analytics: UserBehaviorData): Promise<any[]> {
    const anomalies = [];
    
    // Detect unusual login times
    const recentLogins = analytics.loginPatterns.slice(-10);
    const unusualTimeLogins = recentLogins.filter(login => {
      const hour = new Date(login.timestamp).getHours();
      return hour < 6 || hour > 22; // Outside business hours
    });
    
    if (unusualTimeLogins.length > 2) {
      anomalies.push({
        type: 'UNUSUAL_LOGIN_TIME',
        severity: 'MEDIUM',
        description: 'Multiple logins outside business hours detected'
      });
    }
    
    // Detect unusual location access
    const uniqueLocations = new Set(recentLogins.map(login => login.location));
    if (uniqueLocations.size > 3) {
      anomalies.push({
        type: 'MULTIPLE_LOCATIONS',
        severity: 'HIGH',
        description: 'Access from multiple geographic locations detected'
      });
    }
    
    return anomalies;
  }

  private async calculateTrustScore(analytics: UserBehaviorData): Promise<number> {
    let score = 0.5; // Start with neutral trust
    
    // Positive factors
    const successfulLogins = analytics.loginPatterns.filter(p => p.success).length;
    const totalLogins = analytics.loginPatterns.length;
    if (totalLogins > 0) {
      score += (successfulLogins / totalLogins) * 0.3;
    }
    
    // Negative factors
    const anomalyCount = analytics.anomalies.length;
    score -= Math.min(anomalyCount * 0.1, 0.4);
    
    return Math.max(0, Math.min(1, score));
  }

  private async triggerHighRiskApprovalWorkflow(request: any) {
    this.logger.warn(`High-risk privilege escalation request: ${request.id}`);
    // Integration with enterprise approval systems (e.g., ServiceNow, JIRA)
  }

  private async triggerStandardApprovalWorkflow(request: any) {
    this.logger.log(`Standard privilege escalation request: ${request.id}`);
    // Standard approval workflow
  }

  private async triggerSecurityAlert(userId: string, anomalies: any[]) {
    this.logger.warn(`Security alert for user ${userId}: ${anomalies.length} anomalies detected`);
    // Integration with SIEM/Security Operations Center
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: createUserDto,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`User created: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: { deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          UserRole: {
            include: {
              roles: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        UserRole: {
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email, deletedAt: null },
      include: {
        UserRole: {
          include: {
            roles: true,
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { email: username, deletedAt: null },
      include: {
        UserRole: {
          include: {
            roles: true,
          },
        },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: updateUserDto,
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          updatedAt: true,
        },
      });

      this.logger.log(`User updated: ${id}`);
      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      this.logger.log(`User soft deleted: ${id}`);
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updatePassword(id: string, hashedPassword: string) {
    try {
      await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { password: hashedPassword },
      });

      this.logger.log(`Password updated for user: ${id}`);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async updateLastLogin(id: string) {
    try {
      await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to update last login: ${error.message}`);
      // Don't throw error as this is not critical
    }
  }

  async verifyEmail(id: string) {
    try {
      await this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { isEmailVerified: true },
      });

      this.logger.log(`Email verified for user: ${id}`);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async toggleUserStatus(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: { isActive: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      });

      this.logger.log(`User status toggled: ${id} - Active: ${updatedUser.isActive}`);
      return updatedUser;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async assignRole(userId: string, roleId: string, tenantId: string) {
    try {
      const userRole = await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
          tenantId,
        },
        include: {
          roles: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      this.logger.log(`Role assigned: ${roleId} to user: ${userId}`);
      return userRole;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('User already has this role');
      }
      throw error;
    }
  }

  async removeRole(userId: string, roleId: string, tenantId: string) {
    try {
      await this.prisma.userRole.delete({
        where: {
          userId_roleId_tenantId: {
            userId,
            roleId,
            tenantId,
          },
        },
      });

      this.logger.log(`Role removed: ${roleId} from user: ${userId}`);
      return { message: 'Role removed successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User role assignment not found');
      }
      throw error;
    }
  }

  async getUserStats() {
    const [total, active, verified, recentlyCreated] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, isActive: true },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, isEmailVerified: true },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      total,
      active,
      verified,
      recentlyCreated,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      verifiedPercentage: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }
}
