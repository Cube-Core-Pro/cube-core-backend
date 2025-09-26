import { Controller, Get } from '@nestjs/common';
import { IntelligentEcommerceService } from './intelligent-ecommerce.service';
import { Fortune500ECommerceConfig } from '../types/fortune500-types';

@Controller('intelligent-ecommerce')
export class IntelligentEcommerceController {
  constructor(private readonly svc: IntelligentEcommerceService) {}

  @Get('health')
  health(): Fortune500ECommerceConfig {
    return this.svc.health();
  }
}
