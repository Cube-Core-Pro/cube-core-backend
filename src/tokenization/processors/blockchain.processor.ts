// path: backend/src/tokenization/processors/blockchain.processor.ts
// purpose: Stub queue processor for blockchain operations

import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('blockchain-transactions')
export class BlockchainProcessor {
  private readonly logger = new Logger(BlockchainProcessor.name);

  @Process('*')
  async handle(job: Job) {
    this.logger.debug(`Processing blockchain job ${job.id} (${job.name})`);
  }
}

