// path: backend/src/storage/storage.module.ts
// purpose: NestJS module for file storage services with proper dependency injection
// dependencies: @nestjs/common, ConfigModule, PrismaModule, RedisModule

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileStorageService } from './file-storage.service';
import { StorageController } from './storage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [StorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class StorageModule {}