// path: backend/src/tokenization/services/audit.service.ts
// purpose: Tokenization-specific audit helpers built on top of global AuditService

import { Injectable } from '@nestjs/common';
import { AuditService as CoreAuditService } from '../../audit/audit.service';

@Injectable()
export class AuditService {
  constructor(private readonly audit: CoreAuditService) {}

  async logTokenEvent(
    tenantId: string,
    userId: string,
    action: string,
    metadata: Record<string, any>
  ) {
    return this.audit.logActivity({
      tenantId,
      userId,
      action,
      resource: 'tokenization.token',
      resourceId: metadata.tokenId ?? null,
      details: metadata,
    });
  }

  async logNftEvent(
    tenantId: string,
    userId: string,
    action: string,
    metadata: Record<string, any>
  ) {
    return this.audit.logActivity({
      tenantId,
      userId,
      action,
      resource: 'tokenization.nft',
      resourceId: metadata.nftId ?? null,
      details: metadata,
    });
  }
}

