import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly redisKey = 'feature-flags';
  private cache: Record<string, boolean> | null = null;
  private lastLoad = 0;
  private readonly CACHE_MS = 5000;

  constructor(private readonly cfg: ConfigService, private readonly redis: RedisService) {}

  private envDefault(code: string): boolean {
    const envKey = this.toEnvKey(code);
    const val = this.cfg.get<string>(envKey);
    if (val === undefined) return true; // default enabled
    return ['true','1','on','yes'].includes(String(val).toLowerCase());
  }

  private toEnvKey(code: string): string {
    return `FEATURE_${code.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}`;
  }

  private async load(): Promise<Record<string, boolean>> {
    const now = Date.now();
    if (this.cache && now - this.lastLoad < this.CACHE_MS) return this.cache;
    const stored = await this.redis.getJson<Record<string, boolean>>(this.redisKey);
    this.cache = stored || {};
    this.lastLoad = now;
    return this.cache;
  }

  async get(code: string): Promise<boolean> {
    const map = await this.load();
    if (map && Object.prototype.hasOwnProperty.call(map, code)) return !!map[code];
    return this.envDefault(code);
  }

  async set(code: string, enabled: boolean): Promise<void> {
    const map = await this.load();
    map[code] = !!enabled;
    this.cache = map;
    await this.redis.setJson(this.redisKey, map);
  }

  async all(codes: string[]): Promise<Record<string, boolean>> {
    const out: Record<string, boolean> = {};
    for (const c of codes) out[c] = await this.get(c);
    return out;
  }
}

