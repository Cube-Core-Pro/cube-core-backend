// path: backend/src/modules/enterprise-email/enterprise-email.service.ts
// purpose: Enterprise email service with AI anti-spam, advanced filtering, and email management
// dependencies: @nestjs/common, prisma, redis, nodemailer, ai-processing

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { EmailFilterService } from './services/email-filter.service';
import { EmailAttachmentService } from './services/email-attachment.service';
import { EmailAccountService } from './services/email-account.service';
import { EmailSignatureService } from './services/email-signature.service';
import { AntiSpamService } from './services/anti-spam.service';
import {
  SendEmailDto,
  EmailPriority,
} from './dto/send-email.dto';
import { CreateEmailFolderDto } from './dto/create-email-folder.dto';
import { EmailSearchDto } from './dto/email-search.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EnterpriseEmailService {
  private readonly logger = new Logger(EnterpriseEmailService.name);
  private transporters = new Map<string, nodemailer.Transporter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly filterService: EmailFilterService,
    private readonly attachmentService: EmailAttachmentService,
    private readonly accountService: EmailAccountService,
    private readonly signatureService: EmailSignatureService,
    private readonly antiSpamService: AntiSpamService,
  ) {}

  async sendEmail(userId: string, tenantId: string, dto: SendEmailDto) {
    try {
      // Get user's email account
      const emailAccount = await this.accountService.getUserPrimaryAccount(userId, tenantId);
      if (!emailAccount) {
        throw new NotFoundException('No email account configured');
      }

      // Get email signature if enabled
      let emailBody = dto.body;
      if (dto.includeSignature !== false) {
        const signature = await this.signatureService.getUserSignature(userId, tenantId);
        if (signature) {
          emailBody += signature.htmlContent || signature.textContent;
        }
      }

      // Process attachments
      const attachments = [];
      if (dto.attachments && dto.attachments.length > 0) {
        for (const attachment of dto.attachments) {
          const processedAttachment = await this.attachmentService.processAttachment(
            attachment,
            userId,
            tenantId,
          );
          attachments.push(processedAttachment);
        }
      }

      // Create email record
      const email = await this.prisma.enterpriseEmail.create({
        data: {
          messageId: this.generateMessageId(emailAccount.email.split('@')[1]),
          subject: dto.subject,
          body: emailBody,
          htmlBody: dto.htmlBody,
          from: emailAccount.email,
          to: dto.to,
          cc: dto.cc || [],
          bcc: dto.bcc || [],
          replyTo: dto.replyTo,
          priority: dto.priority || 'NORMAL',
          type: dto.scheduledAt ? 'DRAFT' : 'SENT',
          attachments: attachments.map(a => ({
            id: a.id,
            filename: a.filename,
            size: a.size,
            contentType: a.contentType,
          })),
          tags: dto.tags || [],
          requestReadReceipt: dto.requestReadReceipt || false,
          isConfidential: dto.isConfidential || false,
          scheduledAt: dto.scheduledAt,
          sentAt: dto.scheduledAt ? null : new Date(),
          templateId: dto.templateId,
          templateVariables: dto.templateVariables,
          tenantId,
          userId,
        },
      });

      // Send email immediately or schedule
      if (dto.scheduledAt) {
        await this.scheduleEmail(email);
      } else {
        await this.deliverEmail(email, emailAccount, attachments);
      }

      this.logger.log(`Email ${email.messageId} processed for user ${userId}`);
      return email;
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }

  async receiveEmail(emailData: any, tenantId: string) {
    try {
      // AI-powered spam detection
      const spamAnalysis = await this.antiSpamService.analyzeEmail(emailData, tenantId);
      
      // Virus scanning
      const virusCheck = await this.antiSpamService.scanForVirus(emailData);

      // Process attachments
      const attachments = [];
      if (emailData.attachments) {
        for (const attachment of emailData.attachments) {
          const processedAttachment = await this.attachmentService.processIncomingAttachment(
            attachment,
            tenantId,
          );
          attachments.push(processedAttachment);
        }
      }

      // Find recipient user
      const recipient = await this.prisma.user.findFirst({
        where: {
          email: emailData.to[0],
          tenantId,
        },
      });

      if (!recipient) {
        this.logger.warn(`No recipient found for email to ${emailData.to[0]}`);
        return;
      }

      // Apply email filters
      const filterResult = await this.filterService.applyFilters(
        emailData,
        recipient.id,
        tenantId,
      );

      // Create email record
      const email = await this.prisma.enterpriseEmail.create({
        data: {
          messageId: emailData.messageId,
          subject: emailData.subject,
          body: emailData.body,
          htmlBody: emailData.htmlBody,
          from: emailData.from,
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          replyTo: emailData.replyTo,
          priority: emailData.priority || 'NORMAL',
          type: 'RECEIVED',
          attachments: attachments.map(a => ({
            id: a.id,
            filename: a.filename,
            size: a.size,
            contentType: a.contentType,
          })),
          tags: filterResult.tags || [],
          folderId: filterResult.folderId,
          isSpam: spamAnalysis.isSpam,
          hasVirus: virusCheck.hasVirus,
          sentAt: new Date(emailData.date),
          deliveredAt: new Date(),
          tenantId,
          userId: recipient.id,
        },
      });

      // Create attachment records
      for (const attachment of attachments) {
        await this.prisma.emailAttachment.create({
          data: {
            filename: attachment.filename,
            originalName: attachment.originalName,
            mimeType: attachment.contentType,
            size: attachment.size,
            path: attachment.path,
            isInline: attachment.isInline || false,
            contentId: attachment.contentId,
            emailId: email.id,
            tenantId,
          },
        });
      }

      // Send real-time notification if not spam
      if (!spamAnalysis.isSpam && !virusCheck.hasVirus) {
        await this.notifyNewEmail(email, recipient);
      }

      this.logger.log(`Email ${email.messageId} received and processed`);
      return email;
    } catch (error) {
      this.logger.error('Error receiving email', error);
      throw error;
    }
  }

  async getEmails(
    userId: string,
    tenantId: string,
    options: {
      folderId?: string;
      type?: string;
      isRead?: boolean;
      isSpam?: boolean;
      limit?: number;
      offset?: number;
      search?: string;
    } = {},
  ) {
    const where = {
      userId,
      tenantId,
      deletedAt: null,
      ...(options.folderId && { folderId: options.folderId }),
      ...(options.type && { type: options.type }),
      ...(options.isRead !== undefined && { isRead: options.isRead }),
      ...(options.isSpam !== undefined && { isSpam: options.isSpam }),
      ...(options.search && {
        OR: [
          { subject: { contains: options.search, mode: 'insensitive' as any } },
          { body: { contains: options.search, mode: 'insensitive' as any } },
          { from: { contains: options.search, mode: 'insensitive' as any } },
        ],
      }),
    };

    const [emails, total] = await Promise.all([
      this.prisma.enterpriseEmail.findMany({
        where,
        include: {
          folder: true,
          template: true,
          emailAttachments: true,
        },
        orderBy: { sentAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.enterpriseEmail.count({ where }),
    ]);

    return { emails, total };
  }

  async markAsRead(emailId: string, userId: string, tenantId: string) {
    const email = await this.prisma.enterpriseEmail.findFirst({
      where: { id: emailId, userId, tenantId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return this.prisma.enterpriseEmail.update({
      where: { id: emailId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async moveToFolder(
    emailIds: string[],
    folderId: string,
    userId: string,
    tenantId: string,
  ) {
    // Verify folder belongs to user
    const folder = await this.prisma.emailFolder.findFirst({
      where: { id: folderId, userId, tenantId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return this.prisma.enterpriseEmail.updateMany({
      where: {
        id: { in: emailIds },
        userId,
        tenantId,
      },
      data: { folderId },
    });
  }

  async deleteEmails(emailIds: string[], userId: string, tenantId: string) {
    return this.prisma.enterpriseEmail.updateMany({
      where: {
        id: { in: emailIds },
        userId,
        tenantId,
      },
      data: { deletedAt: new Date() },
    });
  }

  async createFolder(userId: string, tenantId: string, dto: CreateEmailFolderDto) {
    return this.prisma.emailFolder.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
        tenantId,
        userId,
      },
    });
  }

  async searchEmails(userId: string, tenantId: string, dto: EmailSearchDto) {
    const where = {
      userId,
      tenantId,
      deletedAt: null,
      ...(dto.query && {
        OR: [
          { subject: { contains: dto.query, mode: 'insensitive' as any } },
          { body: { contains: dto.query, mode: 'insensitive' as any } },
          { from: { contains: dto.query, mode: 'insensitive' as any } },
        ],
      }),
      ...(dto.from && { from: { contains: dto.from, mode: 'insensitive' as any } }),
      ...(dto.subject && { subject: { contains: dto.subject, mode: 'insensitive' as any } }),
      ...(dto.hasAttachments && { attachments: { not: [] } }),
      ...(dto.dateRange && {
        sentAt: {
          gte: dto.dateRange.from,
          lte: dto.dateRange.to,
        },
      }),
      ...(dto.tags && dto.tags.length > 0 && {
        tags: { hasSome: dto.tags },
      }),
    };

    return this.prisma.enterpriseEmail.findMany({
      where,
      include: {
        folder: true,
        emailAttachments: true,
      },
      orderBy: { sentAt: 'desc' },
      take: dto.limit || 50,
      skip: dto.offset || 0,
    });
  }

  async getEmailMetrics(tenantId: string, dateRange?: { from: Date; to: Date }) {
    const where = {
      tenantId,
      ...(dateRange && {
        sentAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      }),
    };

    const [
      totalEmails,
      sentEmails,
      receivedEmails,
      spamEmails,
      unreadEmails,
    ] = await Promise.all([
      this.prisma.enterpriseEmail.count({ where }),
      this.prisma.enterpriseEmail.count({
        where: { ...where, type: 'SENT' },
      }),
      this.prisma.enterpriseEmail.count({
        where: { ...where, type: 'RECEIVED' },
      }),
      this.prisma.enterpriseEmail.count({
        where: { ...where, isSpam: true },
      }),
      this.prisma.enterpriseEmail.count({
        where: { ...where, isRead: false, type: 'RECEIVED' },
      }),
    ]);

    return {
      totalEmails,
      sentEmails,
      receivedEmails,
      spamEmails,
      unreadEmails,
      spamRate: totalEmails > 0 ? (spamEmails / totalEmails) * 100 : 0,
    };
  }

  private generateMessageId(domain: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}.${random}@${domain}`;
  }

  private async deliverEmail(email: any, account: any, attachments: any[]) {
    try {
      const transporter = await this.getTransporter(account);
      
      const mailOptions = {
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        text: email.body,
        html: email.htmlBody,
        attachments: attachments.map(a => ({
          filename: a.filename,
          path: a.path,
          contentType: a.contentType,
        })),
        messageId: email.messageId,
        priority: email.priority?.toLowerCase(),
      };

      const result = await transporter.sendMail(mailOptions);
      
      // Update email status
      await this.prisma.enterpriseEmail.update({
        where: { id: email.id },
        data: {
          type: 'SENT',
          deliveredAt: new Date(),
        },
      });

      this.logger.log(`Email delivered: ${email.messageId}`);
      return result;
    } catch (error) {
      this.logger.error('Error delivering email', error);
      
      // Update email status to failed
      await this.prisma.enterpriseEmail.update({
        where: { id: email.id },
        data: { type: 'FAILED' },
      });
      
      throw error;
    }
  }

  private async scheduleEmail(email: any) {
    // Schedule email for later delivery
    await this.redis.zadd(
      'scheduled_emails',
      email.scheduledAt.getTime(),
      JSON.stringify({ emailId: email.id }),
    );
    
    this.logger.log(`Email scheduled: ${email.messageId} for ${email.scheduledAt}`);
  }

  private async getTransporter(account: any): Promise<nodemailer.Transporter> {
    const key = `${account.id}`;
    
    if (!this.transporters.has(key)) {
      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort,
        secure: account.smtpSecure,
        auth: {
          user: account.email,
          pass: account.password,
        },
      });
      
      this.transporters.set(key, transporter);
    }
    
    return this.transporters.get(key);
  }

  private async notifyNewEmail(email: any, recipient: any) {
    // Send real-time notification via WebSocket
    await this.redis.publish(
      `user:${recipient.id}:notifications`,
      JSON.stringify({
        type: 'NEW_EMAIL',
        email: {
          id: email.id,
          subject: email.subject,
          from: email.from,
          sentAt: email.sentAt,
        },
      }),
    );
  }
}
