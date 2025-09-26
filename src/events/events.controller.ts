import { Controller, Get } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
