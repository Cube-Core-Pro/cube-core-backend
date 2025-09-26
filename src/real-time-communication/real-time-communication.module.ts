import { Module } from '@nestjs/common';
import { RealTimeCommunicationController } from './real-time-communication.controller';
import { RealTimeCommunicationService } from './real-time-communication.service';

@Module({
  controllers: [RealTimeCommunicationController],
  providers: [RealTimeCommunicationService],
  exports: [RealTimeCommunicationService],
})
export class RealTimeCommunicationModule {}
