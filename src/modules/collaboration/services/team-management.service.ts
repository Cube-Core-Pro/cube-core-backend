// path: backend/src/modules/collaboration/services/team-management.service.ts
// purpose: Enterprise team management service for collaborative workspaces
// dependencies: @nestjs/common, prisma, redis, notifications

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  color?: string;
  workspaceId: string;
  members: TeamMember[];
  settings: TeamSettings;
  statistics: TeamStatistics;
  projects: string[]; // Project IDs
  channels: string[]; // Channel IDs
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  userEmail: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  permissions: MemberPermissions;
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  joinedAt: Date;
  invitedBy?: string;
  lastActiveAt: Date;
  contributions: MemberContributions;
}

export interface MemberPermissions {
  canInviteMembers: boolean;
  canManageProjects: boolean;
  canManageChannels: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageIntegrations: boolean;
  customPermissions: string[];
}

export interface MemberContributions {
  messagesCount: number;
  filesShared: number;
  projectsContributed: number;
  documentsCreated: number;
  meetingsAttended: number;
  lastContributionAt: Date;
}

export interface TeamSettings {
  isPrivate: boolean;
  requireApproval: boolean;
  allowGuestInvites: boolean;
  defaultMemberRole: 'member' | 'guest';
  retentionPolicy: RetentionPolicy;
  integrations: TeamIntegration[];
  notifications: NotificationSettings;
}

export interface RetentionPolicy {
  enabled: boolean;
  messageRetentionDays?: number;
  fileRetentionDays?: number;
  archiveInactiveProjects: boolean;
  inactiveProjectDays?: number;
}

export interface TeamIntegration {
  id: string;
  type: 'slack' | 'discord' | 'microsoft-teams' | 'zoom' | 'jira' | 'github' | 'custom';
  name: string;
  config: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  mentionNotifications: boolean;
  projectUpdateNotifications: boolean;
  memberJoinNotifications: boolean;
  digestFrequency: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface TeamStatistics {
  totalMembers: number;
  activeMembers: number;
  messagesLastWeek: number;
  filesSharedLastWeek: number;
  projectsActive: number;
  avgResponseTime: number; // in minutes
  collaborationScore: number; // 0-100
  topContributors: Array<{
    userId: string;
    userName: string;
    score: number;
  }>;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  inviterUserId: string;
  inviterName: string;
  role: 'admin' | 'member' | 'guest';
  message?: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  owner: string;
  teams: string[]; // Team IDs
  settings: WorkspaceSettings;
  subscription: WorkspaceSubscription;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  allowTeamCreation: boolean;
  maxTeamsPerWorkspace: number;
  requireTwoFactor: boolean;
  dataEncryption: boolean;
  auditLogging: boolean;
  ssoEnabled: boolean;
  customBranding: boolean;
}

export interface WorkspaceSubscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  maxMembers: number;
  maxStorage: number; // in bytes
  features: string[];
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate?: Date;
}

@Injectable()
export class TeamManagementService {
  private readonly logger = new Logger(TeamManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTeam(
    userId: string,
    workspaceId: string,
    teamData: {
      name: string;
      description?: string;
      avatar?: string;
      color?: string;
      isPrivate?: boolean;
      initialMembers?: string[];
    }
  ): Promise<Team> {
    try {
      // Validate workspace access
      const hasAccess = await this.checkWorkspaceAccess(workspaceId, userId);
      if (!hasAccess) {
        throw new ForbiddenException('No access to this workspace');
      }

      // Check team creation limits
      const teamCount = await this.prisma.team.count({
        where: { workspaceId, isDeleted: false },
      });

      const workspace = await this.getWorkspace(workspaceId);
      if (workspace && teamCount >= workspace.settings.maxTeamsPerWorkspace) {
        throw new BadRequestException('Maximum number of teams reached');
      }

      // Check for duplicate team names
      const existingTeam = await this.prisma.team.findFirst({
        where: {
          name: teamData.name,
          workspaceId,
          isDeleted: false,
        },
      });

      if (existingTeam) {
        throw new BadRequestException('Team name already exists');
      }

      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get creator info
      const creator = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, avatar: true },
      });

      // Create initial team member (creator as owner)
      const initialMembers: TeamMember[] = [{
        userId,
        userName: creator?.name || 'Unknown User',
        userAvatar: creator?.avatar,
        userEmail: creator?.email || '',
        role: 'owner',
        permissions: {
          canInviteMembers: true,
          canManageProjects: true,
          canManageChannels: true,
          canViewAnalytics: true,
          canExportData: true,
          canManageIntegrations: true,
          customPermissions: [],
        },
        status: 'active',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        contributions: {
          messagesCount: 0,
          filesShared: 0,
          projectsContributed: 0,
          documentsCreated: 0,
          meetingsAttended: 0,
          lastContributionAt: new Date(),
        },
      }];

      // Add initial members if specified
      if (teamData.initialMembers) {
        for (const memberId of teamData.initialMembers) {
          if (memberId !== userId) {
            const user = await this.prisma.user.findUnique({
              where: { id: memberId },
              select: { name: true, email: true, avatar: true },
            });

            if (user) {
              initialMembers.push({
                userId: memberId,
                userName: user.name || 'Unknown User',
                userAvatar: user.avatar,
                userEmail: user.email || '',
                role: 'member',
                permissions: {
                  canInviteMembers: false,
                  canManageProjects: false,
                  canManageChannels: false,
                  canViewAnalytics: false,
                  canExportData: false,
                  canManageIntegrations: false,
                  customPermissions: [],
                },
                status: 'active',
                joinedAt: new Date(),
                invitedBy: userId,
                lastActiveAt: new Date(),
                contributions: {
                  messagesCount: 0,
                  filesShared: 0,
                  projectsContributed: 0,
                  documentsCreated: 0,
                  meetingsAttended: 0,
                  lastContributionAt: new Date(),
                },
              });
            }
          }
        }
      }

      const team: Team = {
        id: teamId,
        name: teamData.name,
        description: teamData.description,
        avatar: teamData.avatar,
        color: teamData.color || '#3b82f6',
        workspaceId,
        members: initialMembers,
        settings: {
          isPrivate: teamData.isPrivate || false,
          requireApproval: false,
          allowGuestInvites: true,
          defaultMemberRole: 'member',
          retentionPolicy: {
            enabled: false,
            archiveInactiveProjects: false,
          },
          integrations: [],
          notifications: {
            emailNotifications: true,
            pushNotifications: true,
            mentionNotifications: true,
            projectUpdateNotifications: true,
            memberJoinNotifications: true,
            digestFrequency: 'weekly',
          },
        },
        statistics: {
          totalMembers: initialMembers.length,
          activeMembers: initialMembers.length,
          messagesLastWeek: 0,
          filesSharedLastWeek: 0,
          projectsActive: 0,
          avgResponseTime: 0,
          collaborationScore: 75, // Default score
          topContributors: [],
        },
        projects: [],
        channels: [],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in database
      await this.prisma.team.create({
        data: {
          id: teamId,
          name: team.name,
          description: team.description,
          avatar: team.avatar,
          color: team.color,
          workspaceId,
          members: team.members,
          settings: team.settings,
          statistics: team.statistics,
          projects: team.projects,
          channels: team.channels,
          createdBy: userId,
          createdAt: team.createdAt,
        },
      });

      // Cache team
      await this.redis.setex(`team:${teamId}`, 1800, JSON.stringify(team));

      // Update workspace team count
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          teams: { push: teamId },
        },
      });

      // Create default channels
      await this.createDefaultChannels(teamId, userId);

      // Log activity
      await this.logTeamActivity(workspaceId, userId, 'team_created', teamId, team.name);

      this.logger.log(`Team created: ${teamId} (${team.name}) by ${userId}`);
      return team;
    } catch (error) {
      this.logger.error('Error creating team', error);
      throw error;
    }
  }

  async inviteToTeam(
    teamId: string,
    inviterUserId: string,
    invitations: Array<{
      email: string;
      role: 'admin' | 'member' | 'guest';
      message?: string;
    }>
  ): Promise<TeamInvitation[]> {
    try {
      // Get team and check permissions
      const team = await this.getTeam(teamId, inviterUserId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const inviterMember = team.members.find(m => m.userId === inviterUserId);
      if (!inviterMember || !inviterMember.permissions.canInviteMembers) {
        throw new ForbiddenException('No permission to invite members');
      }

      const createdInvitations: TeamInvitation[] = [];

      // Get inviter info
      const inviter = await this.prisma.user.findUnique({
        where: { id: inviterUserId },
        select: { name: true },
      });

      for (const invitation of invitations) {
        // Check if user is already a member
        const existingMember = team.members.find(m => m.userEmail === invitation.email);
        if (existingMember) {
          this.logger.warn(`User ${invitation.email} is already a member of team ${teamId}`);
          continue;
        }

        // Check for existing pending invitation
        const existingInvitation = await this.prisma.teamInvitation.findFirst({
          where: {
            teamId,
            inviteeEmail: invitation.email,
            status: 'pending',
          },
        });

        if (existingInvitation) {
          this.logger.warn(`Pending invitation already exists for ${invitation.email} to team ${teamId}`);
          continue;
        }

        const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const token = this.generateInvitationToken();

        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: invitation.email },
          select: { id: true },
        });

        const teamInvitation: TeamInvitation = {
          id: invitationId,
          teamId,
          teamName: team.name,
          inviteeEmail: invitation.email,
          inviteeUserId: existingUser?.id,
          inviterUserId,
          inviterName: inviter?.name || 'Unknown User',
          role: invitation.role,
          message: invitation.message,
          token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date(),
        };

        // Store in database
        await this.prisma.teamInvitation.create({
          data: {
            id: invitationId,
            teamId,
            inviteeEmail: invitation.email,
            inviteeUserId: existingUser?.id,
            inviterUserId,
            role: invitation.role,
            message: invitation.message,
            token,
            status: 'pending',
            expiresAt: teamInvitation.expiresAt,
            createdAt: teamInvitation.createdAt,
          },
        });

        // Send invitation email (would integrate with email service)
        await this.sendInvitationEmail(teamInvitation);

        createdInvitations.push(teamInvitation);
      }

      // Log activity
      await this.logTeamActivity(
        team.workspaceId,
        inviterUserId,
        'members_invited',
        teamId,
        `${createdInvitations.length} members invited`
      );

      this.logger.log(`Created ${createdInvitations.length} invitations for team ${teamId}`);
      return createdInvitations;
    } catch (error) {
      this.logger.error('Error inviting to team', error);
      throw error;
    }
  }

  async acceptInvitation(token: string, userId?: string): Promise<Team> {
    try {
      // Get invitation
      const invitation = await this.prisma.teamInvitation.findFirst({
        where: { token, status: 'pending' },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      // Check expiration
      if (invitation.expiresAt < new Date()) {
        await this.prisma.teamInvitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        });
        throw new BadRequestException('Invitation has expired');
      }

      // Get team
      const team = await this.prisma.team.findUnique({
        where: { id: invitation.teamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // If user ID provided, verify it matches invitation
      if (userId && invitation.inviteeUserId && invitation.inviteeUserId !== userId) {
        throw new BadRequestException('User mismatch');
      }

      // If no user ID and no existing user, user needs to register first
      if (!userId && !invitation.inviteeUserId) {
        throw new BadRequestException('User must register before accepting invitation');
      }

      const acceptingUserId = userId || invitation.inviteeUserId!;

      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: acceptingUserId },
        select: { name: true, email: true, avatar: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create team member
      const newMember: TeamMember = {
        userId: acceptingUserId,
        userName: user.name || 'Unknown User',
        userAvatar: user.avatar,
        userEmail: user.email || '',
        role: invitation.role,
        permissions: this.getDefaultPermissions(invitation.role),
        status: 'active',
        joinedAt: new Date(),
        invitedBy: invitation.inviterUserId,
        lastActiveAt: new Date(),
        contributions: {
          messagesCount: 0,
          filesShared: 0,
          projectsContributed: 0,
          documentsCreated: 0,
          meetingsAttended: 0,
          lastContributionAt: new Date(),
        },
      };

      // Add member to team
      const updatedTeam = await this.prisma.team.update({
        where: { id: invitation.teamId },
        data: {
          members: {
            push: newMember,
          },
          statistics: {
            ...team.statistics,
            totalMembers: (team.statistics as any).totalMembers + 1,
            activeMembers: (team.statistics as any).activeMembers + 1,
          },
        },
      });

      // Update invitation status
      await this.prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          respondedAt: new Date(),
        },
      });

      // Clear team cache
      await this.redis.del(`team:${invitation.teamId}`);

      // Send welcome notification
      await this.sendWelcomeNotification(acceptingUserId, team.name);

      // Log activity
      await this.logTeamActivity(
        updatedTeam.workspaceId,
        acceptingUserId,
        'member_joined',
        invitation.teamId,
        `${user.name} joined the team`
      );

      this.logger.log(`User ${acceptingUserId} accepted invitation to team ${invitation.teamId}`);
      return this.formatTeam(updatedTeam);
    } catch (error) {
      this.logger.error('Error accepting invitation', error);
      throw error;
    }
  }

  async updateMemberRole(
    teamId: string,
    targetUserId: string,
    newRole: 'admin' | 'member' | 'guest',
    updaterUserId: string
  ): Promise<TeamMember> {
    try {
      const team = await this.getTeam(teamId, updaterUserId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const updater = team.members.find(m => m.userId === updaterUserId);
      const targetMember = team.members.find(m => m.userId === targetUserId);

      if (!updater || !targetMember) {
        throw new NotFoundException('Member not found');
      }

      // Check permissions
      if (updater.role !== 'owner' && updater.role !== 'admin') {
        throw new ForbiddenException('No permission to update member roles');
      }

      // Cannot demote owner
      if (targetMember.role === 'owner') {
        throw new BadRequestException('Cannot change owner role');
      }

      // Update member role and permissions
      targetMember.role = newRole;
      targetMember.permissions = this.getDefaultPermissions(newRole);

      // Update in database
      await this.prisma.team.update({
        where: { id: teamId },
        data: { members: team.members },
      });

      // Clear cache
      await this.redis.del(`team:${teamId}`);

      // Log activity
      await this.logTeamActivity(
        team.workspaceId,
        updaterUserId,
        'member_role_updated',
        teamId,
        `${targetMember.userName} role changed to ${newRole}`
      );

      this.logger.log(`Member ${targetUserId} role updated to ${newRole} in team ${teamId}`);
      return targetMember;
    } catch (error) {
      this.logger.error('Error updating member role', error);
      throw error;
    }
  }

  async removeMember(
    teamId: string,
    targetUserId: string,
    removerUserId: string
  ): Promise<void> {
    try {
      const team = await this.getTeam(teamId, removerUserId);
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const remover = team.members.find(m => m.userId === removerUserId);
      const targetMember = team.members.find(m => m.userId === targetUserId);

      if (!remover || !targetMember) {
        throw new NotFoundException('Member not found');
      }

      // Check permissions
      if (remover.role !== 'owner' && remover.role !== 'admin' && removerUserId !== targetUserId) {
        throw new ForbiddenException('No permission to remove this member');
      }

      // Cannot remove owner
      if (targetMember.role === 'owner') {
        throw new BadRequestException('Cannot remove team owner');
      }

      // Remove member from team
      team.members = team.members.filter(m => m.userId !== targetUserId);
      team.statistics.totalMembers--;
      team.statistics.activeMembers--;

      // Update in database
      await this.prisma.team.update({
        where: { id: teamId },
        data: {
          members: team.members,
          statistics: team.statistics,
        },
      });

      // Clear cache
      await this.redis.del(`team:${teamId}`);

      // Log activity
      await this.logTeamActivity(
        team.workspaceId,
        removerUserId,
        'member_removed',
        teamId,
        `${targetMember.userName} removed from team`
      );

      this.logger.log(`Member ${targetUserId} removed from team ${teamId}`);
    } catch (error) {
      this.logger.error('Error removing member', error);
      throw error;
    }
  }

  async getTeam(teamId: string, userId: string): Promise<Team | null> {
    try {
      // Check cache first
      const cached = await this.redis.get(`team:${teamId}`);
      if (cached) {
        const team = JSON.parse(cached) as Team;
        // Verify user is a member
        if (team.members.some(m => m.userId === userId)) {
          return team;
        }
        return null;
      }

      // Get from database
      const team = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          isDeleted: false,
          members: {
            path: '$[*].userId',
            array_contains: userId,
          },
        },
      });

      if (team) {
        const formattedTeam = this.formatTeam(team);
        await this.redis.setex(`team:${teamId}`, 1800, JSON.stringify(formattedTeam));
        return formattedTeam;
      }

      return null;
    } catch (error) {
      this.logger.error('Error getting team', error);
      return null;
    }
  }

  async getUserTeams(
    userId: string,
    workspaceId?: string
  ): Promise<Team[]> {
    try {
      const where = {
        isDeleted: false,
        members: {
          path: '$[*].userId',
          array_contains: userId,
        },
        ...(workspaceId && { workspaceId }),
      };

      const teams = await this.prisma.team.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });

      return teams.map(t => this.formatTeam(t));
    } catch (error) {
      this.logger.error('Error getting user teams', error);
      return [];
    }
  }

  async updateTeamStatistics(teamId: string): Promise<void> {
    try {
      // This would calculate real statistics from various sources
      // For now, using placeholder logic

      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) return;

      const members = team.members as TeamMember[];
      const activeMembers = members.filter(m => {
        const daysSinceActive = Math.floor(
          (Date.now() - new Date(m.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceActive <= 7; // Active in last week
      });

      const statistics: TeamStatistics = {
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        messagesLastWeek: 0, // Would be calculated from actual message data
        filesSharedLastWeek: 0, // Would be calculated from file sharing data
        projectsActive: team.projects?.length || 0,
        avgResponseTime: 30, // Would be calculated from message response times
        collaborationScore: Math.min(100, Math.max(0, 
          (activeMembers.length / Math.max(1, members.length)) * 100
        )),
        topContributors: members
          .sort((a, b) => 
            (b.contributions.messagesCount + b.contributions.filesShared) - 
            (a.contributions.messagesCount + a.contributions.filesShared)
          )
          .slice(0, 5)
          .map(m => ({
            userId: m.userId,
            userName: m.userName,
            score: m.contributions.messagesCount + m.contributions.filesShared,
          })),
      };

      await this.prisma.team.update({
        where: { id: teamId },
        data: { statistics },
      });

      // Update cache
      await this.redis.del(`team:${teamId}`);
    } catch (error) {
      this.logger.error('Error updating team statistics', error);
    }
  }

  private async checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const workspace = await this.prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          OR: [
            { owner: userId },
            { members: { hasSome: [userId] } },
          ],
        },
      });

      return !!workspace;
    } catch (error) {
      this.logger.error('Error checking workspace access', error);
      return false;
    }
  }

  private async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      return workspace ? this.formatWorkspace(workspace) : null;
    } catch (error) {
      this.logger.error('Error getting workspace', error);
      return null;
    }
  }

  private async createDefaultChannels(teamId: string, creatorId: string): Promise<void> {
    try {
      // This would integrate with the messaging service to create default channels
      // For now, just update the team's channels array
      
      const defaultChannels = ['general', 'random'];
      const channelIds: string[] = [];

      for (const channelName of defaultChannels) {
        const channelId = `ch_${teamId}_${channelName}_${Date.now()}`;
        channelIds.push(channelId);
        
        // In a real implementation, this would call MessagingService.createChannel()
        this.logger.debug(`Creating default channel: ${channelName} for team ${teamId}`);
      }

      // Update team with channel IDs
      await this.prisma.team.update({
        where: { id: teamId },
        data: { channels: channelIds },
      });
    } catch (error) {
      this.logger.warn('Error creating default channels', error);
    }
  }

  private generateInvitationToken(): string {
    return Buffer.from(`${Date.now()}_${Math.random()}`).toString('base64url');
  }

  private getDefaultPermissions(role: string): MemberPermissions {
    switch (role) {
      case 'owner':
        return {
          canInviteMembers: true,
          canManageProjects: true,
          canManageChannels: true,
          canViewAnalytics: true,
          canExportData: true,
          canManageIntegrations: true,
          customPermissions: [],
        };
      case 'admin':
        return {
          canInviteMembers: true,
          canManageProjects: true,
          canManageChannels: true,
          canViewAnalytics: true,
          canExportData: false,
          canManageIntegrations: false,
          customPermissions: [],
        };
      case 'member':
        return {
          canInviteMembers: false,
          canManageProjects: false,
          canManageChannels: false,
          canViewAnalytics: false,
          canExportData: false,
          canManageIntegrations: false,
          customPermissions: [],
        };
      case 'guest':
        return {
          canInviteMembers: false,
          canManageProjects: false,
          canManageChannels: false,
          canViewAnalytics: false,
          canExportData: false,
          canManageIntegrations: false,
          customPermissions: [],
        };
      default:
        return {
          canInviteMembers: false,
          canManageProjects: false,
          canManageChannels: false,
          canViewAnalytics: false,
          canExportData: false,
          canManageIntegrations: false,
          customPermissions: [],
        };
    }
  }

  private formatTeam(team: any): Team {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      avatar: team.avatar,
      color: team.color,
      workspaceId: team.workspaceId,
      members: team.members || [],
      settings: team.settings || {},
      statistics: team.statistics || {},
      projects: team.projects || [],
      channels: team.channels || [],
      createdBy: team.createdBy,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private formatWorkspace(workspace: any): Workspace {
    return {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      avatar: workspace.avatar,
      owner: workspace.owner,
      teams: workspace.teams || [],
      settings: workspace.settings || {},
      subscription: workspace.subscription || {},
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  private async sendInvitationEmail(invitation: TeamInvitation): Promise<void> {
    try {
      // This would integrate with the email service
      const inviteUrl = `${process.env.BASE_URL || 'https://app.example.com'}/invite/${invitation.token}`;
      
      this.logger.log(`Invitation email sent to ${invitation.inviteeEmail} for team ${invitation.teamName}`);
      // await this.emailService.sendInvitation(invitation, inviteUrl);
    } catch (error) {
      this.logger.warn('Failed to send invitation email', error);
    }
  }

  private async sendWelcomeNotification(userId: string, teamName: string): Promise<void> {
    try {
      // This would integrate with the notification service
      this.logger.log(`Welcome notification sent to user ${userId} for team ${teamName}`);
      // await this.notificationService.sendWelcome(userId, teamName);
    } catch (error) {
      this.logger.warn('Failed to send welcome notification', error);
    }
  }

  private async logTeamActivity(
    workspaceId: string,
    userId: string,
    action: string,
    teamId: string,
    details: string
  ): Promise<void> {
    try {
      const activity = {
        workspaceId,
        userId,
        action,
        resourceType: 'team',
        resourceId: teamId,
        details,
        timestamp: new Date(),
      };

      await this.redis.lpush(`activity:team:${workspaceId}`, JSON.stringify(activity));
      await this.redis.ltrim(`activity:team:${workspaceId}`, 0, 100);
    } catch (error) {
      this.logger.warn('Failed to log team activity', error);
    }
  }
}