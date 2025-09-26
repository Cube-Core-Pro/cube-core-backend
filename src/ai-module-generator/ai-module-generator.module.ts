import { Module } from '@nestjs/common';
import { AiModuleGeneratorController } from './ai-module-generator.controller';
import { AiModuleGeneratorService } from './ai-module-generator.service';

@Module({
  controllers: [AiModuleGeneratorController],
  providers: [AiModuleGeneratorService],
  exports: [AiModuleGeneratorService],
})
export class AiModuleGeneratorModule {}
