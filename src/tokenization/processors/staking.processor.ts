// path: backend/src/tokenization/processors/staking.processor.ts
// purpose: Stub processor for staking operations queue

import { Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('staking-operations')
export class StakingProcessor {
  private readonly logger = new Logger(StakingProcessor.name);

  @Process('*')
  async handle(job: Job) {
    this.logger.debug(`Processing staking job ${job.id} (${job.name})`);
  }
}

