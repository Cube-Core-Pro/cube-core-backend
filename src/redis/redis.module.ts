// path: backend/src/redis/redis.module.ts
// purpose: Redis module for caching and session management
// dependencies: ioredis

import { Module, Global } from "@nestjs/common";
import { RedisService } from "./redis.service";

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}