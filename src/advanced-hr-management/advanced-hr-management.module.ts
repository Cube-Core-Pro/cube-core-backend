import { Module } from '@nestjs/common';
import { AdvancedHrManagementController } from './advanced-hr-management.controller';
import { AdvancedHrManagementService } from './advanced-hr-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AdvancedHrManagementController],
  providers: [
    AdvancedHrManagementService,
  ],
  exports: [
    AdvancedHrManagementService,
  ],
})
export class AdvancedHrManagementModule {}
