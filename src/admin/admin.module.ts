import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CrmModule } from '../crm/crm.module';
import { FeatureFlagsController } from './feature-flags.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminLeadsController } from './leads.controller';

@Module({
  imports: [DatabaseModule, CrmModule],
  controllers: [AdminController, FeatureFlagsController, AdminLeadsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
