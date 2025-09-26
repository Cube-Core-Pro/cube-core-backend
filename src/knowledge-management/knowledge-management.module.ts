import { Module } from '@nestjs/common';
import { KnowledgeManagementController } from './knowledge-management.controller';
import { KnowledgeManagementService } from './knowledge-management.service';

@Module({
  controllers: [KnowledgeManagementController],
  providers: [KnowledgeManagementService],
  exports: [KnowledgeManagementService],
})
export class KnowledgeManagementModule {}
