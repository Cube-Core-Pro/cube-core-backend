// path: backend/src/siat/siat.module.ts
// purpose: Main SIAT module configuration
// dependencies: @nestjs/common, prisma, auth

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SiatController } from './controllers/siat.controller';
import { SiatFlowController } from './controllers/siat-flow.controller';
import { SiatTemplateController } from './controllers/siat-template.controller';
import { SiatEngineService } from './services/siat-engine.service';
import { SiatFlowService } from './services/siat-flow.service';
import { SiatTemplateService } from './services/siat-template.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SiatController,
    SiatFlowController,
    SiatTemplateController
  ],
  providers: [
    SiatEngineService,
    SiatFlowService,
    SiatTemplateService
  ],
  exports: [
    SiatEngineService,
    SiatFlowService,
    SiatTemplateService
  ]
})
export class SiatModule {}