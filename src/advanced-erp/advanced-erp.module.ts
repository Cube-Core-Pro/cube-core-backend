import { Module } from '@nestjs/common';
import { AdvancedErpController } from './advanced-erp.controller';
import { AdvancedErpService } from './advanced-erp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AdvancedErpController],
  providers: [
    AdvancedErpService,
  ],
  exports: [
    AdvancedErpService,
  ],
})
export class AdvancedErpModule {}
