import { Controller, Get } from '@nestjs/common';
import { ApiService } from './api.service';
import { Fortune500ApiConfig } from '../types/fortune500-types';

@Controller('api')
export class ApiController {
  constructor(private readonly svc: ApiService) {}

  @Get('health')
  health(): Fortune500ApiConfig {
    return this.svc.health();
  }
}
