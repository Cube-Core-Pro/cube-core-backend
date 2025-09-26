import { Module } from '@nestjs/common';
import { MobilePwaController } from './mobile-pwa.controller';
import { MobilePwaService } from './mobile-pwa.service';

@Module({
  controllers: [MobilePwaController],
  providers: [MobilePwaService],
  exports: [MobilePwaService],
})
export class MobilePwaModule {}
