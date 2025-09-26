// path: backend/src/enterprise-webmail/services/email.service.ts
// purpose: Service for enterprise email management
// dependencies: @nestjs/common, prisma, nodemailer, antivirus, spam-detection

import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmailDto, EmailType, EmailPriority } from '../dto/create-email.dto';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

export interface EmailEntity {
  id: string;
  messageId: string;
  subject: string;
  body: string;
  htmlBody?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  priority: EmailPriority;
  type: EmailType;
  attachments: any[];
  tags: string[];
  folderId?: string;
  requestReadReceipt: boolean;
  isConfidential: boolean;
  isRead: boolean;
  isStarred: boolean;
  isSpam: boolean;
  hasVirus: boolean;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  templateId?: string;
  templateVariables?: Record<string, any>;
  metadata: Record<string, any>;
  tenantId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.initializeTransporter();
  }

  async create(
    createEmailDto: CreateEmailDto,
    tenantId: string,
    userId: string,
    userEmail: string
  ): Promise<EmailEntity> {
    try {
      this.logger.log(`Creating email: ${createEmailDto.subject}`);

      // Generate unique message ID
      const messageId = this.generateMessageId();

      // Validate email addresses
      this.validateEmailAddresses([
        ...createEmailDto.to,
        ...(createEmailDto.cc || []),
        ...(createEmailDto.bcc || [])
      ]);

      // Process template if provided
      let processedBody = createEmailDto.body;
      let processedHtmlBody = createEmailDto.htmlBody;
      
      if (createEmailDto.templateId && createEmailDto.templateVariables) {
        const template = await this.getEmailTemplate(createEmailDto.templateId, tenantId);
        processedBody = this.processTemplate(template.body, createEmailDto.templateVariables);
        processedHtmlBody = template.htmlBody 
          ? this.processTemplate(template.htmlBody, createEmailDto.templateVariables)
          : undefined;
      }

      // Scan for spam and viruses
      const spamScore = await this.checkSpam(processedBody, createEmailDto.subject);
      const hasVirus = await this.scanForViruses(createEmailDto.attachments || []);

      // Create email record
      const email = await this.prisma.enterpriseEmail.create({
        data: {
          messageId,
          subject: createEmailDto.subject,
          body: processedBody,
          htmlBody: processedHtmlBody,
          from: userEmail,
          to: createEmailDto.to,
          cc: createEmailDto.cc || [],
          bcc: createEmailDto.bcc || [],
          replyTo: createEmailDto.replyTo,
          priority: createEmailDto.priority,
          type: EmailType.DRAFT,
          attachments: JSON.stringify(createEmailDto.attachments || []),
          tags: createEmailDto.tags || [],
          folderId: createEmailDto.folderId,
          requestReadReceipt: createEmailDto.requestReadReceipt || false,
          isConfidential: createEmailDto.isConfidential || false,
          isRead: false,
          isStarred: false,
          isSpam: spamScore > 0.7,
          hasVirus,
          scheduledAt: createEmailDto.scheduledAt,
          templateId: createEmailDto.templateId,
          templateVariables: createEmailDto.templateVariables,
          metadata: createEmailDto.metadata || {},
          tenantId,
          userId
        }
      });

      // Store attachments if any
      if (createEmailDto.attachments && createEmailDto.attachments.length > 0) {
        await this.storeAttachments(email.id, createEmailDto.attachments);
      }

      this.logger.log(`Email created successfully: ${email.id}`);
      return {
        ...email,
        priority: email.priority as EmailPriority,
        type: email.type as EmailType,
        attachments: JSON.parse(email.attachments as string) || []
      } as EmailEntity;
    } catch (error) {
      this.logger.error(`Failed to create email: ${error.message}`);
      throw error;
    }
  }

  async send(emailId: string, tenantId: string, userId: string): Promise<void> {
    const email = await this.findOne(emailId, tenantId, userId);

    if (email.type !== EmailType.DRAFT) {
      throw new BadRequestException('Only draft emails can be sent');
    }

    if (email.hasVirus) {
      throw new BadRequestException('Cannot send email with virus detected');
    }

    if (email.isSpam) {
      this.logger.warn(`Sending email flagged as spam: ${emailId}`);
    }

    try {
      // Send email via SMTP
      const mailOptions = {
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.body,
        html: email.htmlBody,
        priority: this.mapPriorityToNodemailer(email.priority as EmailPriority) as 'high' | 'normal' | 'low',
        attachments: await this.prepareAttachments(JSON.parse((email.attachments as unknown as string) || '[]'))
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Update email status
      await this.prisma.enterpriseEmail.update({
        where: { id: emailId },
        data: {
          type: EmailType.SENT,
          sentAt: new Date(),
          metadata: {
            ...email.metadata,
            smtpResponse: (info as any)?.response || 'sent',
            messageId: (info as any)?.messageId || email.messageId
          }
        }
      });

      this.logger.log(`Email sent successfully: ${emailId}`);
    } catch (error) {
      this.logger.error(`Failed to send email ${emailId}: ${error.message}`);
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async findAll(
    tenantId: string,
    userId: string,
    folderId?: string,
    type?: EmailType,
    isRead?: boolean,
    limit: number = 50,
    offset: number = 0
  ): Promise<EmailEntity[]> {
    const whereCondition: any = {
      tenantId,
      userId,
      deletedAt: null
    };

    if (folderId) {
      whereCondition.folderId = folderId;
    }

    if (type) {
      whereCondition.type = type;
    }

    if (isRead !== undefined) {
      whereCondition.isRead = isRead;
    }

    const emails = await this.prisma.enterpriseEmail.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return emails.map(email => ({
      ...email,
      priority: email.priority as EmailPriority,
      type: email.type as EmailType,
      attachments: JSON.parse((email.attachments as unknown as string) || '[]')
    })) as EmailEntity[];
  }

  async findOne(id: string, tenantId: string, userId: string): Promise<EmailEntity> {
    const email = await this.prisma.enterpriseEmail.findFirst({
      where: {
        id,
        tenantId,
        userId,
        deletedAt: null
      }
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return {
      ...email,
      priority: email.priority as EmailPriority,
      type: email.type as EmailType,
      attachments: JSON.parse((email.attachments as unknown as string) || '[]')
    } as EmailEntity;
  }

  async markAsRead(id: string, _tenantId: string, _userId: string): Promise<void> {
    await this.prisma.enterpriseEmail.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    this.logger.log(`Email marked as read: ${id}`);
  }

  async markAsStarred(id: string, tenantId: string, userId: string, starred: boolean): Promise<void> {
    await this.prisma.enterpriseEmail.update({
      where: { id },
      data: { isStarred: starred }
    });

    this.logger.log(`Email ${starred ? 'starred' : 'unstarred'}: ${id}`);
  }

  async moveToFolder(id: string, folderId: string, _tenantId: string, _userId: string): Promise<void> {
    await this.prisma.enterpriseEmail.update({
      where: { id },
      data: { folderId }
    });

    this.logger.log(`Email moved to folder ${folderId}: ${id}`);
  }

  async delete(id: string, _tenantId: string, _userId: string): Promise<void> {
    await this.prisma.enterpriseEmail.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    this.logger.log(`Email deleted: ${id}`);
  }

  async createFolder(
    name: string,
    parentId: string | undefined,
    tenantId: string,
    userId: string
  ): Promise<any> {
    return this.prisma.emailFolder.create({
      data: {
        name,
        parentId,
        tenantId,
        userId
      }
    });
  }

  async getFolders(tenantId: string, userId: string): Promise<any[]> {
    return this.prisma.emailFolder.findMany({
      where: {
        tenantId,
        userId,
        deletedAt: null
      },
      orderBy: { name: 'asc' }
    });
  }

  async searchEmails(
    query: string,
    tenantId: string,
    userId: string,
    filters?: {
      from?: string;
      to?: string;
      subject?: string;
      dateFrom?: Date;
      dateTo?: Date;
      hasAttachments?: boolean;
    }
  ): Promise<EmailEntity[]> {
    const whereCondition: any = {
      tenantId,
      userId,
      deletedAt: null,
      OR: [
        { subject: { contains: query, mode: 'insensitive' } },
        { body: { contains: query, mode: 'insensitive' } },
        { from: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (filters) {
      if (filters.from) {
        whereCondition.from = { contains: filters.from, mode: 'insensitive' };
      }
      if (filters.subject) {
        whereCondition.subject = { contains: filters.subject, mode: 'insensitive' };
      }
      if (filters.dateFrom || filters.dateTo) {
        whereCondition.createdAt = {};
        if (filters.dateFrom) {
          whereCondition.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          whereCondition.createdAt.lte = filters.dateTo;
        }
      }
      if (filters.hasAttachments !== undefined) {
        whereCondition.attachments = filters.hasAttachments 
          ? { not: { equals: [] } }
          : { equals: [] };
      }
    }

    const emails = await this.prisma.enterpriseEmail.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return emails.map(email => ({
      ...email,
      priority: email.priority as EmailPriority,
      type: email.type as EmailType,
      attachments: JSON.parse((email.attachments as unknown as string) || '[]')
    })) as EmailEntity[];
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `<${timestamp}.${random}@cubecore.ai>`;
  }

  private validateEmailAddresses(emails: string[]): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new BadRequestException(`Invalid email address: ${email}`);
      }
    }
  }

  private async checkSpam(body: string, subject: string): Promise<number> {
    // TODO: Implement AI-based spam detection
    // For now, return a simple heuristic score
    const spamKeywords = ['viagra', 'lottery', 'winner', 'urgent', 'click here'];
    const text = (body + ' ' + subject).toLowerCase();
    
    let score = 0;
    for (const keyword of spamKeywords) {
      if (text.includes(keyword)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  private async scanForViruses(_attachments: any[]): Promise<boolean> {
    // TODO: Implement virus scanning for attachments
    // For now, return false (no virus detected)
    return false;
  }

  private async getEmailTemplate(templateId: string, tenantId: string): Promise<any> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        tenantId
      }
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return template;
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(placeholder, String(value));
    }
    return processed;
  }

  private mapPriorityToNodemailer(priority: EmailPriority): string {
    const priorityMap = {
      [EmailPriority.LOW]: 'low',
      [EmailPriority.NORMAL]: 'normal',
      [EmailPriority.HIGH]: 'high',
      [EmailPriority.URGENT]: 'high'
    };
    return priorityMap[priority] || 'normal';
  }

  private async prepareAttachments(_attachments: any[]): Promise<any[]> {
    // TODO: Implement attachment preparation
    return [];
  }

  private async storeAttachments(emailId: string, attachments: any[]): Promise<void> {
    // TODO: Implement attachment storage
    this.logger.log(`Storing ${attachments.length} attachments for email ${emailId}`);
  }
}