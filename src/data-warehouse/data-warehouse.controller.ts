import { Controller, Get } from '@nestjs/common';
import { DataWarehouseService } from './data-warehouse.service';

@Controller('data-warehouse')
export class DataWarehouseController {
  constructor(private readonly svc: DataWarehouseService) {}

  @Get('health')
  health() {
    return this.svc.health();
  }
}
