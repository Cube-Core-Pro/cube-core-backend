export interface WebmailUsageMetrics {
  unread: number;
  total: number;
  today: number;
  spam: number;
  virus: number;
}

export interface WebmailFolderMetrics {
  inbox: number;
  sent: number;
  drafts: number;
  trash: number;
  spam: number;
}

export interface WebmailStorageMetrics {
  used: number;
  limit: number;
  percentage: number;
}

export interface WebmailCalendarMetrics {
  todayEvents: number;
  upcomingEvents: number;
}

export interface WebmailDashboard {
  emails: WebmailUsageMetrics;
  folders: WebmailFolderMetrics;
  storage: WebmailStorageMetrics;
  recent: EmailSummary[];
  contacts: number;
  calendar: WebmailCalendarMetrics;
}

export interface EmailRecipient {
  name?: string;
  address: string;
}

export interface EmailSummary {
  id: string;
  subject: string;
  from: EmailRecipient;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
  isStarred: boolean;
  folder: string;
  body?: string;
  preview?: string;
  labels?: string[];
  attachments?: Array<{
    filename: string;
    size: number;
    mimeType: string;
    url?: string;
  }>;
}

export interface EmailListResponse {
  data: EmailSummary[];
  total: number;
  folder: string;
}

export interface ComposeEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    size: number;
    mimeType: string;
    url?: string;
  }>;
}

export interface SentEmail {
  id: string;
  tenantId: string;
  senderId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments: ComposeEmailRequest['attachments'];
  sentAt: Date;
  status: 'sent' | 'queued' | 'failed';
}

export interface ContactSummary {
  id: string;
  name: string;
  email: string;
  company?: string;
  lastContactedAt?: Date;
}

export interface ContactListResponse {
  data: ContactSummary[];
  total: number;
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface CalendarEventListResponse {
  data: CalendarEventSummary[];
  total: number;
}
