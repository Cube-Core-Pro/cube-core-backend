import { Module } from '@nestjs/common';
import { AdvancedSecurityController } from './advanced-security.controller';
import { AdvancedSecurityService } from './advanced-security.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [AdvancedSecurityController],
  providers: [
    AdvancedSecurityService,
  ],
  exports: [
    AdvancedSecurityService,
  ],
})
export class AdvancedSecurityModule {}
