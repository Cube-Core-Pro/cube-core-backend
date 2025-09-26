// path: backend/src/modules/collaboration/collaboration.module.ts
// purpose: Enterprise Collaboration Framework Module
// dependencies: @nestjs/common, prisma, websockets, redis

import { Module } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';
import { CollaborationGateway } from './collaboration.gateway';
import { DocumentPermissionService } from './services/document-permission.service';
import { CollaborationSessionService } from './services/collaboration-session.service';
import { DocumentActivityService } from './services/document-activity.service';
import { AiTeamIntelligenceService } from './services/ai-team-intelligence.service';
import { MessagingService } from './services/messaging.service';
import { FileSharingService } from './services/file-sharing.service';
import { TeamManagementService } from './services/team-management.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [CollaborationController],
  providers: [
    CollaborationService,
    CollaborationGateway,
    DocumentPermissionService,
    CollaborationSessionService,
    DocumentActivityService,
    AiTeamIntelligenceService,
    MessagingService,
    FileSharingService,
    TeamManagementService,
  ],
  exports: [
    CollaborationService,
    DocumentPermissionService,
    CollaborationSessionService,
    DocumentActivityService,
    AiTeamIntelligenceService,
    MessagingService,
    FileSharingService,
    TeamManagementService,
  ],
})
export class CollaborationModule {}