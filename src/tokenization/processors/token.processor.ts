// path: backend/src/tokenization/processors/token.processor.ts
// purpose: Stub processor for token operations queue

import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('token-operations')
export class TokenProcessor {
  private readonly logger = new Logger(TokenProcessor.name);

  @Process('*')
  async handle(job: Job) {
    this.logger.debug(`Processing token job ${job.id} (${job.name})`);
  }
}

