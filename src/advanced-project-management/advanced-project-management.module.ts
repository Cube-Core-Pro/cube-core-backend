import { Module } from '@nestjs/common';
import { AdvancedProjectManagementController } from './advanced-project-management.controller';
import { AdvancedProjectManagementService } from './advanced-project-management.service';

@Module({
  controllers: [AdvancedProjectManagementController],
  providers: [AdvancedProjectManagementService],
  exports: [AdvancedProjectManagementService],
})
export class AdvancedProjectManagementModule {}
