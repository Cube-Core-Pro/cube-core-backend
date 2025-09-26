import { Module } from '@nestjs/common';
import { AdvancedFinancialManagementController } from './advanced-financial-management.controller';
import { AdvancedFinancialManagementService } from './advanced-financial-management.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AdvancedFinancialManagementController],
  providers: [
    AdvancedFinancialManagementService,
  ],
  exports: [
    AdvancedFinancialManagementService,
  ],
})
export class AdvancedFinancialManagementModule {}
