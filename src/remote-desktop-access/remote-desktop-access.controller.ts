import { Controller, Get } from '@nestjs/common';
import { RemoteDesktopAccessService } from './remote-desktop-access.service';
import { Fortune500RemoteAccessConfig } from '../types/fortune500-types';

@Controller('remote-desktop-access')
export class RemoteDesktopAccessController {
  constructor(private readonly svc: RemoteDesktopAccessService) {}

  @Get('health')
  health(): Fortune500RemoteAccessConfig {
    return this.svc.health();
  }
}
