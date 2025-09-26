// path: backend/src/dashboard/dashboard.module.ts
// purpose: Dashboard module for analytics and metrics
// dependencies: DatabaseModule, RedisModule

import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { RedisModule } from "../redis/redis.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}