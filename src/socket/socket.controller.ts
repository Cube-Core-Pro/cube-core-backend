import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { SocketService } from './socket.service';
import { Fortune500SocketConfig, ExecutiveRealTimeNotifications } from '../types/fortune500-types';

@Controller('socket')
export class SocketController {
  constructor(private readonly socketService: SocketService) {}

  @Get('health')
  async health(): Promise<Fortune500SocketConfig> {
    return this.socketService.health();
  }

  @Post('infrastructure/:tenantId')
  async deployInfrastructure(
    @Param('tenantId') tenantId: string,
    @Body() requirements: any
  ) {
    return await this.socketService.deployEnterpriseWebSocketInfrastructure(
      tenantId,
      requirements
    );
  }

  @Post('messaging/:tenantId')
  async implementMessaging(
    @Param('tenantId') tenantId: string,
    @Body() body: { businessChannels: string[]; messagingRequirements: any }
  ) {
    return await this.socketService.implementRealTimeBusinessMessaging(
      tenantId,
      body.businessChannels,
      body.messagingRequirements
    );
  }

  @Post('collaboration/:tenantId')
  async deployCollaboration(
    @Param('tenantId') tenantId: string,
    @Body() collaborationRequirements: any
  ) {
    return await this.socketService.deployGlobalRealTimeCollaboration(
      tenantId,
      collaborationRequirements
    );
  }

  @Post('event-streaming/:tenantId')
  async implementEventStreaming(
    @Param('tenantId') tenantId: string,
    @Body() body: { eventSources: string[]; streamingRequirements: any }
  ) {
    return await this.socketService.implementEnterpriseEventStreaming(
      tenantId,
      body.eventSources,
      body.streamingRequirements
    );
  }

  @Post('analytics/:tenantId')
  async deployAnalytics(
    @Param('tenantId') tenantId: string,
    @Body() analyticsRequirements: any
  ) {
    return await this.socketService.deployWebSocketAnalytics(
      tenantId,
      analyticsRequirements
    );
  }

  @Post('executive-notifications/:tenantId')
  async setupExecutiveNotifications(
    @Param('tenantId') tenantId: string,
    @Body() body: { executiveLevel: string; notificationRequirements: any }
  ) {
    return await this.socketService.implementExecutiveRealTimeNotifications(
      tenantId,
      body.executiveLevel as ExecutiveRealTimeNotifications['executiveLevel'],
      body.notificationRequirements
    );
  }

  @Post('connection/:tenantId')
  async establishConnection(
    @Param('tenantId') tenantId: string,
    @Body() body: { userId: string; socketType: string; communicationRequirements: any }
  ) {
    return await this.socketService.establishRealTimeSocketCommunication(
      tenantId,
      body.userId,
      body.socketType,
      body.communicationRequirements
    );
  }
}
