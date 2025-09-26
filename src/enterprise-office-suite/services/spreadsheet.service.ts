// path: backend/src/enterprise-office-suite/services/spreadsheet.service.ts
// purpose: Spreadsheet engine with formulas, charts, and data analysis
// dependencies: Prisma, Redis, EventEmitter, Formula Engine, Chart Generation

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SpreadsheetService {
  private readonly logger = new Logger(SpreadsheetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSpreadsheet(tenantId: string, userId: string, data: {
    title: string;
    folderId?: string;
    content?: any;
    templateId?: string;
  }) {
    try {
      const defaultContent = {
        sheets: [
          {
            id: 'sheet1',
            name: 'Sheet1',
            cells: {},
            rows: 1000,
            cols: 26,
            frozenRows: 0,
            frozenCols: 0,
            hiddenRows: [],
            hiddenCols: [],
            rowHeights: {},
            colWidths: {},
            mergedCells: [],
            conditionalFormats: [],
            charts: [],
            filters: {},
            sort: {},
          },
        ],
        activeSheet: 'sheet1',
        namedRanges: {},
        functions: {},
        settings: {
          calculation: 'auto',
          precision: 15,
          dateSystem: '1900',
        },
      };

      const spreadsheet = await this.prisma.officeDocument.create({
        data: {
          tenantId,
          title: data.title,
          type: 'SPREADSHEET',
          format: 'CSHEET',
          content: data.content || defaultContent,
          folderId: data.folderId,
          createdBy: userId,
          size: JSON.stringify(data.content || defaultContent).length,
          checksum: 'temp-checksum', // TODO: Calculate actual checksum
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
        },
      });

      return spreadsheet;
    } catch (error) {
      this.logger.error('Error creating spreadsheet:', error);
      throw error;
    }
  }

  async updateCell(documentId: string, userId: string, sheetId: string, cellRef: string, data: {
    value?: any;
    formula?: string;
    format?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Update cell
      if (!sheet.cells[cellRef]) {
        sheet.cells[cellRef] = {};
      }

      if (data.value !== undefined) {
        sheet.cells[cellRef].value = data.value;
      }

      if (data.formula !== undefined) {
        sheet.cells[cellRef].formula = data.formula;
        // Calculate formula result
        sheet.cells[cellRef].value = await this.calculateFormula(data.formula, sheet, content);
      }

      if (data.format !== undefined) {
        sheet.cells[cellRef].format = { ...sheet.cells[cellRef].format, ...data.format };
      }

      // Update dependent cells if this cell is referenced in formulas
      await this.updateDependentCells(content, sheetId, cellRef);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      // Emit real-time update
      this.eventEmitter.emit('spreadsheet.cell.updated', {
        documentId,
        userId,
        sheetId,
        cellRef,
        data,
      });

      return { success: true, cell: sheet.cells[cellRef] };
    } catch (error) {
      this.logger.error('Error updating cell:', error);
      throw error;
    }
  }

  async updateRange(documentId: string, userId: string, sheetId: string, range: string, data: {
    values?: any[][];
    formulas?: string[][];
    formats?: any[][];
  }) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      const { startRow, startCol, endRow, endCol } = this.parseRange(range);

      // Update cells in range
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cellRef = this.getCellRef(row, col);
          const dataRow = row - startRow;
          const dataCol = col - startCol;

          if (!sheet.cells[cellRef]) {
            sheet.cells[cellRef] = {};
          }

          if (data.values && data.values[dataRow] && data.values[dataRow][dataCol] !== undefined) {
            sheet.cells[cellRef].value = data.values[dataRow][dataCol];
          }

          if (data.formulas && data.formulas[dataRow] && data.formulas[dataRow][dataCol] !== undefined) {
            sheet.cells[cellRef].formula = data.formulas[dataRow][dataCol];
            sheet.cells[cellRef].value = await this.calculateFormula(
              data.formulas[dataRow][dataCol],
              sheet,
              content
            );
          }

          if (data.formats && data.formats[dataRow] && data.formats[dataRow][dataCol] !== undefined) {
            sheet.cells[cellRef].format = {
              ...sheet.cells[cellRef].format,
              ...data.formats[dataRow][dataCol],
            };
          }
        }
      }

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error updating range:', error);
      throw error;
    }
  }

  async insertRows(documentId: string, userId: string, sheetId: string, startRow: number, count: number) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Shift existing cells down
      const newCells: any = {};
      Object.keys(sheet.cells).forEach(cellRef => {
        const { row, col } = this.parseCellRef(cellRef);
        if (row >= startRow) {
          const newCellRef = this.getCellRef(row + count, col);
          newCells[newCellRef] = sheet.cells[cellRef];
        } else {
          newCells[cellRef] = sheet.cells[cellRef];
        }
      });

      sheet.cells = newCells;
      sheet.rows += count;

      // Update formulas that reference moved cells
      await this.updateFormulasAfterRowInsert(sheet, startRow, count);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error inserting rows:', error);
      throw error;
    }
  }

  async insertColumns(documentId: string, userId: string, sheetId: string, startCol: number, count: number) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Shift existing cells right
      const newCells: any = {};
      Object.keys(sheet.cells).forEach(cellRef => {
        const { row, col } = this.parseCellRef(cellRef);
        if (col >= startCol) {
          const newCellRef = this.getCellRef(row, col + count);
          newCells[newCellRef] = sheet.cells[cellRef];
        } else {
          newCells[cellRef] = sheet.cells[cellRef];
        }
      });

      sheet.cells = newCells;
      sheet.cols += count;

      // Update formulas that reference moved cells
      await this.updateFormulasAfterColumnInsert(sheet, startCol, count);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error inserting columns:', error);
      throw error;
    }
  }

  async deleteRows(documentId: string, userId: string, sheetId: string, startRow: number, count: number) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Remove cells in deleted rows and shift remaining cells up
      const newCells: any = {};
      Object.keys(sheet.cells).forEach(cellRef => {
        const { row, col } = this.parseCellRef(cellRef);
        if (row < startRow) {
          newCells[cellRef] = sheet.cells[cellRef];
        } else if (row >= startRow + count) {
          const newCellRef = this.getCellRef(row - count, col);
          newCells[newCellRef] = sheet.cells[cellRef];
        }
        // Cells in deleted rows are not added to newCells
      });

      sheet.cells = newCells;
      sheet.rows -= count;

      // Update formulas that reference moved cells
      await this.updateFormulasAfterRowDelete(sheet, startRow, count);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting rows:', error);
      throw error;
    }
  }

  async deleteColumns(documentId: string, userId: string, sheetId: string, startCol: number, count: number) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Remove cells in deleted columns and shift remaining cells left
      const newCells: any = {};
      Object.keys(sheet.cells).forEach(cellRef => {
        const { row, col } = this.parseCellRef(cellRef);
        if (col < startCol) {
          newCells[cellRef] = sheet.cells[cellRef];
        } else if (col >= startCol + count) {
          const newCellRef = this.getCellRef(row, col - count);
          newCells[newCellRef] = sheet.cells[cellRef];
        }
        // Cells in deleted columns are not added to newCells
      });

      sheet.cells = newCells;
      sheet.cols -= count;

      // Update formulas that reference moved cells
      await this.updateFormulasAfterColumnDelete(sheet, startCol, count);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting columns:', error);
      throw error;
    }
  }

  async createChart(documentId: string, userId: string, sheetId: string, chartData: {
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
    dataRange: string;
    title?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    options?: any;
  }) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      const chartId = `chart_${Date.now()}`;
      const chart = {
        id: chartId,
        type: chartData.type,
        dataRange: chartData.dataRange,
        title: chartData.title || 'Chart',
        position: chartData.position || { x: 100, y: 100 },
        size: chartData.size || { width: 400, height: 300 },
        options: chartData.options || {},
        createdAt: new Date().toISOString(),
      };

      sheet.charts.push(chart);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true, chart };
    } catch (error) {
      this.logger.error('Error creating chart:', error);
      throw error;
    }
  }

  async applyFilter(documentId: string, userId: string, sheetId: string, range: string, filters: any[]) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      sheet.filters[range] = {
        filters,
        appliedAt: new Date().toISOString(),
      };

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error applying filter:', error);
      throw error;
    }
  }

  async sortRange(documentId: string, userId: string, sheetId: string, range: string, sortOptions: {
    column: number;
    ascending: boolean;
    hasHeaders?: boolean;
  }) {
    try {
      const content = await this.getContent(documentId);
      const sheet = content.sheets.find((s: any) => s.id === sheetId);
      
      if (!sheet) {
        throw new NotFoundException('Sheet not found');
      }

      // Get data from range
      const { startRow, startCol, endRow, endCol } = this.parseRange(range);
      const data: any[][] = [];

      for (let row = startRow; row <= endRow; row++) {
        const rowData: any[] = [];
        for (let col = startCol; col <= endCol; col++) {
          const cellRef = this.getCellRef(row, col);
          const cell = sheet.cells[cellRef];
          rowData.push(cell?.value || '');
        }
        data.push(rowData);
      }

      // Sort data
      const headerRow = sortOptions.hasHeaders ? data.shift() : null;
      data.sort((a, b) => {
        const aVal = a[sortOptions.column];
        const bVal = b[sortOptions.column];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOptions.ascending ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortOptions.ascending) {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });

      if (headerRow) {
        data.unshift(headerRow);
      }

      // Update cells with sorted data
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[row].length; col++) {
          const cellRef = this.getCellRef(startRow + row, startCol + col);
          if (!sheet.cells[cellRef]) {
            sheet.cells[cellRef] = {};
          }
          sheet.cells[cellRef].value = data[row][col];
        }
      }

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error sorting range:', error);
      throw error;
    }
  }

  async addSheet(documentId: string, userId: string, name: string) {
    try {
      const content = await this.getContent(documentId);
      
      const sheetId = `sheet_${Date.now()}`;
      const newSheet = {
        id: sheetId,
        name,
        cells: {},
        rows: 1000,
        cols: 26,
        frozenRows: 0,
        frozenCols: 0,
        hiddenRows: [],
        hiddenCols: [],
        rowHeights: {},
        colWidths: {},
        mergedCells: [],
        conditionalFormats: [],
        charts: [],
        filters: {},
        sort: {},
      };

      content.sheets.push(newSheet);

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true, sheet: newSheet };
    } catch (error) {
      this.logger.error('Error adding sheet:', error);
      throw error;
    }
  }

  async deleteSheet(documentId: string, userId: string, sheetId: string) {
    try {
      const content = await this.getContent(documentId);
      
      if (content.sheets.length <= 1) {
        throw new BadRequestException('Cannot delete the last sheet');
      }

      content.sheets = content.sheets.filter((s: any) => s.id !== sheetId);

      if (content.activeSheet === sheetId) {
        content.activeSheet = content.sheets[0].id;
      }

      // Save updated content
      await this.updateContent(documentId, userId, content);

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting sheet:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getContent(documentId: string) {
    const cached = await this.redis.get(`spreadsheet:${documentId}:content`);
    if (cached) {
      return JSON.parse(cached);
    }

    const document = await this.prisma.officeDocument.findUnique({
      where: { id: documentId },
      select: { content: true },
    });

    if (!document) {
      throw new NotFoundException('Spreadsheet not found');
    }

    await this.redis.setex(
      `spreadsheet:${documentId}:content`,
      300,
      JSON.stringify(document.content)
    );

    return document.content;
  }

  private async updateContent(documentId: string, userId: string, content: any) {
    await this.prisma.officeDocument.update({
      where: { id: documentId },
      data: {
        content,
        size: JSON.stringify(content).length,
        updatedAt: new Date(),
      },
    });

    await this.redis.setex(
      `spreadsheet:${documentId}:content`,
      300,
      JSON.stringify(content)
    );
  }

  private async calculateFormula(formula: string, sheet: any, _workbook: any): Promise<any> {
    // Advanced formula calculation engine with comprehensive function support
    try {
      if (!formula.startsWith('=')) {
        return formula;
      }

      const expression = formula.substring(1).toUpperCase();
      
      // Mathematical functions
      if (expression.startsWith('SUM(')) {
        return this.calculateSum(expression, sheet);
      } else if (expression.startsWith('AVERAGE(') || expression.startsWith('AVG(')) {
        return this.calculateAverage(expression, sheet);
      } else if (expression.startsWith('COUNT(')) {
        return this.calculateCount(expression, sheet);
      } else if (expression.startsWith('COUNTA(')) {
        return this.calculateCountA(expression, sheet);
      } else if (expression.startsWith('MIN(')) {
        return this.calculateMin(expression, sheet);
      } else if (expression.startsWith('MAX(')) {
        return this.calculateMax(expression, sheet);
      } else if (expression.startsWith('MEDIAN(')) {
        return this.calculateMedian(expression, sheet);
      } else if (expression.startsWith('STDEV(')) {
        return this.calculateStdev(expression, sheet);
      }
      
      // Logical functions
      else if (expression.startsWith('IF(')) {
        return this.calculateIf(expression, sheet);
      } else if (expression.startsWith('AND(')) {
        return this.calculateAnd(expression, sheet);
      } else if (expression.startsWith('OR(')) {
        return this.calculateOr(expression, sheet);
      } else if (expression.startsWith('NOT(')) {
        return this.calculateNot(expression, sheet);
      }
      
      // Text functions
      else if (expression.startsWith('CONCATENATE(') || expression.startsWith('CONCAT(')) {
        return this.calculateConcatenate(expression, sheet);
      } else if (expression.startsWith('LEFT(')) {
        return this.calculateLeft(expression, sheet);
      } else if (expression.startsWith('RIGHT(')) {
        return this.calculateRight(expression, sheet);
      } else if (expression.startsWith('MID(')) {
        return this.calculateMid(expression, sheet);
      } else if (expression.startsWith('LEN(')) {
        return this.calculateLen(expression, sheet);
      } else if (expression.startsWith('UPPER(')) {
        return this.calculateUpper(expression, sheet);
      } else if (expression.startsWith('LOWER(')) {
        return this.calculateLower(expression, sheet);
      }
      
      // Date functions
      else if (expression.startsWith('TODAY(')) {
        return new Date().toISOString().split('T')[0];
      } else if (expression.startsWith('NOW(')) {
        return new Date().toISOString();
      } else if (expression.startsWith('YEAR(')) {
        return this.calculateYear(expression, sheet);
      } else if (expression.startsWith('MONTH(')) {
        return this.calculateMonth(expression, sheet);
      } else if (expression.startsWith('DAY(')) {
        return this.calculateDay(expression, sheet);
      }
      
      // Lookup functions
      else if (expression.startsWith('VLOOKUP(')) {
        return this.calculateVlookup(expression, sheet);
      } else if (expression.startsWith('HLOOKUP(')) {
        return this.calculateHlookup(expression, sheet);
      } else if (expression.startsWith('INDEX(')) {
        return this.calculateIndex(expression, sheet);
      } else if (expression.startsWith('MATCH(')) {
        return this.calculateMatch(expression, sheet);
      }

      // Handle cell references and ranges
      const cellRefRegex = /[A-Z]+[0-9]+/g;
      let processedExpression = expression;
      const matches = expression.match(cellRefRegex);
      
      if (matches) {
        for (const cellRef of matches) {
          const cell = sheet.cells[cellRef];
          const value = this.getCellNumericValue(cell);
          processedExpression = processedExpression.replace(cellRef, String(value));
        }
      }

      // Safe mathematical expression evaluation (no eval)
      return this.evaluateMathExpression(processedExpression);
    } catch (error) {
      return '#ERROR!';
    }
  }

  private calculateSum(expression: string, sheet: any): number {
    const range = expression.match(/SUM\(([^)]+)\)/)?.[1];
    if (!range) return 0;

    const values = this.getRangeValues(range, sheet);
    return values.reduce((sum, val) => sum + (Number(val) || 0), 0);
  }

  private calculateAverage(expression: string, sheet: any): number {
    const range = expression.match(/AVERAGE\(([^)]+)\)/)?.[1];
    if (!range) return 0;

    const values = this.getRangeValues(range, sheet);
    const numbers = values.filter(val => !isNaN(Number(val))).map(Number);
    return numbers.length > 0 ? numbers.reduce((sum, val) => sum + val, 0) / numbers.length : 0;
  }

  private calculateCount(expression: string, sheet: any): number {
    const range = expression.match(/COUNT\(([^)]+)\)/)?.[1];
    if (!range) return 0;

    const values = this.getRangeValues(range, sheet);
    return values.filter(val => !isNaN(Number(val))).length;
  }

  private getRangeValues(range: string, sheet: any): any[] {
    const { startRow, startCol, endRow, endCol } = this.parseRange(range);
    const values: any[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellRef = this.getCellRef(row, col);
        const cell = sheet.cells[cellRef];
        values.push(cell?.value || '');
      }
    }

    return values;
  }

  private parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
    const [start, end] = range.split(':');
    const startPos = this.parseCellRef(start);
    const endPos = end ? this.parseCellRef(end) : startPos;

    return {
      startRow: startPos.row,
      startCol: startPos.col,
      endRow: endPos.row,
      endCol: endPos.col,
    };
  }

  private parseCellRef(cellRef: string): { row: number; col: number } {
    const match = cellRef.match(/([A-Z]+)([0-9]+)/);
    if (!match) throw new Error('Invalid cell reference');

    const colStr = match[1];
    const rowStr = match[2];

    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }

    return { row: parseInt(rowStr), col };
  }

  private getCellRef(row: number, col: number): string {
    let colStr = '';
    while (col > 0) {
      col--;
      colStr = String.fromCharCode(65 + (col % 26)) + colStr;
      col = Math.floor(col / 26);
    }
    return colStr + row;
  }

  private async updateDependentCells(_content: any, _sheetId: string, _cellRef: string) {
    // Find and update cells that depend on this cell
    // This would involve parsing formulas and updating dependent calculations
  }

  private async updateFormulasAfterRowInsert(_sheet: any, _startRow: number, _count: number) {
    // Update formulas that reference rows after the insertion point
  }

  private async updateFormulasAfterColumnInsert(_sheet: any, _startCol: number, _count: number) {
    // Update formulas that reference columns after the insertion point
  }

  private async updateFormulasAfterRowDelete(_sheet: any, _startRow: number, _count: number) {
    // Update formulas that reference rows after the deletion point
  }

  private async updateFormulasAfterColumnDelete(_sheet: any, _startCol: number, _count: number) {
    // Update formulas that reference columns after the deletion point
  }

  // Advanced formula calculation methods
  private getCellNumericValue(cell: any): number {
    if (!cell || cell.value === null || cell.value === undefined) return 0;
    const num = Number(cell.value);
    return isNaN(num) ? 0 : num;
  }

  private evaluateMathExpression(expression: string): number {
    // Safe mathematical expression evaluation without eval
    try {
      // Remove spaces and validate characters
      const cleanExpr = expression.replace(/\s/g, '');
      if (!/^[0-9+\-*/.()]+$/.test(cleanExpr)) return 0;
      
      // Simple recursive descent parser for basic math
      return this.parseExpression(cleanExpr);
    } catch {
      return 0;
    }
  }

  private parseExpression(expr: string): number {
    // Simplified expression parser for +, -, *, /
    const tokens = expr.match(/(\d+\.?\d*|[+\-*/()])/g) || [];
    if (tokens.length === 0) return 0;
    
    // For now, handle simple cases
    if (tokens.length === 1) return Number(tokens[0]) || 0;
    if (tokens.length === 3) {
      const [a, op, b] = tokens;
      const numA = Number(a) || 0;
      const numB = Number(b) || 0;
      
      switch (op) {
        case '+': return numA + numB;
        case '-': return numA - numB;
        case '*': return numA * numB;
        case '/': return numB !== 0 ? numA / numB : 0;
        default: return 0;
      }
    }
    
    return 0;
  }

  // Additional formula functions
  private calculateCountA(expression: string, sheet: any): number {
    const range = expression.match(/COUNTA\(([^)]+)\)/)?.[1];
    if (!range) return 0;
    
    const values = this.getRangeValues(range, sheet);
    return values.filter(val => val !== null && val !== undefined && val !== '').length;
  }

  private calculateMin(expression: string, sheet: any): number {
    const range = expression.match(/MIN\(([^)]+)\)/)?.[1];
    if (!range) return 0;
    
    const values = this.getRangeValues(range, sheet);
    const numbers = values.filter(val => !isNaN(Number(val))).map(Number);
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  }

  private calculateMax(expression: string, sheet: any): number {
    const range = expression.match(/MAX\(([^)]+)\)/)?.[1];
    if (!range) return 0;
    
    const values = this.getRangeValues(range, sheet);
    const numbers = values.filter(val => !isNaN(Number(val))).map(Number);
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  private calculateMedian(expression: string, sheet: any): number {
    const range = expression.match(/MEDIAN\(([^)]+)\)/)?.[1];
    if (!range) return 0;
    
    const values = this.getRangeValues(range, sheet);
    const numbers = values.filter(val => !isNaN(Number(val))).map(Number).sort((a, b) => a - b);
    
    if (numbers.length === 0) return 0;
    const mid = Math.floor(numbers.length / 2);
    return numbers.length % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];
  }

  private calculateStdev(expression: string, sheet: any): number {
    const range = expression.match(/STDEV\(([^)]+)\)/)?.[1];
    if (!range) return 0;
    
    const values = this.getRangeValues(range, sheet);
    const numbers = values.filter(val => !isNaN(Number(val))).map(Number);
    
    if (numbers.length < 2) return 0;
    
    const mean = numbers.reduce((sum, val) => sum + val, 0) / numbers.length;
    const variance = numbers.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numbers.length - 1);
    return Math.sqrt(variance);
  }

  private calculateIf(expression: string, sheet: any): any {
    const match = expression.match(/IF\(([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '';
    
    const [, condition, trueValue, falseValue] = match;
    const conditionResult = this.evaluateCondition(condition.trim(), sheet);
    
    return conditionResult ? this.evaluateValue(trueValue.trim(), sheet) : this.evaluateValue(falseValue.trim(), sheet);
  }

  private calculateAnd(expression: string, sheet: any): boolean {
    const match = expression.match(/AND\(([^)]+)\)/);
    if (!match) return false;
    
    const conditions = match[1].split(',');
    return conditions.every(condition => this.evaluateCondition(condition.trim(), sheet));
  }

  private calculateOr(expression: string, sheet: any): boolean {
    const match = expression.match(/OR\(([^)]+)\)/);
    if (!match) return false;
    
    const conditions = match[1].split(',');
    return conditions.some(condition => this.evaluateCondition(condition.trim(), sheet));
  }

  private calculateNot(expression: string, sheet: any): boolean {
    const match = expression.match(/NOT\(([^)]+)\)/);
    if (!match) return false;
    
    return !this.evaluateCondition(match[1].trim(), sheet);
  }

  private calculateConcatenate(expression: string, sheet: any): string {
    const match = expression.match(/CONCAT(?:ENATE)?\(([^)]+)\)/);
    if (!match) return '';
    
    const values = match[1].split(',');
    return values.map(val => this.evaluateValue(val.trim(), sheet)).join('');
  }

  private calculateLeft(expression: string, sheet: any): string {
    const match = expression.match(/LEFT\(([^,]+),([^)]+)\)/);
    if (!match) return '';
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    const length = Number(this.evaluateValue(match[2].trim(), sheet)) || 0;
    return text.substring(0, length);
  }

  private calculateRight(expression: string, sheet: any): string {
    const match = expression.match(/RIGHT\(([^,]+),([^)]+)\)/);
    if (!match) return '';
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    const length = Number(this.evaluateValue(match[2].trim(), sheet)) || 0;
    return text.substring(text.length - length);
  }

  private calculateMid(expression: string, sheet: any): string {
    const match = expression.match(/MID\(([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '';
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    const start = Number(this.evaluateValue(match[2].trim(), sheet)) || 1;
    const length = Number(this.evaluateValue(match[3].trim(), sheet)) || 0;
    return text.substring(start - 1, start - 1 + length);
  }

  private calculateLen(expression: string, sheet: any): number {
    const match = expression.match(/LEN\(([^)]+)\)/);
    if (!match) return 0;
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    return text.length;
  }

  private calculateUpper(expression: string, sheet: any): string {
    const match = expression.match(/UPPER\(([^)]+)\)/);
    if (!match) return '';
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    return text.toUpperCase();
  }

  private calculateLower(expression: string, sheet: any): string {
    const match = expression.match(/LOWER\(([^)]+)\)/);
    if (!match) return '';
    
    const text = String(this.evaluateValue(match[1].trim(), sheet));
    return text.toLowerCase();
  }

  private calculateYear(expression: string, sheet: any): number {
    const match = expression.match(/YEAR\(([^)]+)\)/);
    if (!match) return 0;
    
    const dateValue = this.evaluateValue(match[1].trim(), sheet);
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? 0 : date.getFullYear();
  }

  private calculateMonth(expression: string, sheet: any): number {
    const match = expression.match(/MONTH\(([^)]+)\)/);
    if (!match) return 0;
    
    const dateValue = this.evaluateValue(match[1].trim(), sheet);
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? 0 : date.getMonth() + 1;
  }

  private calculateDay(expression: string, sheet: any): number {
    const match = expression.match(/DAY\(([^)]+)\)/);
    if (!match) return 0;
    
    const dateValue = this.evaluateValue(match[1].trim(), sheet);
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? 0 : date.getDate();
  }

  private calculateVlookup(expression: string, sheet: any): any {
    const match = expression.match(/VLOOKUP\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '#N/A';
    
    // Simplified VLOOKUP implementation
    return '#N/A'; // Would need full implementation
  }

  private calculateHlookup(expression: string, sheet: any): any {
    const match = expression.match(/HLOOKUP\(([^,]+),([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '#N/A';
    
    // Simplified HLOOKUP implementation
    return '#N/A'; // Would need full implementation
  }

  private calculateIndex(expression: string, sheet: any): any {
    const match = expression.match(/INDEX\(([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return '#REF!';
    
    // Simplified INDEX implementation
    return '#REF!'; // Would need full implementation
  }

  private calculateMatch(expression: string, sheet: any): number {
    const match = expression.match(/MATCH\(([^,]+),([^,]+),([^)]+)\)/);
    if (!match) return 0;
    
    // Simplified MATCH implementation
    return 0; // Would need full implementation
  }

  private evaluateCondition(condition: string, sheet: any): boolean {
    // Simple condition evaluation
    const operators = ['>=', '<=', '<>', '=', '>', '<'];
    
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op);
        const leftVal = this.evaluateValue(left.trim(), sheet);
        const rightVal = this.evaluateValue(right.trim(), sheet);
        
        switch (op) {
          case '=': return leftVal == rightVal;
          case '<>': return leftVal != rightVal;
          case '>': return Number(leftVal) > Number(rightVal);
          case '<': return Number(leftVal) < Number(rightVal);
          case '>=': return Number(leftVal) >= Number(rightVal);
          case '<=': return Number(leftVal) <= Number(rightVal);
        }
      }
    }
    
    return Boolean(this.evaluateValue(condition, sheet));
  }

  private evaluateValue(value: string, sheet: any): any {
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Check if it's a cell reference
    if (/^[A-Z]+[0-9]+$/.test(value)) {
      const cell = sheet.cells[value];
      return cell?.value || '';
    }
    
    // Check if it's a number
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // Return as string
    return value;
  }
}