// path: backend/src/enterprise-command-center/enterprise-command-center.module.ts
// purpose: Fortune 500 Enterprise Command Center Module
// dependencies: @nestjs/common, prisma, redis, websockets

import { Module } from '@nestjs/common';
import { EnterpriseCommandCenterController } from './enterprise-command-center.controller';
import { EnterpriseCommandCenterService } from './enterprise-command-center.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [EnterpriseCommandCenterController],
  providers: [EnterpriseCommandCenterService],
  exports: [EnterpriseCommandCenterService],
})
export class EnterpriseCommandCenterModule {}