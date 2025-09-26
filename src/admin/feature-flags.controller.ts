import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService } from '../common/feature-flags.service';
import { MODULE_CODES } from '../modules.catalog';
import axios from 'axios';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user.types';
import { AdminJwtOrOpenGuard, AdminRolesOrOpenGuard } from './guards/admin-auth.guard';

class SetFlagDto {
  enabled!: boolean;
}

interface ModuleHealthStatus {
  code: string;
  enabled: boolean;
  health: ModuleHealth | null;
}

interface ModuleHealth {
  ok: boolean;
  data?: unknown;
  error?: string;
}

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtOrOpenGuard, AdminRolesOrOpenGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class FeatureFlagsController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get('features')
  @ApiOperation({ summary: 'List all feature flags for modules' })
  @ApiResponse({ status: 200 })
  async listFeatures() {
    const moduleCodes = MODULE_CODES as unknown as string[];
    const map = await this.flags.all(moduleCodes);
    return { modules: map };
  }

  @Post('features/:code')
  @ApiOperation({ summary: 'Set feature flag for a module code' })
  @ApiResponse({ status: 200 })
  async setFeature(@Param('code') code: string, @Body() body: SetFlagDto) {
    await this.flags.set(code, !!body.enabled);
    return { code, enabled: await this.flags.get(code) };
  }

  @Get('modules/status')
  @ApiOperation({ summary: 'Aggregate module health statuses' })
  @ApiResponse({ status: 200 })
  async status() {
    const port = process.env.PORT || 3000;
    const base = `http://localhost:${port}/api`;
    const moduleCodes = MODULE_CODES as unknown as string[];
    const modules: ModuleHealthStatus[] = [];

    for (const code of moduleCodes) {
      const enabled = await this.flags.get(code);
      let health: ModuleHealth | null = null;
      if (enabled) {
        try {
          const { data } = await axios.get(`${base}/${code}/health`, { timeout: 1500 });
          health = { ok: true, data };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'error';
          health = { ok: false, error: message };
        }
      }
      modules.push({ code, enabled, health });
    }
    return { modules };
  }
}
