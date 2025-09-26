// path: backend/src/database/database.module.ts
// purpose: Database module with Prisma client configuration
// dependencies: Prisma client, NestJS Module

import { Module, Global } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}