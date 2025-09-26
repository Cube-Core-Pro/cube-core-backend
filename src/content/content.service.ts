import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Fortune500ContentConfig } from '../types/fortune500-types';

@Injectable()
export class ContentService {
  constructor(private readonly redis: RedisService) {}

  private key(page: string) { return `content:${page}`; }

  async get(page: string) {
    return (await this.redis.getJson<any>(this.key(page))) || {};
  }

  async set(page: string, data: any) {
    await this.redis.setJson(this.key(page), data);
    return { ok: true };
  }
}

