// path: backend/src/modules/system-optimization/system-optimization.module.ts
// purpose: Module for system optimization and performance monitoring
// dependencies: @nestjs/common, system-optimization.service

import { Module } from '@nestjs/common';
import { SystemOptimizationService } from './system-optimization.service';
import { SystemOptimizationController } from './system-optimization.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [SystemOptimizationService],
  controllers: [SystemOptimizationController],
  exports: [SystemOptimizationService],
})
export class SystemOptimizationModule {}