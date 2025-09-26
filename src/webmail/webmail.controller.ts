// path: src/webmail/webmail.controller.ts
// purpose: Enterprise WebMail REST API controller - basic implementation
// dependencies: NestJS, Swagger, WebMail Service

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { WebmailService } from './webmail.service';
import { Fortune500WebmailConfig } from '../types/fortune500-types';

@ApiTags('Enterprise WebMail')
@Controller('webmail')
export class WebmailController {
  constructor(
    private readonly webmailService: WebmailService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'WebMail module health check' })
  @ApiResponse({ status: HttpStatus.OK, description: 'WebMail module is healthy' })
  health(): Fortune500WebmailConfig {
    return this.webmailService.health();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get webmail dashboard data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.webmailService.getDashboard(tenantId, userId);
  }

  @Get('emails')
  @ApiOperation({ summary: 'Get emails from folder' })
  @ApiQuery({ name: 'folder', required: false, description: 'Email folder (inbox, sent, drafts, trash, spam)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Emails retrieved successfully' })
  async getEmails(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Query('folder') folder?: string
  ) {
    return this.webmailService.getEmails(tenantId, userId, folder);
  }

  @Post('emails/send')
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Email sent successfully' })
  async sendEmail(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
    @Body() emailData: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      attachments?: any[];
    }
  ) {
    return this.webmailService.sendEmail(tenantId, userId, emailData);
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Get contacts' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contacts retrieved successfully' })
  async getContacts(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.webmailService.getContacts(tenantId, userId);
  }

  @Get('calendar/events')
  @ApiOperation({ summary: 'Get calendar events' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Calendar events retrieved successfully' })
  async getCalendarEvents(@Headers('x-tenant-id') tenantId: string, @Headers('x-user-id') userId: string) {
    return this.webmailService.getCalendarEvents(tenantId, userId);
  }
}