import { SecurityAuditEvent, SecurityAuditAttestation } from '@prisma/client';

export type AuditEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuditEventOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'ERROR';
export type AuditExportFormat = 'csv' | 'json' | 'pdf';

export interface AuditEventDto {
  tenantId: string;
  userId?: string | null;
  userEmail?: string | null;
  userRoles?: string[] | null;
  eventType?: string;
  severity?: AuditEventSeverity;
  action?: string;
  description?: string;
  outcome?: AuditEventOutcome;
  resourceType?: string | null;
  resourceId?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  complianceFrameworks?: string[] | null;
  riskScore?: number | null;
  riskFactors?: string[] | null;
  timestamp?: string | Date;
}

export interface AuditEventQuery {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  severity?: AuditEventSeverity;
  outcome?: AuditEventOutcome;
  q?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuditExportQuery extends AuditEventQuery {
  format?: AuditExportFormat;
}

export interface AuditIntegrityQuery {
  tenantId: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditAttestationRequest extends AuditIntegrityQuery {}

export interface AuditAttestationListQuery {
  tenantId?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuditAttestationPayload {
  tenantId: string;
  start: string | null;
  end: string | null;
  anchorPrevHash: string | null;
  lastHash: string | null;
  ok: boolean;
  count: number;
  generatedAt: string;
  version: string;
  algorithm: string;
  signature?: string | null;
}

export interface AuditAttestationResult extends AuditAttestationPayload {}

export interface AuditAttestationVerificationRequest extends AuditAttestationPayload {}

export interface AuditAttestationVerificationResult {
  validSignature: boolean;
  matchesCurrentChain: boolean;
}

export interface AuditEventListResponse {
  data: SecurityAuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditAttestationListResponse {
  data: SecurityAuditAttestation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type AuditEventStreamPayload = SecurityAuditEvent;
export type AuditAttestationStreamPayload = SecurityAuditAttestation;
export type AuditManualAttestationResult = SecurityAuditAttestation;

export interface AuditLogActivityInput {
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown> | null;
}

