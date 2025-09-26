// path: backend/src/enterprise-webmail/controllers/email.controller.ts
// purpose: Controller for enterprise email management
// dependencies: @nestjs/common, @nestjs/swagger, guards, services

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { EmailService } from '../services/email.service';
import { CreateEmailDto, EmailType } from '../dto/create-email.dto';

@ApiTags('Enterprise WebMail')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('webmail')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('emails')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Create a new email',
    description: 'Create a new email draft'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Email created successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid email data' 
  })
  async create(
    @Body() createEmailDto: CreateEmailDto,
    @Request() req: any
  ) {
    return this.emailService.create(
      createEmailDto,
      req.user.tenantId,
      req.user.id,
      req.user.email
    );
  }

  @Post('emails/:id/send')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Send email',
    description: 'Send a draft email'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email sent successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Email not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Cannot send email' 
  })
  async send(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.emailService.send(id, req.user.tenantId, req.user.id);
    return { message: 'Email sent successfully' };
  }

  @Get('emails')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get all emails',
    description: 'Retrieve all emails for the user'
  })
  @ApiQuery({ 
    name: 'folderId', 
    required: false, 
    type: String,
    description: 'Filter by folder ID'
  })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    enum: EmailType,
    description: 'Filter by email type'
  })
  @ApiQuery({ 
    name: 'isRead', 
    required: false, 
    type: Boolean,
    description: 'Filter by read status'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of emails to return'
  })
  @ApiQuery({ 
    name: 'offset', 
    required: false, 
    type: Number,
    description: 'Number of emails to skip'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Emails retrieved successfully' 
  })
  async findAll(
    @Request() req: any,
    @Query('folderId') folderId?: string,
    @Query('type') type?: EmailType,
    @Query('isRead') isRead?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.emailService.findAll(
      req.user.tenantId,
      req.user.id,
      folderId,
      type,
      isRead,
      limit || 50,
      offset || 0
    );
  }

  @Get('emails/:id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get email by ID',
    description: 'Retrieve a specific email'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Email not found' 
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.emailService.findOne(id, req.user.tenantId, req.user.id);
  }

  @Patch('emails/:id/read')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Mark email as read',
    description: 'Mark an email as read'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email marked as read' 
  })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.emailService.markAsRead(id, req.user.tenantId, req.user.id);
    return { message: 'Email marked as read' };
  }

  @Patch('emails/:id/star')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Star/unstar email',
    description: 'Toggle star status of an email'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email star status updated' 
  })
  async toggleStar(
    @Param('id') id: string,
    @Body() body: { starred: boolean },
    @Request() req: any
  ) {
    await this.emailService.markAsStarred(id, req.user.tenantId, req.user.id, body.starred);
    return { message: `Email ${body.starred ? 'starred' : 'unstarred'} successfully` };
  }

  @Patch('emails/:id/move')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Move email to folder',
    description: 'Move an email to a different folder'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Email moved successfully' 
  })
  async moveToFolder(
    @Param('id') id: string,
    @Body() body: { folderId: string },
    @Request() req: any
  ) {
    await this.emailService.moveToFolder(id, body.folderId, req.user.tenantId, req.user.id);
    return { message: 'Email moved successfully' };
  }

  @Delete('emails/:id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Delete email',
    description: 'Soft delete an email'
  })
  @ApiParam({ name: 'id', description: 'Email ID' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Email deleted successfully' 
  })
  async remove(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.emailService.delete(id, req.user.tenantId, req.user.id);
    return { message: 'Email deleted successfully' };
  }

  @Get('search')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Search emails',
    description: 'Search emails by query and filters'
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    type: String,
    description: 'Search query'
  })
  @ApiQuery({ 
    name: 'from', 
    required: false, 
    type: String,
    description: 'Filter by sender'
  })
  @ApiQuery({ 
    name: 'to', 
    required: false, 
    type: String,
    description: 'Filter by recipient'
  })
  @ApiQuery({ 
    name: 'subject', 
    required: false, 
    type: String,
    description: 'Filter by subject'
  })
  @ApiQuery({ 
    name: 'dateFrom', 
    required: false, 
    type: String,
    description: 'Filter by date from (ISO string)'
  })
  @ApiQuery({ 
    name: 'dateTo', 
    required: false, 
    type: String,
    description: 'Filter by date to (ISO string)'
  })
  @ApiQuery({ 
    name: 'hasAttachments', 
    required: false, 
    type: Boolean,
    description: 'Filter by attachment presence'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully' 
  })
  async search(
    @Query('q') query: string,
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('subject') subject?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hasAttachments') hasAttachments?: boolean
  ) {
    const filters: any = {};
    if (from) filters.from = from;
    if (to) filters.to = to;
    if (subject) filters.subject = subject;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (hasAttachments !== undefined) filters.hasAttachments = hasAttachments;

    return this.emailService.searchEmails(
      query,
      req.user.tenantId,
      req.user.id,
      filters
    );
  }

  @Post('folders')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Create email folder',
    description: 'Create a new email folder'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Folder created successfully' 
  })
  async createFolder(
    @Body() body: { name: string; parentId?: string },
    @Request() req: any
  ) {
    return this.emailService.createFolder(
      body.name,
      body.parentId,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get('folders')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get email folders',
    description: 'Retrieve all email folders for the user'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Folders retrieved successfully' 
  })
  async getFolders(@Request() req: any) {
    return this.emailService.getFolders(req.user.tenantId, req.user.id);
  }

  @Get('stats')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get email statistics',
    description: 'Get email statistics for the user'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Statistics retrieved successfully' 
  })
  async getStats(@Request() _req: any) {
    // TODO: Implement email statistics
    return {
      totalEmails: 0,
      unreadEmails: 0,
      sentEmails: 0,
      draftEmails: 0,
      spamEmails: 0,
      storageUsed: 0,
      storageLimit: 1024 * 1024 * 1024 // 1GB
    };
  }
}