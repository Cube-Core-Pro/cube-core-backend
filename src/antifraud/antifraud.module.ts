import { Module } from '@nestjs/common';
import { AntifraudController } from './antifraud.controller';
import { AntifraudService } from './antifraud.service';

@Module({
  controllers: [AntifraudController],
  providers: [AntifraudService],
  exports: [AntifraudService],
})
export class AntifraudModule {}
