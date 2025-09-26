import { Controller, Get } from '@nestjs/common';
import { TokenizationBlockchainService } from './tokenization-blockchain.service';
import { Fortune500TokenizationBlockchainConfig } from '../types/fortune500-types';

@Controller('tokenization-blockchain')
export class TokenizationBlockchainController {
  constructor(private readonly svc: TokenizationBlockchainService) {}

  @Get('health')
  health(): Fortune500TokenizationBlockchainConfig {
    return this.svc.health();
  }
}
