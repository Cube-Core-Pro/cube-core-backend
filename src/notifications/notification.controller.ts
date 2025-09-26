// path: backend/src/notifications/notification.controller.ts
// purpose: REST API controller for notification management with comprehensive endpoints
// dependencies: @nestjs/common, @nestjs/swagger, NotificationService

import {
  Controller,
  Get,
  Post,
  Put,
  
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  NotificationService,
  NotificationPayload,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from './notification.service';

@ApiTags('Notifications')
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotification(
    @Body() payload: NotificationPayload,
    @Request() req: any,
  ): Promise<{ notificationId: string }> {
    payload.tenantId = req.user.tenantId;
    const notificationId = await this.notificationService.sendNotification(payload);
    return { notificationId };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send multiple notifications' })
  @ApiResponse({ status: 201, description: 'Bulk notifications sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendBulkNotifications(
    @Body() notifications: NotificationPayload[],
    @Request() req: any,
  ): Promise<{ notificationIds: string[] }> {
    notifications.forEach(notification => {
      notification.tenantId = req.user.tenantId;
    });
    
    const notificationIds = await this.notificationService.sendBulkNotifications(notifications);
    return { notificationIds };
  }

  @Post('template/:templateId')
  @ApiOperation({ summary: 'Send notification using template' })
  @ApiResponse({ status: 201, description: 'Templated notification sent successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTemplatedNotification(
    @Param('templateId') templateId: string,
    @Body() body: {
      recipients: any[];
      variables?: Record<string, any>;
      priority?: NotificationPriority;
      scheduledAt?: string;
      expiresAt?: string;
      metadata?: Record<string, any>;
    },
    @Request() req: any,
  ): Promise<{ notificationId: string }> {
    const notificationId = await this.notificationService.sendTemplatedNotification(
      req.user.tenantId,
      templateId,
      body.recipients,
      body.variables,
      {
        priority: body.priority,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        metadata: body.metadata,
      }
    );
    
    return { notificationId };
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Request() req: any,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
    @Query('priority') priority?: NotificationPriority,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    return this.notificationService.getNotifications(
      req.user.tenantId,
      req.user.sub,
      {
        type,
        status,
        priority,
        page: page ? parseInt(page.toString()) : undefined,
        limit: limit ? parseInt(limit.toString()) : undefined,
        unreadOnly: unreadOnly === true || unreadOnly?.toString() === 'true',
      }
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyNotifications(
    @Request() req: any,
    @Query('type') type?: NotificationType,
    @Query('status') status?: NotificationStatus,
    @Query('priority') priority?: NotificationPriority,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    return this.notificationService.getNotifications(
      req.user.tenantId,
      req.user.sub,
      {
        type,
        status,
        priority,
        page: page ? parseInt(page.toString()) : undefined,
        limit: limit ? parseInt(limit.toString()) : undefined,
        unreadOnly: unreadOnly === true || unreadOnly?.toString() === 'true',
      }
    );
  }

  @Put(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(notificationId, req.user.sub);
    return { success: true };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Request() req: any): Promise<{ success: boolean }> {
    await this.notificationService.markAllAsRead(req.user.sub);
    return { success: true };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles('admin', 'super-admin')
  async getTemplates(@Request() _req: any): Promise<any[]> {
    // Implementation would fetch templates from database
    return [];
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles('admin', 'super-admin')
  async createTemplate(
    @Body() template: {
      name: string;
      type: NotificationType;
      subject?: string;
      body: string;
      variables: string[];
      isActive: boolean;
    },
    @Request() req: any,
  ): Promise<any> {
    return this.notificationService.createTemplate(req.user.tenantId, template);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles('admin', 'super-admin')
  async getStats(
    @Request() req: any,
    @Query('days') days?: number,
  ): Promise<any> {
    return this.notificationService.getNotificationStats(
      req.user.tenantId,
      days ? parseInt(days.toString()) : undefined
    );
  }

  @Post(':notificationId/retry')
  @ApiOperation({ summary: 'Retry failed notification' })
  @ApiResponse({ status: 200, description: 'Notification retry initiated' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Roles('admin', 'super-admin')
  async retryNotification(
    @Param('notificationId') notificationId: string,
    @Request() _req: any,
  ): Promise<{ success: boolean }> {
    await this.notificationService.processNotification(notificationId);
    return { success: true };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check notification service health' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    services: Record<string, boolean>;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        email: true, // Would check SMTP connectivity
        sms: false, // Would check SMS provider
        push: false, // Would check push notification service
        webhook: true,
        slack: false, // Would check Slack API
        teams: false, // Would check Teams API
      },
    };
  }
}