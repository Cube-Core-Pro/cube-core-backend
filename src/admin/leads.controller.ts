import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user.types';
import { AdminJwtOrOpenGuard, AdminRolesOrOpenGuard } from './guards/admin-auth.guard';
import { OpportunitiesService } from '../crm/services/opportunities.service';
import { Prisma } from '@prisma/client';

@ApiTags('admin')
@Controller('admin/leads')
@ApiBearerAuth()
@UseGuards(AdminJwtOrOpenGuard, AdminRolesOrOpenGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class AdminLeadsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
    private readonly opps: OpportunitiesService,
  ) {}

  private toCustomFields(value: Prisma.JsonValue | null): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  @Get('recent')
  @ApiOperation({ summary: 'List recent public leads (last N contacts) with filters' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max items (default 50)' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by name/email/company' })
  @ApiQuery({ name: 'source', required: false, description: 'Source equals (e.g., website-pricing)' })
  @ApiQuery({ name: 'interest', required: false, description: 'Interest (from customFields.interest) contains' })
  @ApiQuery({ name: 'minBudget', required: false, description: 'Min budget (from customFields.budget)' })
  @ApiQuery({ name: 'maxBudget', required: false, description: 'Max budget (from customFields.budget)' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date from' })
  @ApiQuery({ name: 'until', required: false, description: 'ISO date until' })
  @ApiResponse({ status: 200 })
  async recent(
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('interest') interest?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const max = Math.min(parseInt(limit || '50', 10) || 50, 500);
    const publicTenantId = this.cfg.get<string>('PUBLIC_TENANT_ID') || this.cfg.get<string>('DEFAULT_TENANT_ID') || 'public-tenant';

    const where: Prisma.crm_contactsWhereInput = { tenantId: publicTenantId };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (since || until) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (since) createdAt.gte = new Date(since);
      if (until) createdAt.lte = new Date(until);
      where.createdAt = createdAt;
    }

    let contacts = await this.prisma.crm_contacts.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, source: true, createdAt: true, customFields: true },
      orderBy: { createdAt: 'desc' },
      take: max,
    });
    // In-memory filters for source/interest/budget (customFields)
    if (source) {
      const s = source.toLowerCase();
      contacts = contacts.filter(c => (c.source || '').toLowerCase() === s);
    }
    if (interest) {
      const s = interest.toLowerCase();
      contacts = contacts.filter(c => {
        const fields = this.toCustomFields(c.customFields);
        const val = fields.interest;
        return typeof val === 'string' ? val.toLowerCase().includes(s) : false;
      });
    }
    const minB = minBudget ? Number(minBudget) : undefined;
    const maxB = maxBudget ? Number(maxBudget) : undefined;
    if (minB !== undefined || maxB !== undefined) {
      contacts = contacts.filter(c => {
        const fields = this.toCustomFields(c.customFields);
        const b = Number(fields.budget);
        if (Number.isNaN(b)) return false;
        if (minB !== undefined && b < minB) return false;
        if (maxB !== undefined && b > maxB) return false;
        return true;
      });
    }
    return { data: contacts };
  }

  @Get(':id/opportunity')
  @ApiOperation({ summary: 'Create opportunity from lead (contact id)' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'value', required: false })
  @ApiQuery({ name: 'currency', required: false })
  @ApiResponse({ status: 200 })
  async createOppFromLead(
    @Res() res: Response,
    @Param('id') _id: string,
    @Query('name') _name?: string,
    @Query('value') _value?: string,
    @Query('currency') _currency?: string,
  ) {
    res.status(405).send('Use POST /api/admin/leads/{id}/opportunity');
  }

  @Get(':id/opportunity')
  @ApiOperation({ summary: 'Deprecated GET variant' })
  async deprecatedGet() { return { error: 'Use POST' }; }

  @ApiOperation({ summary: 'Create opportunity from lead (contact id)' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'value', required: false })
  @ApiQuery({ name: 'currency', required: false })
  @ApiResponse({ status: 201 })
  @Post(':id/opportunity')
  async postOppFromLead(
    @Res() res: Response,
    @Param('id') id: string,
    @Query('name') name?: string,
    @Query('value') value?: string,
    @Query('currency') currency?: string,
  ) {
    try {
      const contact = await this.prisma.crm_contacts.findFirst({ where: { id } });
      if (!contact) return res.status(404).send({ error: 'Contact not found' });
      const opp = await this.opps.create({
        contactId: contact.id,
        name: name || `Lead ${contact.email}`,
        value: value ? Number(value) : 0,
        currency: currency || 'USD',
        stage: 'PROSPECTING',
        probability: 10,
        source: contact.source || 'website',
        description: this.toCustomFields(contact.customFields).message as string | undefined,
      }, contact.tenantId);
      return res.status(201).send({ opportunity: opp });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed';
      return res.status(500).send({ error: message });
    }
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export leads as CSV (server-side) with filters' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'interest', required: false })
  @ApiQuery({ name: 'minBudget', required: false })
  @ApiQuery({ name: 'maxBudget', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'until', required: false })
  async exportCsv(
    @Res() res: Response,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('interest') interest?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const max = Math.min(parseInt(limit || '500', 10) || 500, 2000);
    const publicTenantId = this.cfg.get<string>('PUBLIC_TENANT_ID') || this.cfg.get<string>('DEFAULT_TENANT_ID') || 'public-tenant';

    const where: Prisma.crm_contactsWhereInput = { tenantId: publicTenantId };
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (since || until) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (since) createdAt.gte = new Date(since);
      if (until) createdAt.lte = new Date(until);
      where.createdAt = createdAt;
    }

    let contacts = await this.prisma.crm_contacts.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, source: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: max,
    });
    // Additional filters in-memory
    if (source) {
      const s = source.toLowerCase();
      contacts = contacts.filter(c => (c.source || '').toLowerCase() === s);
    }
    if (interest || minBudget || maxBudget) {
      // need customFields; refetch including customFields if necessary
      const ids = contacts.map(c => c.id);
      const withCustom = await this.prisma.crm_contacts.findMany({
        where: { id: { in: ids } },
        select: { id: true, customFields: true }
      });
      const map = new Map(withCustom.map(c => [c.id, c.customFields]));
      const s = interest?.toLowerCase();
      const minB = minBudget ? Number(minBudget) : undefined;
      const maxB = maxBudget ? Number(maxBudget) : undefined;
      contacts = contacts.filter(c => {
        const cf = this.toCustomFields(map.get(c.id) ?? null);
        if (s) {
          const val = cf.interest;
          if (!(typeof val === 'string' && val.toLowerCase().includes(s))) return false;
        }
        if (minB !== undefined || maxB !== undefined) {
          const b = Number(cf.budget);
          if (Number.isNaN(b)) return false;
          if (minB !== undefined && b < minB) return false;
          if (maxB !== undefined && b > maxB) return false;
        }
        return true;
      });
    }

    const rows = [
      ['When','First Name','Last Name','Email','Phone','Company','Source']
    ];
    for (const c of contacts) {
      rows.push([
        c.createdAt?.toISOString() || '',
        c.firstName || '',
        c.lastName || '',
        c.email || '',
        c.phone || '',
        c.company || '',
        c.source || ''
      ]);
    }
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
    const body = '\uFEFF' + csv; // BOM for Excel compatibility

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.csv"`);
    res.status(200).send(body);
  }

  @Get('export.json')
  @ApiOperation({ summary: 'Export leads as JSON (server-side) with filters' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'interest', required: false })
  @ApiQuery({ name: 'minBudget', required: false })
  @ApiQuery({ name: 'maxBudget', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'until', required: false })
  async exportJson(
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('interest') interest?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const data = (await this.recent(limit, q, source, interest, minBudget, maxBudget, since, until)) as any;
    return data;
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export leads as Excel (server-side) with filters' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'interest', required: false })
  @ApiQuery({ name: 'minBudget', required: false })
  @ApiQuery({ name: 'maxBudget', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'until', required: false })
  async exportXlsx(
    @Res() res: Response,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('source') source?: string,
    @Query('interest') interest?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const data = (await this.recent(limit, q, source, interest, minBudget, maxBudget, since, until)) as any;
    const rows = data.data as any[];
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leads');
    ws.addRow(['When','First Name','Last Name','Email','Phone','Company','Source']);
    for (const r of rows) {
      ws.addRow([
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.firstName||'', r.lastName||'', r.email||'', r.phone||'', r.company||'', r.source||''
      ]);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }
}
