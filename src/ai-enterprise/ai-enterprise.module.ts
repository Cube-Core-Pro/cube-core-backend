import { Module } from '@nestjs/common';
import { AiEnterpriseController } from './ai-enterprise.controller';
import { AiEnterpriseService } from './ai-enterprise.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
  ],
  controllers: [AiEnterpriseController],
  providers: [
    AiEnterpriseService,
  ],
  exports: [
    AiEnterpriseService,
  ],
})
export class AiEnterpriseModule {}
