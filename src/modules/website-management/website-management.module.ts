// path: backend/src/modules/website-management/website-management.module.ts
// purpose: Website management module configuration
// dependencies: @nestjs/common, prisma, redis

import { Module } from '@nestjs/common';
import { WebsiteManagementController } from './website-management.controller';
import { WebsiteManagementService } from './website-management.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [WebsiteManagementController],
  providers: [WebsiteManagementService],
  exports: [WebsiteManagementService],
})
export class WebsiteManagementModule {}