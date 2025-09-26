import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, Param, Sse, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { map } from 'rxjs/operators';
import { Fortune500AuditConfig } from '../types/fortune500-types';
import {
  AuditAttestationListQuery,
  AuditAttestationRequest,
  AuditAttestationVerificationRequest,
  AuditEventDto,
  AuditEventQuery,
  AuditExportFormat,
  AuditExportQuery,
  AuditIntegrityQuery,
} from './dto/audit.dto';

@Controller('v1/audit')
export class AuditController {
  constructor(
    private readonly svc: AuditService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  @Get('health')
  health(): Fortune500AuditConfig {
    return this.svc.health();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async ingest(@Body() body: AuditEventDto | AuditEventDto[]) {
    // Accept single event or array of events
    const events: AuditEventDto[] = Array.isArray(body) ? body : [body];
    await this.svc.ingest(events);
    return { success: true, ingested: events.length };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('events')
  async list(@Query() query: AuditEventQuery) {
    return this.svc.find(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('events/export')
  @Header('Content-Type','text/plain; charset=utf-8')
  async export(@Query() query: AuditExportQuery) {
    const requestedFormat = typeof query.format === 'string' ? query.format.toLowerCase() : 'csv';
    const allowedFormats: AuditExportFormat[] = ['csv', 'json', 'pdf'];
    const format = allowedFormats.includes(requestedFormat as AuditExportFormat)
      ? (requestedFormat as AuditExportFormat)
      : 'csv';
    const data = await this.svc.export(query, format);
    return data;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('integrity')
  async integrity(@Query() query: AuditIntegrityQuery) {
    return this.svc.verifyIntegrity(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('attest')
  async attest(@Query() query: AuditIntegrityQuery) {
    return this.svc.generateAttestation(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('attest/export')
  @Header('Content-Type','text/plain; charset=utf-8')
  async attestExport(@Query() query: AuditIntegrityQuery) {
    const att = await this.svc.generateAttestation(query);
    const lines = [
      `CUBE-CORE AUDIT ATTESTATION v${att.version}`,
      `tenant: ${att.tenantId}`,
      `start: ${att.start || ''}`,
      `end: ${att.end || ''}`,
      `anchorPrevHash: ${att.anchorPrevHash || ''}`,
      `lastHash: ${att.lastHash || ''}`,
      `ok: ${att.ok ? '1' : '0'}`,
      `count: ${att.count}`,
      `generatedAt: ${att.generatedAt}`,
      `algorithm: ${att.algorithm}`,
      `signature: ${att.signature || ''}`,
    ];
    return lines.join('\n');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Post('attest/verify')
  async attestVerify(@Body() body: AuditAttestationVerificationRequest) {
    return this.svc.verifyAttestation(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('attestations')
  async listAttestations(@Query() query: AuditAttestationListQuery) {
    return this.svc.listAttestations(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Get('attestations/:id')
  async getAttestation(@Param('id') id: string) {
    return this.svc.getAttestation(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SYSTEM_ADMIN','COMPLIANCE')
  @Post('attestations/generate')
  @HttpCode(HttpStatus.CREATED)
  async generateManual(@Body() body: AuditAttestationRequest) {
    return this.svc.createManualAttestation(body);
  }

  // Public read-only endpoints (token-based)
  @Get('public/attestations')
  async publicList(@Query() query: AuditAttestationListQuery & { token?: string }) {
    const token = query?.token;
    const expected = this.config.get<string>('AUDIT_PUBLIC_READ_TOKEN');
    if (!expected || token !== expected) {
      return { error: 'Unauthorized' };
    }
    return this.svc.listAttestations(query);
  }

  @Get('public/attestations/:id')
  async publicGet(@Param('id') id: string, @Query('token') token?: string) {
    const expected = this.config.get<string>('AUDIT_PUBLIC_READ_TOKEN');
    if (!expected || token !== expected) {
      return { error: 'Unauthorized' };
    }
    return this.svc.getAttestation(id);
  }

  // SSE streams with JWT via query param (?auth=<token>)
  @Sse('events/stream')
  eventsStream(@Query('auth') auth?: string) {
    if (!auth) throw new UnauthorizedException('Missing auth');
    try { this.jwt.verify(auth); } catch { throw new UnauthorizedException('Invalid token'); }
    return this.svc.getEventStream().pipe(map((data) => ({ data })));
  }

  @Sse('attestations/stream')
  attestationsStream(@Query('auth') auth?: string) {
    if (!auth) throw new UnauthorizedException('Missing auth');
    try { this.jwt.verify(auth); } catch { throw new UnauthorizedException('Invalid token'); }
    return this.svc.getAttestationStream().pipe(map((data) => ({ data })));
  }
}
