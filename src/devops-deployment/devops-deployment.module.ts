import { Module } from '@nestjs/common';
import { DevopsDeploymentController } from './devops-deployment.controller';
import { DevopsDeploymentService } from './devops-deployment.service';

@Module({
  controllers: [DevopsDeploymentController],
  providers: [DevopsDeploymentService],
  exports: [DevopsDeploymentService],
})
export class DevopsDeploymentModule {}
