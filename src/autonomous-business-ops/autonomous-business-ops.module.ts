import { Module } from '@nestjs/common';
import { AutonomousBusinessOpsController } from './autonomous-business-ops.controller';
import { AutonomousBusinessOpsService } from './autonomous-business-ops.service';

@Module({
  controllers: [AutonomousBusinessOpsController],
  providers: [AutonomousBusinessOpsService],
  exports: [AutonomousBusinessOpsService],
})
export class AutonomousBusinessOpsModule {}
