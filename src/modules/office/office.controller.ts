// path: backend/src/modules/office/office.controller.ts
// purpose: REST API controller for Office Suite operations
// dependencies: NestJS, Prisma, authentication guards, validation

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
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { OfficeService } from './office.service';
import { DocumentService } from './services/document.service';
import { SpreadsheetService } from './services/spreadsheet.service';
import { PresentationService } from '../../office/services/presentation.service';
import { CollaborationService } from './services/collaboration.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  CreateFolderDto,
  ShareDocumentDto,
  DocumentQueryDto,
  CreateSpreadsheetDto,
  CreatePresentationDto,
  CollaborationInviteDto,
} from '../../office/dto/office.dto';
import { Response } from 'express';

@ApiTags('Office Suite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('office')
export class OfficeController {
  constructor(
    private readonly officeService: OfficeService,
    private readonly documentService: DocumentService,
    private readonly spreadsheetService: SpreadsheetService,
    private readonly presentationService: PresentationService,
    private readonly collaborationService: CollaborationService,
  ) {}

  // Document Management
  @Get('documents')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async getDocuments(@Request() req, @Query() query: DocumentQueryDto) {
    return this.officeService.getDocuments(req.user.tenantId, req.user.id, query);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async getDocument(@Request() req, @Param('id') id: string) {
    return this.officeService.getDocument(req.user.tenantId, req.user.id, id);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create new document' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  async createDocument(@Request() req, @Body() createDocumentDto: CreateDocumentDto) {
    return this.documentService.createDocument(
      req.user.tenantId,
      req.user.id,
      createDocumentDto,
    );
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentService.updateDocument(
      req.user.tenantId,
      req.user.id,
      id,
      updateDocumentDto,
    );
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@Request() req, @Param('id') id: string) {
    return this.officeService.deleteDocument(req.user.tenantId, req.user.id, id);
  }

  @Post('documents/:id/share')
  @ApiOperation({ summary: 'Share document' })
  @ApiResponse({ status: 200, description: 'Document shared successfully' })
  async shareDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() shareDto: ShareDocumentDto,
  ) {
    return this.collaborationService.shareDocument(
      req.user.tenantId,
      req.user.id,
      id,
      shareDto,
    );
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download document' })
  @ApiResponse({ status: 200, description: 'Document downloaded successfully' })
  async downloadDocument(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, filename, mimeType } = await this.officeService.downloadDocument(
      req.user.tenantId,
      req.user.id,
      id,
    );
    
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    
    return new StreamableFile(file);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: any,
  ) {
    let document = await this.officeService.uploadDocument(
      req.user.tenantId,
      req.user.id,
      file,
    );

    if (metadata) {
      const updatePayload: UpdateDocumentDto = {};
      if (metadata.name) updatePayload.title = metadata.name;
      if (metadata.description !== undefined) updatePayload.description = metadata.description;
      if (metadata.folderId !== undefined) updatePayload.folderId = metadata.folderId;
      if (metadata.tags) updatePayload.tags = metadata.tags;

      if (Object.keys(updatePayload).length > 0) {
        document = await this.documentService.updateDocument(
          req.user.tenantId,
          req.user.id,
          document.id,
          updatePayload,
        );
      }
    }

    return document;
  }

  // Spreadsheet Operations
  @Post('spreadsheets')
  @ApiOperation({ summary: 'Create new spreadsheet' })
  @ApiResponse({ status: 201, description: 'Spreadsheet created successfully' })
  async createSpreadsheet(@Request() req, @Body() createSpreadsheetDto: CreateSpreadsheetDto) {
    return this.spreadsheetService.createSpreadsheet(
      req.user.tenantId,
      req.user.id,
      createSpreadsheetDto,
    );
  }

  @Put('spreadsheets/:id/cells')
  @ApiOperation({ summary: 'Update spreadsheet cells' })
  @ApiResponse({ status: 200, description: 'Cells updated successfully' })
  async updateCells(
    @Request() req,
    @Param('id') id: string,
    @Body() cellUpdates: any,
  ) {
    return this.spreadsheetService.updateCells(
      req.user.tenantId,
      req.user.id,
      id,
      cellUpdates,
    );
  }

  @Post('spreadsheets/:id/calculate')
  @ApiOperation({ summary: 'Recalculate spreadsheet formulas' })
  @ApiResponse({ status: 200, description: 'Formulas calculated successfully' })
  async calculateFormulas(@Request() req, @Param('id') id: string) {
    return this.spreadsheetService.recalculate(req.user.tenantId, req.user.id, id);
  }

  // Presentation Operations
  @Post('presentations')
  @ApiOperation({ summary: 'Create new presentation' })
  @ApiResponse({ status: 201, description: 'Presentation created successfully' })
  async createPresentation(@Request() req, @Body() createPresentationDto: CreatePresentationDto) {
    return this.presentationService.createPresentation(
      req.user.tenantId,
      req.user.id,
      createPresentationDto,
    );
  }

  @Put('presentations/:id/slides/:slideId')
  @ApiOperation({ summary: 'Update presentation slide' })
  @ApiResponse({ status: 200, description: 'Slide updated successfully' })
  async updateSlide(
    @Request() req,
    @Param('id') id: string,
    @Param('slideId') slideId: string,
    @Body() slideData: any,
  ) {
    return this.presentationService.updateSlide(
      req.user.tenantId,
      req.user.id,
      id,
      slideId,
      slideData,
    );
  }

  @Post('presentations/:id/slides')
  @ApiOperation({ summary: 'Add new slide to presentation' })
  @ApiResponse({ status: 201, description: 'Slide added successfully' })
  async addSlide(
    @Request() req,
    @Param('id') id: string,
    @Body() slideData: any,
  ) {
    return this.presentationService.addSlide(
      req.user.tenantId,
      req.user.id,
      id,
      slideData,
    );
  }

  @Delete('presentations/:id/slides/:slideId')
  @ApiOperation({ summary: 'Delete slide from presentation' })
  @ApiResponse({ status: 200, description: 'Slide deleted successfully' })
  async deleteSlide(
    @Request() req,
    @Param('id') id: string,
    @Param('slideId') slideId: string,
  ) {
    return this.presentationService.deleteSlide(
      req.user.tenantId,
      req.user.id,
      id,
      slideId,
    );
  }

  @Put('presentations/:id/slides/reorder')
  @ApiOperation({ summary: 'Reorder slides in presentation' })
  @ApiResponse({ status: 200, description: 'Slides reordered successfully' })
  async reorderSlides(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { slideOrder: string[] },
  ) {
    return this.presentationService.reorderSlides(
      req.user.tenantId,
      req.user.id,
      id,
      body.slideOrder,
    );
  }

  @Post('presentations/:id/export')
  @ApiOperation({ summary: 'Export presentation' })
  @ApiResponse({ status: 200, description: 'Presentation exported successfully' })
  async exportPresentation(
    @Request() req,
    @Param('id') id: string,
    @Body() body: {
      format: 'pdf' | 'pptx' | 'html' | 'images';
      options?: any;
    },
  ) {
    return this.presentationService.exportPresentation(
      req.user.tenantId,
      req.user.id,
      id,
      body.format,
      body.options,
    );
  }

  @Post('presentations/:id/slideshow')
  @ApiOperation({ summary: 'Start presentation slideshow' })
  @ApiResponse({ status: 200, description: 'Slideshow started successfully' })
  async startSlideshow(
    @Request() req,
    @Param('id') id: string,
    @Body() body: {
      startSlide?: number;
      autoAdvance?: boolean;
      allowControl?: boolean;
      password?: string;
    },
  ) {
    return this.presentationService.startSlideshow(
      req.user.tenantId,
      req.user.id,
      id,
      body,
    );
  }

  // Folder Management
  @Get('folders')
  @ApiOperation({ summary: 'Get all folders' })
  @ApiResponse({ status: 200, description: 'Folders retrieved successfully' })
  async getFolders(@Request() req, @Query() query: any) {
    return this.officeService.getFolders(req.user.tenantId, req.user.id, query);
  }

  @Post('folders')
  @ApiOperation({ summary: 'Create new folder' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  async createFolder(@Request() req, @Body() createFolderDto: CreateFolderDto) {
    return this.officeService.createFolder(
      req.user.tenantId,
      req.user.id,
      createFolderDto,
    );
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Delete folder' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  async deleteFolder(@Request() req, @Param('id') id: string) {
    return this.officeService.deleteFolder(req.user.tenantId, req.user.id, id);
  }

  // Collaboration
  @Post('collaborate/invite')
  @ApiOperation({ summary: 'Invite user to collaborate' })
  @ApiResponse({ status: 200, description: 'Invitation sent successfully' })
  async inviteCollaborator(
    @Request() req,
    @Body() inviteDto: CollaborationInviteDto,
  ) {
    return this.collaborationService.inviteCollaborator(
      req.user.tenantId,
      req.user.id,
      inviteDto,
    );
  }

  @Get('collaborate/sessions/:documentId')
  @ApiOperation({ summary: 'Get active collaboration sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getCollaborationSessions(
    @Request() req,
    @Param('documentId') documentId: string,
  ) {
    return this.collaborationService.getActiveSessions(req.user.tenantId, documentId);
  }

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'Get document templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Request() req, @Query() query: any) {
    return this.officeService.getTemplates(req.user.tenantId, query);
  }

  @Post('templates/:id/use')
  @ApiOperation({ summary: 'Create document from template' })
  @ApiResponse({ status: 201, description: 'Document created from template' })
  async useTemplate(
    @Request() req,
    @Param('id') templateId: string,
    @Body() documentData: any,
  ) {
    return this.officeService.createFromTemplate(
      req.user.tenantId,
      req.user.id,
      templateId,
      documentData,
    );
  }

  // Version Control
  @Get('documents/:id/versions')
  @ApiOperation({ summary: 'Get document version history' })
  @ApiResponse({ status: 200, description: 'Version history retrieved successfully' })
  async getVersionHistory(@Request() req, @Param('id') id: string) {
    return this.officeService.getVersionHistory(req.user.tenantId, req.user.id, id);
  }

  @Post('documents/:id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore document version' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  async restoreVersion(
    @Request() req,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.officeService.restoreVersion(
      req.user.tenantId,
      req.user.id,
      id,
      versionId,
    );
  }
}
