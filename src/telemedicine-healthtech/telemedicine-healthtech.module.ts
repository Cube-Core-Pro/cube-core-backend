import { Module } from '@nestjs/common';
import { TelemedicineHealthtechController } from './telemedicine-healthtech.controller';
import { TelemedicineHealthtechService } from './telemedicine-healthtech.service';

@Module({
  controllers: [TelemedicineHealthtechController],
  providers: [TelemedicineHealthtechService],
  exports: [TelemedicineHealthtechService],
})
export class TelemedicineHealthtechModule {}
