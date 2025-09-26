// path: backend/src/modules/webmail/services/index.ts
// purpose: Export all webmail services for easy imports
// dependencies: all webmail services

export { EmailService } from './email.service';
export { FolderService } from './folder.service';
export { TemplateService } from './template.service';
export { AttachmentService } from './attachment.service';
export { FilterService } from './filter.service';
export { EmailSecurityService } from './email-security.service';
export { EmailAnalyticsService } from './email-analytics.service';

// Export types
export type {
  EmailTemplate,
  TemplateVariable,
  TemplatePermissions,
  TemplateRenderData,
  RenderedTemplate,
  TemplateStats,
} from './template.service';

export type {
  AttachmentMetadata,
  AttachmentScanResults,
  AttachmentPermissions,
  UploadOptions,
  AttachmentStats,
  FileTypeConfig,
} from './attachment.service';

export type {
  EmailFilter,
  FilterCondition,
  FilterAction,
  FilterField,
  FilterOperator,
  FilterActionType,
  FilterExecutionResult,
  FilterStats,
  SmartFilterSuggestion,
} from './filter.service';

export type {
  SecurityScanResult,
  SecurityThreat,
  PhishingAnalysis,
  PhishingIndicator,
  SuspiciousLink,
  DomainReputation,
  AttachmentScanResult,
  DataLeakAnalysis,
} from './email-security.service';

export type {
  EmailSentimentAnalysis,
  EmailInsights,
  EmailThreadAnalysis,
  ProductivityMetrics,
} from './email-analytics.service';