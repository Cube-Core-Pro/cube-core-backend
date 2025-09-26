// path: backend/src/office/services/spreadsheet.service.ts
// purpose: Spreadsheet-specific operations for Office Suite
// dependencies: NestJS, Prisma, Logger, AuditService

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class SpreadsheetService {
  private readonly logger = new Logger(SpreadsheetService.name);

  constructor(
    protected prisma: PrismaService,
    protected auditService: AuditService,
  ) {}

  async calculate(tenantId: string, userId: string, documentId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const permission = await this.getUserPermission(document, userId);
      if (!['VIEW', 'COMMENT', 'EDIT', 'ADMIN'].includes(permission)) {
        throw new ForbiddenException('Access denied');
      }

      const content = document.content as any;
      const calculatedContent = await this.calculateFormulas(content);

      // Update document with calculated values
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { 
          content: calculatedContent,
          // lastCalculatedAt: new Date(), // Field doesn't exist
        }
      });

      // Log audit event (commented out - method doesn't exist)
      // await this.auditService.log({
      //   tenantId,
      //   userId,
      //   action: 'CALCULATE',
      //   resource: `office:spreadsheet:${documentId}`,
      //   details: { calculatedAt: new Date() },
      // });

      return {
        message: 'Spreadsheet calculated successfully',
        content: calculatedContent,
      };
    } catch (error) {
      this.logger.error('Error calculating spreadsheet:', error);
      throw error;
    }
  }

  async createChart(tenantId: string, userId: string, documentId: string, chartData: any) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const content = document.content as any;
      if (!content.charts) {
        content.charts = [];
      }

      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chart = {
        id: chartId,
        type: chartData.type,
        title: chartData.title,
        dataRange: chartData.dataRange,
        options: chartData.options || {},
        position: chartData.position || { x: 0, y: 0 },
        size: chartData.size || { width: 400, height: 300 },
        createdAt: new Date(),
        createdBy: userId,
      };

      content.charts.push(chart);

      // Update document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { content }
      });

      // Log audit event (commented out - method doesn't exist)
      // await this.auditService.log({
      //   tenantId,
      //   userId,
      //   action: 'CREATE_CHART',
      //   resource: `office:spreadsheet:${documentId}`,
      //   details: { chartId, chartType: chart.type },
      // });

      return chart;
    } catch (error) {
      this.logger.error('Error creating chart:', error);
      throw error;
    }
  }

  async updateChart(tenantId: string, userId: string, documentId: string, chartId: string, chartData: any) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const content = document.content as any;
      const chartIndex = content.charts?.findIndex((chart: any) => chart.id === chartId);

      if (chartIndex === -1) {
        throw new NotFoundException('Chart not found');
      }

      // Update chart
      content.charts[chartIndex] = {
        ...content.charts[chartIndex],
        ...chartData,
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Update document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { content }
      });

      // Log audit event (commented out - method doesn't exist)
      // await this.auditService.log({
      //   tenantId,
      //   userId,
      //   action: 'UPDATE_CHART',
      //   resource: `office:spreadsheet:${documentId}`,
      //   details: { chartId },
      // });

      return content.charts[chartIndex];
    } catch (error) {
      this.logger.error('Error updating chart:', error);
      throw error;
    }
  }

  async deleteChart(tenantId: string, userId: string, documentId: string, chartId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const content = document.content as any;
      const chartIndex = content.charts?.findIndex((chart: any) => chart.id === chartId);

      if (chartIndex === -1) {
        throw new NotFoundException('Chart not found');
      }

      // Remove chart
      content.charts.splice(chartIndex, 1);

      // Update document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { content }
      });

      // Log audit event (commented out - method doesn't exist)
      // await this.auditService.log({
      //   tenantId,
      //   userId,
      //   action: 'DELETE_CHART',
      //   resource: `office:spreadsheet:${documentId}`,
      //   details: { chartId },
      // });

      return { message: 'Chart deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting chart:', error);
      throw error;
    }
  }

  async insertFunction(tenantId: string, userId: string, documentId: string, functionData: any) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const content = document.content as any;
      const { cellAddress, functionName, parameters } = functionData;

      // Parse cell address (e.g., "A1")
      const { row: _row, col: _col } = this.parseCellAddress(cellAddress);

      // Ensure worksheet exists
      if (!content.worksheets) {
        content.worksheets = [{ name: 'Sheet1', cells: {} }];
      }

      const worksheet = content.worksheets[0];
      if (!worksheet.cells) {
        worksheet.cells = {};
      }

      // Create function formula
      const formula = `=${functionName}(${parameters.join(',')})`;
      
      // Set cell with function
      worksheet.cells[cellAddress] = {
        formula,
        value: null, // Will be calculated
        type: 'formula',
        updatedAt: new Date(),
        updatedBy: userId,
      };

      // Update document
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: { content }
      });

      // Recalculate spreadsheet
      await this.calculate(tenantId, userId, documentId);

      return { message: 'Function inserted successfully' };
    } catch (error) {
      this.logger.error('Error inserting function:', error);
      throw error;
    }
  }

  async getFormulas(tenantId: string, userId: string, documentId: string) {
    try {
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
          type: 'SPREADSHEET',
          OR: [
            { createdBy: userId },
            { shares: { some: { sharedWith: userId } } }
          ]
        }
      });

      if (!document) {
        throw new NotFoundException('Spreadsheet not found');
      }

      const content = document.content as any;
      const formulas: any[] = [];

      // Extract formulas from all worksheets
      content.worksheets?.forEach((worksheet: any) => {
        Object.entries(worksheet.cells || {}).forEach(([cellAddress, cellData]: [string, any]) => {
          if (cellData.type === 'formula' && cellData.formula) {
            formulas.push({
              cellAddress,
              formula: cellData.formula,
              value: cellData.value,
              updatedAt: cellData.updatedAt,
              updatedBy: cellData.updatedBy,
            });
          }
        });
      });

      return formulas;
    } catch (error) {
      this.logger.error('Error getting formulas:', error);
      throw error;
    }
  }

  private async getUserPermission(document: any, userId: string): Promise<string> {
    if (document.createdBy === userId) {
      return 'ADMIN';
    }

    // Check shares
    const share = document.shares?.find((s: any) => s.sharedWith === userId);
    if (share) {
      return share.permission;
    }

    return 'NONE';
  }

  private parseCellAddress(address: string): { row: number; col: number } {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      throw new Error('Invalid cell address');
    }

    const colStr = match[1];
    const rowStr = match[2];

    // Convert column letters to number (A=1, B=2, etc.)
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }

    const row = parseInt(rowStr);

    return { row, col };
  }

  private async calculateFormulas(content: any): Promise<any> {
    // Simple formula calculation - in a real implementation, 
    // this would use a proper formula engine
    const calculatedContent = JSON.parse(JSON.stringify(content));

    calculatedContent.worksheets?.forEach((worksheet: any) => {
      Object.entries(worksheet.cells || {}).forEach(([_cellAddress, cellData]: [string, any]) => {
        if (cellData.type === 'formula' && cellData.formula) {
          try {
            // Simple SUM function implementation
            if (cellData.formula.startsWith('=SUM(')) {
              const range = cellData.formula.match(/SUM\(([^)]+)\)/)?.[1];
              if (range) {
                cellData.value = this.calculateSum(worksheet.cells, range);
              }
            }
            // Add more function implementations as needed
          } catch (error) {
            cellData.value = '#ERROR';
          }
        }
      });
    });

    return calculatedContent;
  }

  private calculateSum(cells: any, range: string): number {
    // Simple range calculation (e.g., "A1:A10")
    const [start, end] = range.split(':');
    if (!start || !end) return 0;

    const startPos = this.parseCellAddress(start);
    const endPos = this.parseCellAddress(end);

    let sum = 0;
    for (let row = startPos.row; row <= endPos.row; row++) {
      for (let col = startPos.col; col <= endPos.col; col++) {
        const cellAddress = this.getCellAddress(row, col);
        const cellValue = cells[cellAddress]?.value;
        if (typeof cellValue === 'number') {
          sum += cellValue;
        }
      }
    }

    return sum;
  }

  private getCellAddress(row: number, col: number): string {
    let colStr = '';
    while (col > 0) {
      col--;
      colStr = String.fromCharCode(65 + (col % 26)) + colStr;
      col = Math.floor(col / 26);
    }
    return colStr + row;
  }
}
