// path: backend/src/redis/redis.service.ts
// purpose: Redis service for caching and data storage
// dependencies: ioredis, ConfigService

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.client.connect();
      this.logger.log('Redis connection established');

      this.client.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis disconnected');
      });

    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      // Don't throw error to allow app to start without Redis
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async setex(key: string, ttl: number, value: string | number): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.setex(key, ttl, String(value));
      return true;
    } catch (error) {
      this.logger.error(`Redis SETEX error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Redis GET JSON error for key ${key}:`, error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      return await this.set(key, jsonValue, ttl);
    } catch (error) {
      this.logger.error(`Redis SET JSON error for key ${key}:`, error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.hget(key, field);
    } catch (error) {
      this.logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      this.logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      if (!this.client) return null;
      return await this.client.hgetall(key);
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.hdel(key, field);
      return true;
    } catch (error) {
      this.logger.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      if (!this.client) return null;
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  }

  async decr(key: string): Promise<number | null> {
    try {
      if (!this.client) return null;
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Redis DECR error for key ${key}:`, error);
      return null;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client) return [];
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.flushdb();
      return true;
    } catch (error) {
      this.logger.error('Redis FLUSHDB error:', error);
      return false;
    }
  }

  // Health check method
  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis PING error:', error);
      return false;
    }
  }

  // Publish message to channel
  async publish(channel: string, message: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.publish(channel, message);
      return true;
    } catch (error) {
      this.logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
      return false;
    }
  }

  // Add to sorted set
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.zadd(key, score, member);
      return true;
    } catch (error) {
      this.logger.error(`Redis ZADD error for key ${key}:`, error);
      return false;
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.sadd(key, member);
      return true;
    } catch (error) {
      this.logger.error(`Redis SADD error for key ${key}:`, error);
      return false;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      if (!this.client) return [];
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      if (!this.client) return false;
      const res = await this.client.sismember(key, member);
      return res === 1;
    } catch (error) {
      this.logger.error(`Redis SISMEMBER error for key ${key}:`, error);
      return false;
    }
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number | null> {
    try {
      if (!this.client) return null;
      return await this.client.lpush(key, ...values);
    } catch (error) {
      this.logger.error(`Redis LPUSH error for key ${key}:`, error);
      return null;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number | null> {
    try {
      if (!this.client) return null;
      return await this.client.rpush(key, ...values);
    } catch (error) {
      this.logger.error(`Redis RPUSH error for key ${key}:`, error);
      return null;
    }
  }

  async lpop(key: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.lpop(key);
    } catch (error) {
      this.logger.error(`Redis LPOP error for key ${key}:`, error);
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      if (!this.client) return null;
      return await this.client.rpop(key);
    } catch (error) {
      this.logger.error(`Redis RPOP error for key ${key}:`, error);
      return null;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.client) return [];
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.ltrim(key, start, stop);
      return true;
    } catch (error) {
      this.logger.error(`Redis LTRIM error for key ${key}:`, error);
      return false;
    }
  }

  async llen(key: string): Promise<number | null> {
    try {
      if (!this.client) return null;
      return await this.client.llen(key);
    } catch (error) {
      this.logger.error(`Redis LLEN error for key ${key}:`, error);
      return null;
    }
  }

  // Get Redis client for advanced operations
  getClient(): Redis | null {
    return this.client;
  }
}