// path: backend/src/modules/collaboration/collaboration.controller.ts
// purpose: REST API endpoints for collaboration management
// dependencies: @nestjs/common, swagger, guards, validation

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CollaborationService } from './collaboration.service';
import {
  CreateCollaborationSessionDto,
  UpdateDocumentDto,
  InviteCollaboratorDto,
  CollaborationMetricsQueryDto,
} from './dto';

@ApiTags('Collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('documents/:documentId/sessions')
  @ApiOperation({ summary: 'Start collaboration session' })
  @ApiResponse({ status: 201, description: 'Collaboration session started' })
  @Roles('USER', 'ADMIN')
  async startCollaboration(
    @Param('documentId') documentId: string,
    @Body() dto: CreateCollaborationSessionDto,
    @Request() req: any,
  ) {
    return this.collaborationService.startCollaboration(
      documentId,
      req.user.id,
      req.user.tenantId,
      dto,
    );
  }

  @Put('documents/:documentId')
  @ApiOperation({ summary: 'Update document content' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  @Roles('USER', 'ADMIN')
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @Request() req: any,
  ) {
    return this.collaborationService.updateDocument(
      documentId,
      req.user.id,
      req.user.tenantId,
      dto,
    );
  }

  @Post('documents/:documentId/invitations')
  @ApiOperation({ summary: 'Invite collaborator to document' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @Roles('USER', 'ADMIN')
  async inviteCollaborator(
    @Param('documentId') documentId: string,
    @Body() dto: InviteCollaboratorDto,
    @Request() req: any,
  ) {
    return this.collaborationService.inviteCollaborator(
      documentId,
      req.user.id,
      req.user.tenantId,
      dto,
    );
  }

  @Get('documents/:documentId/collaborators')
  @ApiOperation({ summary: 'Get active collaborators' })
  @ApiResponse({ status: 200, description: 'Active collaborators retrieved' })
  @Roles('USER', 'ADMIN')
  async getActiveCollaborators(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.collaborationService.getActiveCollaborators(
      documentId,
      req.user.tenantId,
    );
  }

  @Get('documents/:documentId/activity')
  @ApiOperation({ summary: 'Get document activity history' })
  @ApiResponse({ status: 200, description: 'Activity history retrieved' })
  @Roles('USER', 'ADMIN')
  async getDocumentActivity(
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.collaborationService.getDocumentActivity(
      documentId,
      req.user.tenantId,
      limit,
    );
  }

  @Delete('documents/:documentId/sessions')
  @ApiOperation({ summary: 'End collaboration session' })
  @ApiResponse({ status: 200, description: 'Collaboration session ended' })
  @Roles('USER', 'ADMIN')
  async endCollaboration(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return this.collaborationService.endCollaboration(
      documentId,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get collaboration metrics' })
  @ApiResponse({ status: 200, description: 'Collaboration metrics retrieved' })
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  async getCollaborationMetrics(
    @Query() query: CollaborationMetricsQueryDto,
    @Request() req: any,
  ) {
    const dateRange = query.from && query.to ? {
      from: new Date(query.from),
      to: new Date(query.to),
    } : undefined;

    return this.collaborationService.getCollaborationMetrics(
      req.user.tenantId,
      dateRange,
    );
  }
}