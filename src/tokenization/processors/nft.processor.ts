// path: backend/src/tokenization/processors/nft.processor.ts
// purpose: Stub processor for NFT queue operations

import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('nft-operations')
export class NftProcessor {
  private readonly logger = new Logger(NftProcessor.name);

  @Process('*')
  async handle(job: Job) {
    this.logger.debug(`Processing NFT job ${job.id} (${job.name})`);
  }
}

