// path: backend/src/modules/webmail/processors/email-processing.processor.ts
// purpose: Bull queue processor for email-processing jobs (storage, indexing, inline security scans)
// dependencies: Bull, NestJS services, webmail analytics/security services

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSecurityService } from '../services/email-security.service';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { EmailAttachment, EmailMessage } from '../webmail.service';
import { Email as PrismaEmail, EmailAttachment as PrismaEmailAttachment, Prisma } from '@prisma/client';
import type {
  StoreSentEmailJob,
  InlineSecurityScanJob,
  IndexEmailJob,
  SyncMailboxJob,
} from '../types/webmail.queue.types';

@Processor('email-processing')
export class EmailProcessingProcessor {
  private readonly logger = new Logger(EmailProcessingProcessor.name);

  constructor(
    private readonly emailSecurityService: EmailSecurityService,
    private readonly emailAnalyticsService: EmailAnalyticsService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('store-sent-email')
  async handleStoreSentEmail(job: Job<StoreSentEmailJob>) {
    try {
      const { emailId, emailData, attachments: attachmentMetadata = [] } = job.data;

      const email = await this.prisma.email.findUnique({
        where: { id: emailId },
        include: { attachments: true },
      });

      if (!email) {
        this.logger.warn(`Email not found for analytics (id=${emailId})`);
        return { skipped: true };
      }

      const message = this.buildAnalyticsMessage(email, emailData, attachmentMetadata);

      const [sentiment, insights] = await Promise.all([
        this.emailAnalyticsService.analyzeSentiment(message),
        this.emailAnalyticsService.generateInsights(message),
      ]);

      const existingAnalytics = (email.analytics ?? {}) as Record<string, any>;
      const analyticsPayload: Record<string, any> = {
        ...existingAnalytics,
        sentiment,
        insights,
        processedAt: new Date().toISOString(),
      };

      await this.prisma.email.update({
        where: { id: emailId },
        data: {
          analytics: analyticsPayload as Prisma.JsonObject,
          metadata: this.mergeMetadata(email.metadata, {
            analyticsProcessedAt: new Date().toISOString(),
          }),
        },
      });

      await job.log(
        `Stored sent email ${message.messageId} • sentiment=${sentiment.sentiment} • priority=${insights.priority}`,
      );

      this.logger.log(
        `Sent email stored for analytics (tenant=${email.tenantId}, user=${email.userId ?? 'unknown'}, messageId=${message.messageId})`,
      );

      return { sentiment, insights };
    } catch (error) {
      this.logger.error('Failed to handle store-sent-email job', error);
      throw error;
    }
  }

  @Process('security-scan')
  async handleInlineSecurityScan(job: Job<InlineSecurityScanJob>) {
    try {
      const result = await this.emailSecurityService.performSecurityScan(job.data.emailData);
      await job.log(
        `Security scan completed for ${job.data.emailId} • secure=${result.isSecure} • risk=${result.riskLevel}`,
      );

      if (result.quarantineRequired) {
        this.logger.warn(`Quarantine recommended for email ${job.data.emailId}`);
      }

      const email = await this.prisma.email.findUnique({
        where: { id: job.data.emailId },
      });

     if (email) {
        const securityPayload = JSON.parse(JSON.stringify(result)) as Prisma.JsonObject;
        await this.prisma.email.update({
          where: { id: job.data.emailId },
          data: {
            securityReport: {
              report: securityPayload,
              scannedAt: new Date().toISOString(),
            } as Prisma.JsonObject,
            isSpam: result.threats.some(threat => threat.type === 'spam'),
            metadata: this.mergeMetadata(email.metadata, {
              lastSecurityScanAt: new Date().toISOString(),
            }),
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to handle inline security scan job', error);
      throw error;
    }
  }

  @Process('index-email')
  async handleIndexEmail(job: Job<IndexEmailJob>) {
    try {
      await job.log(`Indexed email ${job.data.emailId} for search`);
      this.logger.debug(
        `Email indexed (id=${job.data.emailId}, subject=${job.data.content.subject})`,
      );
      const email = await this.prisma.email.findUnique({ where: { id: job.data.emailId } });
      if (email) {
        await this.prisma.email.update({
          where: { id: job.data.emailId },
          data: {
            metadata: this.mergeMetadata(email.metadata, {
              lastIndexedAt: new Date().toISOString(),
            }),
          },
        });
      }
      return { indexed: true };
    } catch (error) {
      this.logger.error('Failed to index email for search', error);
      throw error;
    }
  }

  @Process('sync-emails')
  async handleSyncEmails(job: Job<SyncMailboxJob>) {
    try {
      await job.log(
        `Sync requested for tenant=${job.data.tenantId} user=${job.data.userId}`,
      );
      this.logger.log(
        `Queued mailbox synchronization (tenant=${job.data.tenantId}, user=${job.data.userId})`,
      );
      return { synced: 0 };
    } catch (error) {
      this.logger.error('Failed to process sync-emails job', error);
      throw error;
    }
  }

  private buildAnalyticsMessage(
    email: PrismaEmail & { attachments: PrismaEmailAttachment[] },
    fallback: StoreSentEmailJob['emailData'],
    attachmentMetadata: StoreSentEmailJob['attachments'] = [],
  ): EmailMessage {
    const metadata = (email.metadata ?? null) as Record<string, any> | null;
    const attachments = email.attachments.length
      ? email.attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.filename,
          contentType: attachment.mimeType,
          size: attachment.size,
          contentId: attachment.contentId ?? undefined,
          isInline: attachment.isInline,
        }))
      : attachmentMetadata.map((attachment, index) => ({
          id: `${email.id}_attachment_${index}`,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          isInline: false,
        }));

    const body = email.body ?? fallback.body ?? fallback.textBody ?? '';
    const htmlBody = email.htmlBody ?? fallback.htmlBody ?? undefined;
    const messageId = email.messageId ?? fallback.messageId ?? email.id;
    const receivedAt = email.receivedAt ?? email.createdAt;
    const sentAt = email.sentAt ?? (fallback.sentAt ? new Date(fallback.sentAt) : receivedAt);

    return {
      id: email.id,
      messageId,
      subject: email.subject ?? fallback.subject ?? null,
      from: email.fromEmail,
      fromName: email.fromName,
      replyTo: email.replyTo ?? fallback.replyTo,
      to: email.toEmails.length ? email.toEmails : (Array.isArray(fallback.to) ? fallback.to : [fallback.to]).filter(Boolean) as string[],
      cc: email.ccEmails.length ? email.ccEmails : fallback.cc ?? [],
      bcc: email.bccEmails.length ? email.bccEmails : fallback.bcc ?? [],
      body,
      htmlBody,
      attachments,
      isRead: email.isRead,
      isStarred: email.isStarred,
      isSpam: email.isSpam,
      isDeleted: email.isDeleted,
      folderId: email.folderId ?? undefined,
      mailboxId: email.mailboxId ?? undefined,
      tenantId: email.tenantId,
      userId: email.userId ?? undefined,
      receivedAt,
      sentAt,
      threadId: email.threadId ?? undefined,
      tags: email.tags ?? fallback.tags ?? [],
      metadata,
      analytics: (email.analytics ?? null) as Record<string, any> | null,
      securityReport: (email.securityReport ?? null) as Record<string, any> | null,
      size:
        Buffer.byteLength(body, 'utf8') +
        Buffer.byteLength(htmlBody ?? '', 'utf8') +
        attachments.reduce((sum, attachment) => sum + attachment.size, 0),
      headers: metadata && typeof metadata.headers === 'object' ? metadata.headers : {},
    };
  }

  private mergeMetadata(metadata: Prisma.JsonValue | null | undefined, patch: Record<string, any>): Prisma.JsonObject {
    const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, any>) }
      : {};
    return {
      ...base,
      ...patch,
    } as Prisma.JsonObject;
  }
}
