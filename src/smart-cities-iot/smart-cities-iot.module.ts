import { Module } from '@nestjs/common';
import { SmartCitiesIotController } from './smart-cities-iot.controller';
import { SmartCitiesIotService } from './smart-cities-iot.service';

@Module({
  controllers: [SmartCitiesIotController],
  providers: [SmartCitiesIotService],
  exports: [SmartCitiesIotService],
})
export class SmartCitiesIotModule {}
