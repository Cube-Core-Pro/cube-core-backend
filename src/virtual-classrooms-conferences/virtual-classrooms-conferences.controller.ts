import { Controller, Get } from '@nestjs/common';
import { VirtualClassroomsConferencesService } from './virtual-classrooms-conferences.service';
import { Fortune500VirtualClassroomsConferencesConfig } from '../types/fortune500-types';

@Controller('virtual-classrooms-conferences')
export class VirtualClassroomsConferencesController {
  constructor(private readonly svc: VirtualClassroomsConferencesService) {}

  @Get('health')
  health(): Fortune500VirtualClassroomsConferencesConfig {
    return this.svc.health();
  }
}
