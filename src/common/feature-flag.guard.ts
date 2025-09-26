import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly flags: FeatureFlagsService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.DISABLE_FEATURE_FLAGS === 'true') {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    const path: string = (req.originalUrl || req.url || '').toLowerCase();
    // allow docs/health/metrics always
    if (
      path.startsWith('/api/docs') ||
      path.startsWith('/api/v1/health') || path === '/health' ||
      path.startsWith('/api/v1/metrics') ||
      path.startsWith('/api/public') || // public endpoints (leads)
      path.startsWith('/api/content') || // CMS endpoints
      path.startsWith('/api/admin') // admin endpoints (own auth/guards)
    ) {
      return true;
    }
    // expect /api/<module>/...
    const m = path.match(/^\/api\/([^\/\?]+)(?:[\/?].*)?$/);
    if (!m) return true;
    const code = m[1];
    return await this.flags.get(code);
  }
}
