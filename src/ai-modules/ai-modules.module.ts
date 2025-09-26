import { Module } from '@nestjs/common';
import { AiModulesController } from './ai-modules.controller';
import { AiModulesService } from './ai-modules.service';

@Module({
  controllers: [AiModulesController],
  providers: [AiModulesService],
  exports: [AiModulesService],
})
export class AiModulesModule {}
