// path: backend/src/tokenization/services/ipfs.service.ts
// purpose: Simplified IPFS wrapper used by NFT service (placeholder implementation)

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class IpfsService {
  async uploadJson(_payload: Record<string, any>) {
    // Placeholder implementation: return pseudo IPFS URL
    const cid = randomUUID().replace(/-/g, '');
    return `ipfs://mock-${cid}`;
  }

  async uploadFile(data: Buffer, filename: string) {
    const cid = randomUUID().replace(/-/g, '');
    return {
      url: `ipfs://mock-${cid}`,
      filename,
      size: data.length,
    };
  }
}
