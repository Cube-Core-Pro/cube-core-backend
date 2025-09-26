import { Module } from '@nestjs/common';
import { MetaverseVrCollaborationController } from './metaverse-vr-collaboration.controller';
import { MetaverseVrCollaborationService } from './metaverse-vr-collaboration.service';

@Module({
  controllers: [MetaverseVrCollaborationController],
  providers: [MetaverseVrCollaborationService],
  exports: [MetaverseVrCollaborationService],
})
export class MetaverseVrCollaborationModule {}
