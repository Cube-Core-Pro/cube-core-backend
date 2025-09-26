import { Module } from '@nestjs/common';
import { AdvancedFintechController } from './advanced-fintech.controller';
import { AdvancedFintechService } from './advanced-fintech.service';

@Module({
  controllers: [AdvancedFintechController],
  providers: [AdvancedFintechService],
  exports: [AdvancedFintechService],
})
export class AdvancedFintechModule {}
