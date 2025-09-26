// path: backend/src/modules/webmail/webmail.service.ts
// purpose: Core WebMail service for enterprise email management
// dependencies: NestJS, Prisma, IMAP/SMTP, Bull queues, security

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import Imap from 'imap';
import { Prisma, Email as PrismaEmail, EmailAttachment as PrismaEmailAttachment } from '@prisma/client';
import {
  SendEmailDto,
  CreateFolderDto,
  EmailQueryDto,
  UpdateEmailDto,
  EmailSearchDto,
  EmailPriority,
} from './dto/webmail.dto';

export interface EmailMessage {
  id: string;
  messageId: string;
  subject: string | null;
  from: string;
  fromName?: string | null;
  replyTo?: string | null;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  htmlBody?: string | null;
  attachments?: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  isSpam: boolean;
  isDeleted: boolean;
  folderId?: string | null;
  mailboxId?: string | null;
  tenantId: string;
  userId?: string | null;
  receivedAt?: Date | null;
  sentAt?: Date | null;
  threadId?: string | null;
  tags?: string[];
  metadata?: Record<string, any> | null;
  analytics?: Record<string, any> | null;
  securityReport?: Record<string, any> | null;
  size: number;
  headers: Record<string, string>;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentId?: string | null;
  isInline: boolean;
  data?: Buffer;
  url?: string;
  path?: string;
}

export interface EmailFolder {
  id: string;
  name: string;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'custom';
  parentId?: string;
  messageCount: number;
  unreadCount: number;
  tenantId: string;
  userId: string;
}

@Injectable()
export class WebmailService {
  private readonly logger = new Logger(WebmailService.name);
  private smtpTransporter: nodemailer.Transporter;
  private imapConnection: Imap;

  static readonly SYSTEM_FOLDERS = ['Inbox', 'Sent', 'Drafts', 'Trash', 'Spam'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('email-processing') private emailQueue: Queue,
    @InjectQueue('email-security') private securityQueue: Queue,
  ) {
    this.initializeEmailConnections();
  }

  private async initializeEmailConnections() {
    try {
      // Initialize SMTP transporter
      this.smtpTransporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT', 587),
        secure: this.configService.get('SMTP_SECURE', false),
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Initialize IMAP connection
      this.imapConnection = new Imap({
        user: this.configService.get('IMAP_USER'),
        password: this.configService.get('IMAP_PASS'),
        host: this.configService.get('IMAP_HOST'),
        port: this.configService.get('IMAP_PORT', 993),
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log('Email connections initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email connections:', error);
    }
  }

  async getEmails(userId: string, tenantId: string, query: EmailQueryDto): Promise<{
    data: EmailMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        folderId,
        isRead,
        isStarred,
        search,
        status,
        priority,
        from,
        dateFrom,
        dateTo,
        hasAttachments,
        tags,
      } = query;

      const skip = (page - 1) * limit;

      const where: Prisma.EmailWhereInput = {
        tenantId,
        userId,
      };

      if (status !== undefined && status !== null) {
        switch (status) {
          case 'SPAM':
            where.isSpam = true;
            break;
          case 'DELETED':
            where.isDeleted = true;
            break;
          case 'ARCHIVED':
            where.isArchived = true;
            where.isDeleted = false;
            break;
          case 'READ':
            where.isRead = true;
            where.isDeleted = false;
            break;
          case 'RECEIVED':
            where.receivedAt = { not: null };
            where.isDeleted = false;
            break;
          case 'SENT':
            where.sentAt = { not: null };
            where.isDeleted = false;
            break;
          case 'DRAFT':
            where.sentAt = null;
            where.isDeleted = false;
            break;
          default:
            where.isDeleted = false;
            break;
        }
      } else {
        where.isDeleted = false;
      }

      if (folderId) {
        where.folderId = folderId;
      }

      if (typeof isRead === 'boolean') {
        where.isRead = isRead;
      }

      if (typeof isStarred === 'boolean') {
        where.isStarred = isStarred;
      }

      if (priority) {
        where.priority = priority.toLowerCase();
      }

      if (from) {
        where.fromEmail = { contains: from, mode: 'insensitive' };
      }

      if (Array.isArray(tags) && tags.length) {
        where.tags = { hasSome: tags };
      }

      if (hasAttachments !== undefined) {
        where.attachments = hasAttachments ? { some: {} } : { none: {} };
      }

      if (search) {
        where.OR = [
          { subject: { contains: search, mode: 'insensitive' } },
          { body: { contains: search, mode: 'insensitive' } },
          { htmlBody: { contains: search, mode: 'insensitive' } },
          { fromEmail: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      const orderBy = query.sortBy
        ? { [query.sortBy]: query.sortOrder ?? 'desc' }
        : { createdAt: 'desc' as const };

      const [emails, total] = await this.prisma.$transaction([
        this.prisma.email.findMany({
          where,
          orderBy,
          take: limit,
          skip,
          include: { attachments: true },
        }),
        this.prisma.email.count({ where }),
      ]);

      return {
        data: emails.map(email => this.mapEmailRecord(email)),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to get emails:', error);
      throw new BadRequestException('Failed to retrieve emails');
    }
  }

  async getEmailById(userId: string, tenantId: string, emailId: string): Promise<EmailMessage> {
    try {
      const email = await this.prisma.email.findFirst({
        where: {
          id: emailId,
          tenantId,
          userId,
        },
        include: { attachments: true },
      });

      if (!email) {
        throw new NotFoundException('Email not found');
      }

      if (!email.isRead) {
        await this.prisma.email.update({
          where: { id: emailId },
          data: { isRead: true },
        });
        email.isRead = true;
      }

      return this.mapEmailRecord(email);
    } catch (error) {
      this.logger.error('Failed to get email by ID:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve email');
    }
  }

  async sendEmail(
    userId: string,
    tenantId: string,
    sendEmailDto: SendEmailDto,
    attachments?: Express.Multer.File[],
  ): Promise<EmailMessage> {
    try {
      const { to, cc = [], bcc = [], subject, body, htmlBody } = sendEmailDto;
      const mailPriority = this.mapPriority(sendEmailDto.priority);
      const fromAddress = this.configService.get('EMAIL_FROM', 'noreply@cubecore.com');
      const fromName = this.configService.get('EMAIL_FROM_NAME', 'CUBE CORE');

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromName ? `${fromName} <${fromAddress}>` : fromAddress,
        to: Array.isArray(to) ? to.join(', ') : to,
        ...(cc.length && { cc: Array.isArray(cc) ? cc.join(', ') : cc }),
        ...(bcc.length && { bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc }),
        subject,
        text: body,
        ...(htmlBody && { html: htmlBody }),
        priority: mailPriority,
      };

      if (sendEmailDto.replyTo) {
        mailOptions.replyTo = sendEmailDto.replyTo;
      }

      if (attachments?.length) {
        mailOptions.attachments = attachments.map(file => ({
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype,
        }));
      }

      const result = await this.smtpTransporter.sendMail(mailOptions);
      const sentAt = new Date();
      const sentFolder = await this.ensureFolder(tenantId, userId, 'Sent');

      const emailRecord = await this.prisma.email.create({
        data: {
          tenantId,
          userId,
          folderId: sentFolder.id,
          messageId: result.messageId,
          subject,
          body: body ?? '',
          htmlBody,
          fromEmail: fromAddress,
          fromName,
          fromAddress,
          replyTo: sendEmailDto.replyTo,
          toEmails: Array.isArray(to) ? to : [to],
          ccEmails: cc,
          bccEmails: bcc,
          priority: mailPriority,
          tags: sendEmailDto.tags ?? [],
          sentAt,
          receivedAt: sentAt,
          metadata: {
            templateId: sendEmailDto.templateId ?? null,
            templateVariables: sendEmailDto.templateVariables ?? null,
          },
          attachments: attachments?.length
            ? {
                create: attachments.map(file => ({
                  filename: file.originalname,
                  originalName: file.originalname,
                  mimeType: file.mimetype,
                  size: file.size,
                  path: this.buildAttachmentPath(tenantId, result.messageId, file.originalname),
                  checksum: null,
                  isInline: false,
                  contentId: undefined,
                  tenantId,
                })),
              }
            : undefined,
        },
        include: { attachments: true },
      });

      await this.emailQueue.add('store-sent-email', {
        emailId: emailRecord.id,
        userId,
        tenantId,
        emailData: {
          ...sendEmailDto,
          messageId: result.messageId,
          sentAt,
        },
        attachments: attachments?.map(file => ({
          filename: file.originalname,
          size: file.size,
          contentType: file.mimetype,
        })),
      });

      this.logger.log(`Email sent successfully: ${result.messageId}`);
      return this.mapEmailRecord(emailRecord);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw new BadRequestException('Failed to send email');
    }
  }

  async updateEmail(
    userId: string, 
    tenantId: string, 
    emailId: string, 
    updateData: UpdateEmailDto
  ): Promise<EmailMessage> {
    try {
      const existing = await this.prisma.email.findFirst({
        where: {
          id: emailId,
          tenantId,
          userId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Email not found');
      }

      const data: Prisma.EmailUpdateInput = {};

      if (updateData.subject !== undefined) {
        data.subject = updateData.subject;
      }
      if (updateData.body !== undefined) {
        data.body = updateData.body;
      }
      if (updateData.textBody !== undefined) {
        data.body = updateData.textBody;
      }
      if (updateData.folderId !== undefined) {
        data.folder = {
          connect: { id: updateData.folderId }
        };
      }
      if (updateData.priority !== undefined) {
        data.priority = updateData.priority.toLowerCase();
      }
      if (updateData.isRead !== undefined) {
        data.isRead = updateData.isRead;
      }
      if (updateData.isStarred !== undefined) {
        data.isStarred = updateData.isStarred;
      }
      if (updateData.isSpam !== undefined) {
        data.isSpam = updateData.isSpam;
      }
      if (updateData.tags !== undefined) {
        data.tags = updateData.tags;
      }

      const updated = await this.prisma.email.update({
        where: { id: emailId },
        data,
        include: { attachments: true },
      });

      this.logger.log(`Email updated: ${emailId}`);
      return this.mapEmailRecord(updated);
    } catch (error) {
      this.logger.error('Failed to update email:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update email');
    }
  }

  async deleteEmail(userId: string, tenantId: string, emailId: string): Promise<{ success: boolean }> {
    try {
      const trashFolder = await this.ensureFolder(tenantId, userId, 'Trash');
      const result = await this.prisma.email.updateMany({
        where: {
          id: emailId,
          tenantId,
          userId,
        },
        data: {
          isDeleted: true,
          folderId: trashFolder.id,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Email not found');
      }

      this.logger.log(`Email moved to trash: ${emailId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete email:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete email');
    }
  }

  async getFolders(userId: string, tenantId: string): Promise<EmailFolder[]> {
    try {
      await this.ensureSystemFolders(tenantId, userId);

      const [folders, counts, unreadCounts] = await Promise.all([
        this.prisma.emailFolder.findMany({
          where: { tenantId, userId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.email.groupBy({
          by: ['folderId'],
          where: { tenantId, userId, isDeleted: false, folderId: { not: null } },
          _count: { _all: true },
        }),
        this.prisma.email.groupBy({
          by: ['folderId'],
          where: { tenantId, userId, isDeleted: false, isRead: false, folderId: { not: null } },
          _count: { _all: true },
        }),
      ]);

      const countMap = new Map<string, number>();
      counts.forEach(entry => {
        if (entry.folderId) {
          countMap.set(entry.folderId, entry._count._all);
        }
      });

      const unreadMap = new Map<string, number>();
      unreadCounts.forEach(entry => {
        if (entry.folderId) {
          unreadMap.set(entry.folderId, entry._count._all);
        }
      });

      return folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        type: this.resolveFolderType(folder.name),
        parentId: folder.parentId ?? undefined,
        messageCount: countMap.get(folder.id) ?? 0,
        unreadCount: unreadMap.get(folder.id) ?? 0,
        tenantId: folder.tenantId,
        userId: folder.userId,
      }));
    } catch (error) {
      this.logger.error('Failed to get folders:', error);
      throw new BadRequestException('Failed to retrieve folders');
    }
  }

  async createFolder(
    userId: string, 
    tenantId: string, 
    createFolderDto: CreateFolderDto
  ): Promise<EmailFolder> {
    try {
      const { name, parentId } = createFolderDto;
      if (parentId) {
        const parent = await this.prisma.emailFolder.findFirst({
          where: { id: parentId, tenantId, userId, deletedAt: null },
        });
        if (!parent) {
          throw new NotFoundException('Parent folder not found');
        }
      }

      const folder = await this.prisma.emailFolder.create({
        data: {
          name,
          parentId,
          tenantId,
          userId,
        },
      });

      this.logger.log(`Folder created: ${folder.id}`);
      return {
        id: folder.id,
        name: folder.name,
        type: this.resolveFolderType(folder.name),
        parentId: folder.parentId ?? undefined,
        messageCount: 0,
        unreadCount: 0,
        tenantId: folder.tenantId,
        userId: folder.userId,
      };
    } catch (error) {
      this.logger.error('Failed to create folder:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create folder');
    }
  }

  async searchEmails(
    userId: string, 
    tenantId: string, 
    searchDto: EmailSearchDto
  ): Promise<{ data: EmailMessage[]; total: number; query: string }> {
    try {
      const {
        query,
        dateFrom,
        dateTo,
        folderId,
        folderIds,
        hasAttachments,
        searchSubject,
        searchBody,
        searchSender,
        searchAttachments,
        advanced,
      } = searchDto;

      const where: Prisma.EmailWhereInput = {
        tenantId,
        userId,
      };

      if (!advanced?.includeDeleted) {
        where.isDeleted = false;
      }

      if (!advanced?.includeSpam) {
        where.isSpam = false;
      }

      if (folderIds?.length) {
        where.folderId = { in: folderIds };
      } else if (folderId) {
        where.folderId = folderId;
      }

      if (hasAttachments !== undefined) {
        where.attachments = hasAttachments ? { some: {} } : { none: {} };
      }

      if (dateFrom || dateTo || searchDto.dateRange) {
        const range = searchDto.dateRange ?? { from: undefined, to: undefined };
        const gte = dateFrom ?? range.from;
        const lte = dateTo ?? range.to;
        if (gte || lte) {
          where.createdAt = {};
          if (gte) {
            where.createdAt.gte = new Date(gte);
          }
          if (lte) {
            where.createdAt.lte = new Date(lte);
          }
        }
      }

      const searchTerm = query?.trim();
      if (searchTerm) {
        const caseSensitive = advanced?.caseSensitive ?? false;
        const queryMode: Prisma.QueryMode = caseSensitive ? 'default' : 'insensitive';
        const comparisonValue = searchTerm;

        const explicitFlags = [searchSubject, searchBody, searchSender, searchAttachments].some(flag => flag === true);
        const orConditions: Prisma.EmailWhereInput[] = [];

        const subjectSelected = explicitFlags ? !!searchSubject : true;
        const bodySelected = explicitFlags ? !!searchBody : true;
        const senderSelected = explicitFlags ? !!searchSender : true;
        const attachmentsSelected = explicitFlags ? !!searchAttachments : false;

        if (subjectSelected) {
          orConditions.push({ subject: { contains: comparisonValue, mode: queryMode } });
        }
        if (bodySelected) {
          orConditions.push({ body: { contains: comparisonValue, mode: queryMode } });
          orConditions.push({ htmlBody: { contains: comparisonValue, mode: queryMode } });
        }
        if (senderSelected) {
          orConditions.push({ fromEmail: { contains: comparisonValue, mode: queryMode } });
          orConditions.push({ fromName: { contains: comparisonValue, mode: queryMode } });
        }
        if (attachmentsSelected) {
          orConditions.push({
            attachments: {
              some: {
                filename: { contains: comparisonValue, mode: queryMode },
              },
            },
          });
        }

        if (orConditions.length) {
          where.OR = orConditions;
        }
      }

      const take = 50;

      const [emails, total] = await this.prisma.$transaction([
        this.prisma.email.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          include: { attachments: true },
        }),
        this.prisma.email.count({ where }),
      ]);

      return {
        data: emails.map(email => this.mapEmailRecord(email)),
        total,
        query: searchTerm ?? '',
      };
    } catch (error) {
      this.logger.error('Failed to search emails:', error);
      throw new BadRequestException('Failed to search emails');
    }
  }

  async getAnalytics(userId: string, tenantId: string): Promise<{
    totalEmails: number;
    unreadEmails: number;
    sentEmails: number;
    storageUsed: number;
    spamBlocked: number;
  }> {
    try {
      const [totalEmails, unreadEmails, sentEmails, spamBlocked, storageAggregate] = await Promise.all([
        this.prisma.email.count({ where: { tenantId, userId } }),
        this.prisma.email.count({ where: { tenantId, userId, isDeleted: false, isRead: false } }),
        this.prisma.email.count({ where: { tenantId, userId, sentAt: { not: null }, isDeleted: false } }),
        this.prisma.email.count({ where: { tenantId, userId, isSpam: true } }),
        this.prisma.emailAttachment.aggregate({
          where: { tenantId },
          _sum: { size: true },
        }),
      ]);

      const storageUsed = storageAggregate._sum.size ?? 0;

      return {
        totalEmails,
        unreadEmails,
        sentEmails,
        storageUsed,
        spamBlocked,
      };
    } catch (error) {
      this.logger.error('Failed to get analytics:', error);
      throw new BadRequestException('Failed to retrieve analytics');
    }
  }

  private mapEmailRecord(email: PrismaEmail & { attachments: PrismaEmailAttachment[] }): EmailMessage {
    const metadata = (email.metadata ?? null) as Record<string, any> | null;
    const analytics = (email.analytics ?? null) as Record<string, any> | null;
    const securityReport = (email.securityReport ?? null) as Record<string, any> | null;
    const headers = metadata && typeof metadata.headers === 'object' ? metadata.headers : {};
    const attachments = email.attachments.map(attachment => this.mapAttachment(attachment));

    return {
      id: email.id,
      messageId: email.messageId ?? email.id,
      subject: email.subject ?? null,
      from: email.fromEmail,
      fromName: email.fromName,
      replyTo: email.replyTo,
      to: email.toEmails,
      cc: email.ccEmails,
      bcc: email.bccEmails,
      body: email.body ?? '',
      htmlBody: email.htmlBody,
      attachments,
      isRead: email.isRead,
      isStarred: email.isStarred,
      isSpam: email.isSpam,
      isDeleted: email.isDeleted,
      folderId: email.folderId ?? undefined,
      mailboxId: email.mailboxId ?? undefined,
      tenantId: email.tenantId,
      userId: email.userId ?? undefined,
      receivedAt: email.receivedAt ?? email.createdAt,
      sentAt: email.sentAt ?? undefined,
      threadId: email.threadId ?? undefined,
      tags: email.tags ?? [],
      metadata,
      analytics,
      securityReport,
      size: this.calculateEmailSize(email, email.attachments),
      headers,
    };
  }

  private mapAttachment(attachment: PrismaEmailAttachment): EmailAttachment {
    return {
      id: attachment.id,
      filename: attachment.filename,
      contentType: attachment.mimeType,
      size: attachment.size,
      contentId: attachment.contentId,
      isInline: attachment.isInline,
      path: attachment.path ?? undefined,
      url: undefined,
    };
  }

  private calculateEmailSize(email: PrismaEmail, attachments: PrismaEmailAttachment[]): number {
    const bodySize = Buffer.byteLength(email.body ?? '', 'utf8');
    const htmlSize = Buffer.byteLength(email.htmlBody ?? '', 'utf8');
    const metadataSize = email.metadata ? Buffer.byteLength(JSON.stringify(email.metadata)) : 0;
    const attachmentsSize = attachments.reduce((sum, attachment) => sum + (attachment.size ?? 0), 0);
    return bodySize + htmlSize + metadataSize + attachmentsSize;
  }

  private buildAttachmentPath(tenantId: string, messageId: string | null, filename: string): string {
    const safeMessageId = messageId ?? `email_${Date.now()}`;
    return path.posix.join('emails', tenantId, safeMessageId, filename);
  }

  private async ensureFolder(tenantId: string, userId: string, name: string) {
    await this.ensureSystemFolders(tenantId, userId);
    const existing = await this.prisma.emailFolder.findFirst({
      where: { tenantId, userId, name, deletedAt: null },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.emailFolder.create({
      data: {
        tenantId,
        userId,
        name,
      },
    });
  }

  private async ensureSystemFolders(tenantId: string, userId: string): Promise<void> {
    await Promise.all(
      WebmailService.SYSTEM_FOLDERS.map(async folderName => {
        const existing = await this.prisma.emailFolder.findFirst({
          where: { tenantId, userId, name: folderName, deletedAt: null },
        });

        if (!existing) {
          await this.prisma.emailFolder.create({
            data: {
              tenantId,
              userId,
              name: folderName,
            },
          });
        }
      }),
    );
  }

  private resolveFolderType(name: string): EmailFolder['type'] {
    switch (name.toLowerCase()) {
      case 'inbox':
        return 'inbox';
      case 'sent':
        return 'sent';
      case 'drafts':
        return 'drafts';
      case 'trash':
        return 'trash';
      case 'spam':
        return 'spam';
      default:
        return 'custom';
    }
  }

  private mapPriority(priority?: EmailPriority): 'high' | 'normal' | 'low' {
    switch (priority) {
      case EmailPriority.URGENT:
      case EmailPriority.HIGH:
        return 'high';
      case EmailPriority.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  // Background email synchronization
  async syncEmails(userId: string, tenantId: string): Promise<{ success: boolean; synced: number }> {
    try {
      // Queue email sync job
      await this.emailQueue.add('sync-emails', {
        userId,
        tenantId,
      });

      return { success: true, synced: 0 };
    } catch (error) {
      this.logger.error('Failed to sync emails:', error);
      throw new BadRequestException('Failed to sync emails');
    }
  }

  // Security scanning
  async scanEmailForThreats(
    userId: string,
    tenantId: string,
    emailId: string,
  ): Promise<{ safe: boolean; threats: string[] }> {
    try {
      const email = await this.prisma.email.findFirst({
        where: { id: emailId, tenantId, userId },
        include: { attachments: true },
      });

      if (!email) {
        throw new NotFoundException('Email not found');
      }

      await this.securityQueue.add('scan-email', {
        emailId,
        tenantId,
        userId,
        emailData: this.mapEmailRecord(email),
      });

      return { safe: true, threats: [] };
    } catch (error) {
      this.logger.error('Failed to scan email:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return { safe: false, threats: ['Scan failed'] };
    }
  }

}
