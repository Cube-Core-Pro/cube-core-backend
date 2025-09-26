import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService]
})
export class ContentModule {}

