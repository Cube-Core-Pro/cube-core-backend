// path: backend/src/modules/webmail/processors/email-security.processor.ts
// purpose: Bull queue processor for dedicated email-security jobs
// dependencies: Bull, webmail security service

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EmailSecurityService } from '../services/email-security.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SecurityQueueScanJob } from '../types/webmail.queue.types';
import type { EmailMessage } from '../webmail.service';
import { Prisma } from '@prisma/client';

@Processor('email-security')
export class EmailSecurityProcessor {
  private readonly logger = new Logger(EmailSecurityProcessor.name);

  constructor(
    private readonly emailSecurityService: EmailSecurityService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('scan-email')
  async handleSecurityScan(job: Job<SecurityQueueScanJob>) {
    try {
      const email: EmailMessage = job.data.emailData ?? {
        id: job.data.emailId,
        messageId: job.data.emailId,
        subject: 'Queued email',
        from: 'unknown@cubecore.com',
        to: [],
        body: '',
        isRead: false,
        isStarred: false,
        isSpam: false,
        isDeleted: false,
        folderId: 'inbox',
        receivedAt: new Date(),
        size: 0,
        headers: {},
        tenantId: job.data.tenantId ?? 'unknown',
        userId: job.data.userId ?? 'unknown',
        attachments: [],
      };

      const result = await this.emailSecurityService.performSecurityScan(email);
      await job.log(
        `Security queue scan completed for ${job.data.emailId} • secure=${result.isSecure} • risk=${result.riskLevel}`,
      );

      if (result.quarantineRequired) {
        this.logger.warn(`Quarantine recommended for email ${job.data.emailId}`);
      }

      const emailRecord = await this.prisma.email.findUnique({ where: { id: job.data.emailId } });
      if (emailRecord) {
        const securityPayload = JSON.parse(JSON.stringify(result)) as Prisma.JsonObject;
        await this.prisma.email.update({
          where: { id: job.data.emailId },
          data: {
            securityReport: {
              report: securityPayload,
              scannedAt: new Date().toISOString(),
            } as Prisma.JsonObject,
            isSpam: result.threats.some(threat => threat.type === 'spam'),
            metadata: this.mergeMetadata(emailRecord.metadata, {
              lastSecurityScanAt: new Date().toISOString(),
            }),
          },
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to handle scan-email job', error);
      throw error;
    }
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
