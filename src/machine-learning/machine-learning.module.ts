import { Module } from '@nestjs/common';
import { MachineLearningController } from './machine-learning.controller';
import { MachineLearningService } from './machine-learning.service';

@Module({
  controllers: [MachineLearningController],
  providers: [MachineLearningService],
  exports: [MachineLearningService],
})
export class MachineLearningModule {}
