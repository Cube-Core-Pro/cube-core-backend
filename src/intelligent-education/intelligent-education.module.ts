import { Module } from '@nestjs/common';
import { IntelligentEducationController } from './intelligent-education.controller';
import { IntelligentEducationService } from './intelligent-education.service';

@Module({
  controllers: [IntelligentEducationController],
  providers: [IntelligentEducationService],
  exports: [IntelligentEducationService],
})
export class IntelligentEducationModule {}
