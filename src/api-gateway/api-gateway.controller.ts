import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { Fortune500APIGatewayConfig } from '../types/fortune500-types';

@Controller('api-gateway')
export class ApiGatewayController {
  constructor(private readonly svc: ApiGatewayService) {}

  @Get('health')
  health(): Fortune500APIGatewayConfig {
    return this.svc.health();
  }
}
