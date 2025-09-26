import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user.types';
import { AdminJwtOrOpenGuard, AdminRolesOrOpenGuard } from './guards/admin-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Fortune500AdminConfig } from '../types/fortune500-types';

@Controller('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtOrOpenGuard, AdminRolesOrOpenGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class AdminController {
  constructor(
    private readonly svc: AdminService,
    private readonly config: ConfigService,
  ) {}

  private resolveTenantId(explicitTenantId?: string): string {
    if (explicitTenantId && explicitTenantId.trim().length > 0) {
      return explicitTenantId.trim();
    }
    return (
      this.config.get<string>('ADMIN_TENANT_ID') ||
      this.config.get<string>('PUBLIC_TENANT_ID') ||
      this.config.get<string>('DEFAULT_TENANT_ID') ||
      'enterprise-root'
    );
  }

  @Get('health')
  health(): Fortune500AdminConfig {
    return this.svc.health();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Operational overview of admin capabilities with Fortune 500 metrics' })
  @ApiQuery({ name: 'tenantId', required: false })
  async overview(@Query('tenantId') tenantId?: string) {
    const resolvedTenant = this.resolveTenantId(tenantId);
    return this.svc.getAdminOperationalOverview(resolvedTenant);
  }

  @Get('insights/executive')
  @ApiOperation({ summary: 'Executive insights snapshot with caching controls' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'level', required: false, description: 'Executive level (CEO, CFO, COO, CTO, CAO, CISO)' })
  @ApiQuery({ name: 'period', required: false, description: 'Reporting period label (e.g., Q3-2025)' })
  @ApiQuery({ name: 'forceRefresh', required: false, description: 'Force bypass cache (true/false)' })
  @ApiQuery({ name: 'cacheTtlSeconds', required: false, description: 'Override cache TTL in seconds (0 to disable cache)' })
  async executiveInsights(
    @Query('tenantId') tenantId?: string,
    @Query('level') level: string = 'CEO',
    @Query('period') period: string = 'rolling-30d',
    @Query('forceRefresh') forceRefresh?: string,
    @Query('cacheTtlSeconds') cacheTtlSeconds?: string,
  ) {
    const resolvedTenant = this.resolveTenantId(tenantId);
    const parsedTtl = cacheTtlSeconds !== undefined ? Number(cacheTtlSeconds) : undefined;
    const normalizedLevel = (level || 'CEO').toUpperCase() as any;
    const options = {
      cacheTtlSeconds:
        typeof parsedTtl === 'number' && Number.isFinite(parsedTtl) ? parsedTtl : undefined,
      forceRefresh: forceRefresh === 'true' || forceRefresh === '1',
      reportingPeriod: period,
    };

    return this.svc.getExecutiveInsightsSnapshot(resolvedTenant, normalizedLevel, period, options);
  }
}
