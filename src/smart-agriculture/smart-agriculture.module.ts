import { Module } from '@nestjs/common';
import { SmartAgricultureController } from './smart-agriculture.controller';
import { SmartAgricultureService } from './smart-agriculture.service';

@Module({
  controllers: [SmartAgricultureController],
  providers: [SmartAgricultureService],
  exports: [SmartAgricultureService],
})
export class SmartAgricultureModule {}
