import { Module } from '@nestjs/common';
import { AdvancedCrmController } from './advanced-crm.controller';
import { AdvancedCrmService } from './advanced-crm.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [AdvancedCrmController],
  providers: [
    AdvancedCrmService,
  ],
  exports: [
    AdvancedCrmService,
  ],
})
export class AdvancedCrmModule {}
