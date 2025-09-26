import { Module } from '@nestjs/common';
import { NoCodeAiBuilderController } from './no-code-ai-builder.controller';
import { NoCodeAiBuilderService } from './no-code-ai-builder.service';

@Module({
  controllers: [NoCodeAiBuilderController],
  providers: [NoCodeAiBuilderService],
  exports: [NoCodeAiBuilderService],
})
export class NoCodeAiBuilderModule {}
