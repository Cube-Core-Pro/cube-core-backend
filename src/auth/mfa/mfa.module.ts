import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [MfaController],
  providers: [MfaService, PrismaService],
  exports: [MfaService],
})
export class MfaModule {}
