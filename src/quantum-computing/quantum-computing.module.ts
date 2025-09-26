import { Module } from '@nestjs/common';
import { QuantumComputingController } from './quantum-computing.controller';
import { QuantumComputingService } from './quantum-computing.service';

@Module({
  controllers: [QuantumComputingController],
  providers: [QuantumComputingService],
  exports: [QuantumComputingService],
})
export class QuantumComputingModule {}
