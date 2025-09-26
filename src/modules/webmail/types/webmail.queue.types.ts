// path: backend/src/modules/webmail/types/webmail.queue.types.ts
// purpose: Shared TypeScript interfaces for webmail Bull queue payloads
// dependencies: DTOs and domain types from the webmail module

import type { SendEmailDto } from '../dto/webmail.dto';
import type { EmailMessage } from '../webmail.service';

export interface StoreSentEmailJob {
  emailId: string;
  userId: string;
  tenantId: string;
  emailData: SendEmailDto & {
    messageId: string;
    sentAt: Date | string;
  };
  attachments?: Array<{
    filename: string;
    size: number;
    contentType: string;
  }>;
}

export interface InlineSecurityScanJob {
  emailId: string;
  emailData: EmailMessage;
}

export interface IndexEmailJob {
  emailId: string;
  content: {
    subject: string;
    body: string;
    from: string;
    to: string[];
  };
}

export interface SyncMailboxJob {
  userId: string;
  tenantId: string;
}

export interface SecurityQueueScanJob {
  emailId: string;
  tenantId?: string;
  userId?: string;
  emailData?: EmailMessage;
}
