// path: backend/src/modules/enterprise-email/services/email-account.service.ts
// purpose: Enterprise email account management with multi-provider support and security
// dependencies: @nestjs/common, prisma, crypto, oauth, imap, smtp

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import * as crypto from 'crypto';
import Imap from 'imap';
import * as nodemailer from 'nodemailer';

export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  provider: EmailProvider;
  isPrimary: boolean; // mapped to prisma field `isDefault`
  isActive: boolean;
  smtpConfig: SMTPConfig;
  imapConfig: IMAPConfig;
  oauthConfig?: OAuthConfig;
  syncSettings: SyncSettings;
  securitySettings: SecuritySettings;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  authMethod: 'password' | 'oauth2' | 'xoauth2';
}

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  authMethod: 'password' | 'oauth2' | 'xoauth2';
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiry?: Date;
}

export interface SyncSettings {
  enabled: boolean;
  syncInterval: number; // minutes
  syncFolders: string[];
  maxEmailAge: number; // days
  downloadAttachments: boolean;
}

export interface SecuritySettings {
  requireTLS: boolean;
  allowInsecureAuth: boolean;
  enableSpamFilter: boolean;
  enableVirusScanning: boolean;
}

export enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  YAHOO = 'yahoo',
  IMAP = 'imap',
  EXCHANGE = 'exchange',
  CUSTOM = 'custom'
}

export interface ConnectionTestResult {
  smtp: {
    success: boolean;
    error?: string;
    latency?: number;
  };
  imap: {
    success: boolean;
    error?: string;
    latency?: number;
    folderCount?: number;
  };
}

@Injectable()
export class EmailAccountService {
  private readonly logger = new Logger(EmailAccountService.name);
  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-me';
  private connectionCache = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createEmailAccount(
    userId: string,
    tenantId: string,
    accountData: {
      name: string;
      email: string;
      provider: EmailProvider;
      smtpConfig: SMTPConfig;
      imapConfig: IMAPConfig;
      oauthConfig?: OAuthConfig;
      syncSettings?: Partial<SyncSettings>;
      securitySettings?: Partial<SecuritySettings>;
      isPrimary?: boolean;
    }
  ): Promise<EmailAccount> {
    try {
      // Check if email account already exists
      const existingAccount = await this.prisma.emailAccount.findFirst({
        where: { email: accountData.email, tenantId },
      });

      if (existingAccount) {
        throw new ConflictException('Email account already exists');
      }

      // Test connection before creating
      const connectionTest = await this.testConnection(accountData.smtpConfig, accountData.imapConfig);
      if (!connectionTest.smtp.success || !connectionTest.imap.success) {
        throw new BadRequestException('Connection test failed. Please check your settings.');
      }

      // If this is the first account or explicitly set as primary, make it primary
      const existingPrimary = await this.prisma.emailAccount.findFirst({
        where: { userId, tenantId, isDefault: true },
      });

      const isPrimary = accountData.isPrimary || !existingPrimary;

      // If setting as primary, unset other primary accounts
      if (isPrimary && existingPrimary) {
        await this.prisma.emailAccount.updateMany({
          where: { userId, tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Encrypt sensitive data
  const encryptedSMTPConfig = this.encryptConfig(accountData.smtpConfig);
  const encryptedIMAPConfig = this.encryptConfig(accountData.imapConfig);
  const encryptedOAuthConfig = accountData.oauthConfig ? this.encryptConfig(accountData.oauthConfig) : null;

      // Create email account
      const syncSettings: SyncSettings = {
        enabled: accountData.syncSettings?.enabled !== false,
        syncInterval: accountData.syncSettings?.syncInterval || 15,
        syncFolders: accountData.syncSettings?.syncFolders || ['INBOX'],
        maxEmailAge: accountData.syncSettings?.maxEmailAge || 30,
        downloadAttachments: accountData.syncSettings?.downloadAttachments !== false,
      };
      // Persist provider within syncSettings for now to preserve API shape
      (syncSettings as any).provider = accountData.provider;

      const securitySettings: any = {
        requireTLS: accountData.securitySettings?.requireTLS !== false,
        allowInsecureAuth: accountData.securitySettings?.allowInsecureAuth || false,
        enableSpamFilter: accountData.securitySettings?.enableSpamFilter !== false,
        enableVirusScanning: accountData.securitySettings?.enableVirusScanning !== false,
      };
      if (encryptedOAuthConfig) {
        securitySettings.oauthEncrypted = encryptedOAuthConfig;
      }

      const emailAccount = await this.prisma.emailAccount.create({
        data: {
          name: accountData.name,
          displayName: accountData.name,
          email: accountData.email,
          isDefault: isPrimary,
          isActive: true,
          smtpSettings: encryptedSMTPConfig as any,
          imapSettings: encryptedIMAPConfig as any,
          syncSettings: syncSettings as any,
          securitySettings: securitySettings as any,
          userId,
          tenantId,
        },
      });

      // Start initial sync if enabled
      if ((emailAccount as any).syncSettings && (emailAccount as any).syncSettings['enabled']) {
        await this.scheduleSyncJob(emailAccount.id);
      }

      this.logger.log(`Email account created: ${accountData.email} for user ${userId}`);
      return this.formatEmailAccount(emailAccount);
    } catch (error) {
      this.logger.error('Error creating email account', error);
      throw error;
    }
  }

  async updateEmailAccount(
    accountId: string,
    userId: string,
    tenantId: string,
    updates: Partial<EmailAccount>
  ): Promise<EmailAccount> {
    try {
      const existingAccount = await this.prisma.emailAccount.findFirst({
        where: { id: accountId, userId, tenantId },
      });

      if (!existingAccount) {
        throw new NotFoundException('Email account not found');
      }

      // Test connection if SMTP/IMAP configs are being updated
      if (updates.smtpConfig || updates.imapConfig) {
        const smtpConfig = updates.smtpConfig || this.decryptConfig((existingAccount as any).smtpSettings);
        const imapConfig = updates.imapConfig || this.decryptConfig((existingAccount as any).imapSettings);
        
        const connectionTest = await this.testConnection(smtpConfig, imapConfig);
        if (!connectionTest.smtp.success || !connectionTest.imap.success) {
          throw new BadRequestException('Connection test failed with new settings');
        }
      }

      // Handle primary account changes
      if (updates.isPrimary && !(existingAccount as any).isDefault) {
        await this.prisma.emailAccount.updateMany({
          where: { userId, tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Prepare update data
      const updateData: any = {};
      
      if (updates.name) {
        updateData.name = updates.name;
        updateData.displayName = updates.name;
      }
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.isPrimary !== undefined) updateData.isDefault = updates.isPrimary;

      if (updates.smtpConfig) updateData.smtpSettings = this.encryptConfig(updates.smtpConfig);
      if (updates.imapConfig) updateData.imapSettings = this.encryptConfig(updates.imapConfig);
      if (updates.oauthConfig) {
        const sec = (existingAccount as any).securitySettings || {};
        sec.oauthEncrypted = this.encryptConfig(updates.oauthConfig);
        updateData.securitySettings = sec as any;
      }
      if (updates.syncSettings) {
        // preserve provider if present
        const current = (existingAccount as any).syncSettings || {};
        const merged = { ...current, ...updates.syncSettings } as any;
        if ((updates as any).provider) merged.provider = (updates as any).provider;
        updateData.syncSettings = merged as any;
      }
      if (updates.securitySettings) {
        const currentSec = (existingAccount as any).securitySettings || {};
        updateData.securitySettings = { ...currentSec, ...updates.securitySettings } as any;
      }

      const updatedAccount = await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: updateData,
      });

      // Clear connection cache
      this.connectionCache.delete(accountId);

      this.logger.log(`Email account updated: ${accountId}`);
      return this.formatEmailAccount(updatedAccount);
    } catch (error) {
      this.logger.error('Error updating email account', error);
      throw error;
    }
  }

  async deleteEmailAccount(accountId: string, userId: string, tenantId: string): Promise<void> {
    try {
      const account = await this.prisma.emailAccount.findFirst({
        where: { id: accountId, userId, tenantId },
      });

      if (!account) {
        throw new NotFoundException('Email account not found');
      }

      // Check if this is the primary account and there are other accounts
      if ((account as any).isDefault) {
        const otherAccounts = await this.prisma.emailAccount.findMany({
          where: { userId, tenantId, id: { not: accountId } },
        });

        if (otherAccounts.length > 0) {
          // Make the first other account primary
          await this.prisma.emailAccount.update({
            where: { id: otherAccounts[0].id },
            data: { isDefault: true },
          });
        }
      }

      // Stop sync job
      await this.cancelSyncJob(accountId);

      // Delete account
      await this.prisma.emailAccount.delete({
        where: { id: accountId },
      });

      // Clear caches
      this.connectionCache.delete(accountId);
  await this.redis.del(`account:${accountId}:*`);

      this.logger.log(`Email account deleted: ${accountId}`);
    } catch (error) {
      this.logger.error('Error deleting email account', error);
      throw error;
    }
  }

  async getUserEmailAccounts(userId: string, tenantId: string): Promise<EmailAccount[]> {
    try {
      const accounts = await this.prisma.emailAccount.findMany({
        where: { userId, tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      return accounts.map(account => this.formatEmailAccount(account));
    } catch (error) {
      this.logger.error('Error getting user email accounts', error);
      throw error;
    }
  }

  async getUserPrimaryAccount(userId: string, tenantId: string): Promise<EmailAccount | null> {
    try {
      const account = await this.prisma.emailAccount.findFirst({
        where: { userId, tenantId, isDefault: true, isActive: true },
      });

      return account ? this.formatEmailAccount(account) : null;
    } catch (error) {
      this.logger.error('Error getting user primary account', error);
      throw error;
    }
  }

  async testConnection(smtpConfig: SMTPConfig, imapConfig: IMAPConfig): Promise<ConnectionTestResult> {
    const result: ConnectionTestResult = {
      smtp: { success: false },
      imap: { success: false },
    };

    try {
      // Test SMTP connection
      const smtpStart = Date.now();
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.authMethod === 'password' ? {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        } : undefined,
      });

      try {
        await transporter.verify();
        result.smtp = {
          success: true,
          latency: Date.now() - smtpStart,
        };
      } catch (error) {
        result.smtp = {
          success: false,
          error: error.message,
        };
      }

      // Test IMAP connection
      const imapStart = Date.now();
      const imap = new Imap({
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.secure,
        user: imapConfig.username,
        password: imapConfig.password,
      });

      try {
        await new Promise((resolve, reject) => {
          imap.once('ready', () => {
            imap.getBoxes((err, boxes) => {
              if (err) reject(err);
              else {
                result.imap = {
                  success: true,
                  latency: Date.now() - imapStart,
                  folderCount: Object.keys(boxes).length,
                };
                resolve(true);
              }
            });
          });
          imap.once('error', reject);
          imap.connect();
        });
      } catch (error) {
        result.imap = {
          success: false,
          error: error.message,
        };
      } finally {
        try { imap.end(); } catch {}
      }

      return result;
    } catch (error) {
      this.logger.error('Error testing connection', error);
      return result;
    }
  }

  async syncAccount(accountId: string): Promise<{
    success: boolean;
    syncedEmails: number;
    error?: string;
  }> {
    try {
      const account = await this.prisma.emailAccount.findFirst({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException('Email account not found');
      }

      if (!((account as any).syncSettings && (account as any).syncSettings['enabled'])) {
        return { success: false, syncedEmails: 0, error: 'Sync disabled' };
      }

      const imapConfig = this.decryptConfig((account as any).imapSettings);
      
      // Implement IMAP sync logic here
      // This is a simplified version - in practice you'd need full IMAP implementation
      const syncedEmails = await this.performIMAPSync(imapConfig, account);

      // Update last sync time
      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: { lastSync: new Date() },
      });

      this.logger.log(`Account synced: ${accountId} - ${syncedEmails} emails`);
      return { success: true, syncedEmails };
    } catch (error) {
      this.logger.error('Error syncing account', error);
      return { success: false, syncedEmails: 0, error: error.message };
    }
  }

  async refreshOAuthToken(accountId: string): Promise<void> {
    try {
      const account = await this.prisma.emailAccount.findFirst({
        where: { id: accountId },
      });

      const hasOAuth = !!((account as any)?.securitySettings && (account as any).securitySettings['oauthEncrypted']);
      if (!account || !hasOAuth) {
        throw new NotFoundException('OAuth account not found');
      }

      const oauthConfig = this.decryptConfig((account as any).securitySettings['oauthEncrypted']);
      
      // Implement OAuth token refresh logic here
      // This would vary based on the provider (Gmail, Outlook, etc.)
      const provider: EmailProvider = ((account as any).syncSettings && (account as any).syncSettings['provider'])
        ? (account as any).syncSettings['provider']
        : EmailProvider.CUSTOM;
      const newTokens = await this.refreshProviderToken(provider, oauthConfig);

      // Update stored tokens
      const updatedOAuthConfig = {
        ...oauthConfig,
        accessToken: newTokens.accessToken,
        accessTokenExpiry: newTokens.expiresAt,
      };

      await this.prisma.emailAccount.update({
        where: { id: accountId },
        data: {
          securitySettings: {
            ...((account as any).securitySettings || {}),
            oauthEncrypted: this.encryptConfig(updatedOAuthConfig),
          } as any,
        },
      });

      this.logger.log(`OAuth token refreshed for account: ${accountId}`);
    } catch (error) {
      this.logger.error('Error refreshing OAuth token', error);
      throw error;
    }
  }

  async getAccountStatistics(accountId: string): Promise<{
    totalEmails: number;
    unreadEmails: number;
    lastSync: Date;
    syncStatus: string;
    storageUsed: number;
  }> {
    try {
      const account = await this.prisma.emailAccount.findFirst({
        where: { id: accountId },
      });

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      // Approximate statistics by matching user's emails where the account email appears in from or to
      const acctEmail = (account as any).email as string;
      const userId = (account as any).userId as string;
      const tenantId = (account as any).tenantId as string;

      const totalEmails = await this.prisma.enterpriseEmail.count({
        where: {
          userId,
          tenantId,
          OR: [
            { from: acctEmail },
            { to: { has: acctEmail } },
          ],
        },
      });

      const unreadEmails = await this.prisma.enterpriseEmail.count({
        where: {
          userId,
          tenantId,
          isRead: false,
          OR: [
            { from: acctEmail },
            { to: { has: acctEmail } },
          ],
        },
      });

      return {
        totalEmails,
        unreadEmails,
        lastSync: (account as any).lastSync ?? null,
        syncStatus: ((account as any).syncSettings && (account as any).syncSettings['enabled']) ? 'enabled' : 'disabled',
        storageUsed: 0,
      };
    } catch (error) {
      this.logger.error('Error getting account statistics', error);
      throw error;
    }
  }

  private formatEmailAccount(account: any): EmailAccount {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      provider: (account.syncSettings && account.syncSettings.provider) ? account.syncSettings.provider : EmailProvider.CUSTOM,
      isPrimary: account.isDefault,
      isActive: account.isActive,
      smtpConfig: this.decryptConfig(account.smtpSettings),
      imapConfig: this.decryptConfig(account.imapSettings),
      oauthConfig: account.securitySettings?.oauthEncrypted ? this.decryptConfig(account.securitySettings.oauthEncrypted) : undefined,
      syncSettings: account.syncSettings || {},
      securitySettings: account.securitySettings || {},
    };
  }

  private encryptConfig(config: any): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logger.error('Error encrypting config', error);
      throw error;
    }
  }

  private decryptConfig(encryptedConfig: any): any {
    try {
      if (typeof encryptedConfig !== 'string') {
        return encryptedConfig; // Already decrypted
      }
      
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedConfig, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Error decrypting config', error);
      throw error;
    }
  }

  private async scheduleSyncJob(accountId: string): Promise<void> {
    try {
      // Add to Redis for scheduled sync
      const syncKey = `sync:${accountId}`;
      await this.redis.set(syncKey, 'scheduled');
      this.logger.log(`Sync job scheduled for account: ${accountId}`);
    } catch (error) {
      this.logger.warn('Failed to schedule sync job', error);
    }
  }

  private async cancelSyncJob(accountId: string): Promise<void> {
    try {
      const syncKey = `sync:${accountId}`;
      await this.redis.del(syncKey);
      this.logger.log(`Sync job cancelled for account: ${accountId}`);
    } catch (error) {
      this.logger.warn('Failed to cancel sync job', error);
    }
  }

  private async performIMAPSync(imapConfig: IMAPConfig, account: any): Promise<number> {
    // This is a placeholder implementation
    // In a real system, you'd implement full IMAP email synchronization
    return 0;
  }

  private async refreshProviderToken(provider: EmailProvider, oauthConfig: OAuthConfig): Promise<{
    accessToken: string;
    expiresAt: Date;
  }> {
    // This is a placeholder implementation
    // In a real system, you'd implement OAuth refresh for each provider
    return {
      accessToken: 'new-access-token',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }
}