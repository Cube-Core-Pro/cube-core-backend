// path: backend/src/enterprise-office-suite/controllers/document.controller.ts
// purpose: Controller for office document management
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
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Res
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiParam
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { DocumentService } from '../services/document.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { DocumentPermission } from '../entities/document.entity';

@ApiTags('Enterprise Office Suite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('office/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Create a new document',
    description: 'Create a new office document (document, spreadsheet, presentation)'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Document created successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid document data' 
  })
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @Request() req: any
  ) {
    return this.documentService.create(
      createDocumentDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get all documents',
    description: 'Retrieve all documents accessible to the user'
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
    type: String,
    description: 'Filter by document type'
  })
  @ApiQuery({ 
    name: 'includePublic', 
    required: false, 
    type: Boolean,
    description: 'Include public documents'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Documents retrieved successfully' 
  })
  async findAll(
    @Request() req: any,
    @Query('folderId') folderId?: string,
    @Query('type') type?: string,
    @Query('includePublic') includePublic?: boolean
  ) {
    return this.documentService.findAll(
      req.user.tenantId,
      req.user.id,
      folderId,
      type,
      includePublic
    );
  }

  @Get(':id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get document by ID',
    description: 'Retrieve a specific document with full details'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Document retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Document not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Access denied' 
  })
  async findOne(
    @Param('id') id: string,
    @Request() req: any
  ) {
    return this.documentService.findOne(id, req.user.tenantId, req.user.id);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Update document',
    description: 'Update document content and metadata'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Document updated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Document not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Access denied' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: Partial<CreateDocumentDto>,
    @Request() req: any
  ) {
    return this.documentService.update(
      id,
      updateDocumentDto,
      req.user.tenantId,
      req.user.id
    );
  }

  @Delete(':id')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Delete document',
    description: 'Soft delete a document'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Document deleted successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Document not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Access denied' 
  })
  async remove(
    @Param('id') id: string,
    @Request() req: any
  ) {
    await this.documentService.remove(id, req.user.tenantId, req.user.id);
    return { message: 'Document deleted successfully' };
  }

  @Post(':id/collaborators')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Add collaborator',
    description: 'Add a collaborator to the document'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Collaborator added successfully' 
  })
  async addCollaborator(
    @Param('id') id: string,
    @Body() body: { userId: string; permission: DocumentPermission },
    @Request() req: any
  ) {
    await this.documentService.addCollaborator(
      id,
      body.userId,
      body.permission,
      req.user.id
    );
    return { message: 'Collaborator added successfully' };
  }

  @Delete(':id/collaborators/:userId')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Remove collaborator',
    description: 'Remove a collaborator from the document'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Collaborator removed successfully' 
  })
  async removeCollaborator(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any
  ) {
    await this.documentService.removeCollaborator(id, userId, req.user.id);
    return { message: 'Collaborator removed successfully' };
  }

  @Post(':id/comments')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Add comment',
    description: 'Add a comment to the document'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Comment added successfully' 
  })
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string; position?: Record<string, any> },
    @Request() req: any
  ) {
    return this.documentService.addComment(
      id,
      body.content,
      body.position,
      req.user.id
    );
  }

  @Get(':id/export')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Export document',
    description: 'Export document in specified format'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiQuery({ 
    name: 'format', 
    required: true, 
    type: String,
    description: 'Export format (PDF, DOCX, etc.)'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Document exported successfully' 
  })
  async exportDocument(
    @Param('id') id: string,
    @Query('format') format: string,
    @Request() req: any,
    @Res() res: Response
  ) {
    const buffer = await this.documentService.exportDocument(
      id,
      format,
      req.user.tenantId,
      req.user.id
    );

    const document = await this.documentService.findOne(
      id,
      req.user.tenantId,
      req.user.id
    );

    res.set({
      'Content-Type': this.getContentType(format),
      'Content-Disposition': `attachment; filename="${document.title}.${format.toLowerCase()}"`
    });

    res.send(buffer);
  }

  @Post('upload')
  @Roles('admin', 'user')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Upload document',
    description: 'Upload a document file'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Document uploaded successfully' 
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: { title?: string; folderId?: string },
    @Request() _req: any
  ) {
    // TODO: Implement file upload and conversion logic
    return {
      message: 'Document upload functionality will be implemented',
      filename: file.originalname,
      size: file.size,
      metadata
    };
  }

  @Get(':id/realtime-token')
  @Roles('admin', 'user')
  @ApiOperation({ 
    summary: 'Get real-time collaboration token',
    description: 'Get token for real-time collaboration session'
  })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token generated successfully' 
  })
  async getRealtimeToken(
    @Param('id') id: string,
    @Request() req: any
  ) {
    // Verify user has access to document
    await this.documentService.findOne(id, req.user.tenantId, req.user.id);

    // TODO: Generate JWT token for real-time collaboration
    return {
      token: 'realtime-collaboration-token',
      documentId: id,
      userId: req.user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private getContentType(format: string): string {
    const contentTypes = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odt': 'application/vnd.oasis.opendocument.text',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      'html': 'text/html',
      'txt': 'text/plain'
    };

    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }
}