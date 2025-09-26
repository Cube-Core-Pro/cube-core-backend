import { Controller, Get } from '@nestjs/common';
import { MetaverseVrCollaborationService } from './metaverse-vr-collaboration.service';
import { Fortune500MetaverseConfig } from '../types/fortune500-types';

@Controller('metaverse-vr-collaboration')
export class MetaverseVrCollaborationController {
  constructor(private readonly svc: MetaverseVrCollaborationService) {}

  @Get('health')
  health(): Fortune500MetaverseConfig {
    return this.svc.health();
  }
}
