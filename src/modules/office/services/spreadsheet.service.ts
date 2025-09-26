import { Injectable, NotFoundException } from '@nestjs/common';
import { SpreadsheetService as CoreSpreadsheetService } from '../../../office/services/spreadsheet.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../audit/audit.service';
import { DocumentService } from './document.service';
import { CreateSpreadsheetDto, CreateDocumentDto, DocumentType, DocumentFormat } from '../../../office/dto/office.dto';

@Injectable()
export class SpreadsheetService extends CoreSpreadsheetService {
  constructor(
    prisma: PrismaService,
    auditService: AuditService,
    private readonly documentService: DocumentService,
  ) {
    super(prisma, auditService);
  }

  async createSpreadsheet(tenantId: string, userId: string, dto: CreateSpreadsheetDto) {
    const createDto: CreateDocumentDto = {
      title: dto.name,
      type: DocumentType.SPREADSHEET,
      format: DocumentFormat.XLSX,
      description: dto.description,
      content: dto.sheets,
    };

    return this.documentService.create(tenantId, userId, createDto);
  }

  async updateCells(
    tenantId: string,
    userId: string,
    documentId: string,
    cellUpdates: Record<string, any>,
  ) {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        tenantId,
        type: 'SPREADSHEET',
      },
    });

    if (!document) {
      throw new NotFoundException('Spreadsheet not found');
    }

    const content = document.content as Record<string, any>;
    const sheets = content?.sheets || [];

    Object.entries(cellUpdates).forEach(([sheetName, updates]) => {
      const sheet = sheets.find((s: any) => s.name === sheetName);
      if (!sheet) {
        sheets.push({ name: sheetName, cells: updates, rows: 100, cols: 26 });
        return;
      }

      sheet.cells = {
        ...(sheet.cells || {}),
        ...(updates as Record<string, any>),
      };
    });

    await this.prisma.officeDocument.update({
      where: { id: documentId },
      data: {
        content: {
          ...content,
          sheets,
        },
        updatedAt: new Date(),
      },
    });

    return this.prisma.officeDocument.findUnique({ where: { id: documentId } });
  }

  async recalculate(tenantId: string, userId: string, documentId: string) {
    return this.calculate(tenantId, userId, documentId);
  }
}
