// path: backend/src/health/health.service.ts
// purpose: Health check service with comprehensive system monitoring
// dependencies: PrismaService, RedisService, EmailService

import { Injectable, Logger } from "@nestjs/common";
import { ModuleRef } from '@nestjs/core';
import { collectDefaultMetrics, register, Gauge, Histogram, Counter } from 'prom-client';
import { getQueueToken } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { EmailService } from "../email/email.service";
import { Fortune500HealthConfig } from '../types/fortune500-types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly moduleRef: ModuleRef,
  ) {}
  
  private metricsInitialized = false;
  private buildInfoGauge?: Gauge<string>;
  private queueWaitingGauge?: Gauge<string>;
  private dbConnectionsGauge?: Gauge<string>;
  private httpRequestDurationHistogram?: Histogram<string>;
  private httpRequestsCounter?: Counter<string>;
  private readonly queueNames = [
    'blockchain-transactions',
    'token-operations',
    'nft-operations',
    'staking-operations',
    'defi-operations',
    'cross-chain-operations',
    'email-processing',
    'email-security',
    'rdp-processing',
    'vdi-provisioning',
    'video-processing',
    'meeting-analysis',
    'transcription-processing',
    'video-security',
    'meeting-intelligence',
    'real-time-monitoring',
    'office-processing',
    'import-export',
    'ai-document-analysis',
    'intelligent-collaboration',
    'smart-formatting',
  ];
  private readonly queueCache = new Map<string, Queue | null>();

  private ensureMetrics() {
    if (this.metricsInitialized) return;
    collectDefaultMetrics({ register });
    this.buildInfoGauge = this.getOrCreateGauge('app_build_info', ['version', 'environment']);
    this.queueWaitingGauge = this.getOrCreateGauge('bull_queue_jobs_waiting_total', ['queue']);
    this.dbConnectionsGauge = this.getOrCreateGauge('pg_stat_activity_count', ['state']);
    this.httpRequestDurationHistogram = this.getOrCreateHistogram(
      'http_request_duration_seconds',
      ['method', 'route', 'status'],
      [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    );
    this.httpRequestsCounter = this.getOrCreateCounter('http_requests_total', ['method', 'route', 'status']);

    this.buildInfoGauge.set({
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }, 1);
    this.metricsInitialized = true;
  }

  private getOrCreateGauge(name: string, labelNames: string[]) {
    const existing = register.getSingleMetric(name) as Gauge<string> | undefined;
    if (existing) return existing;
    return new Gauge({ name, help: name, labelNames });
  }

  private getOrCreateHistogram(name: string, labelNames: string[], buckets: number[]) {
    const existing = register.getSingleMetric(name) as Histogram<string> | undefined;
    if (existing) return existing;
    return new Histogram({ name, help: name, labelNames, buckets });
  }

  private getOrCreateCounter(name: string, labelNames: string[]) {
    const existing = register.getSingleMetric(name) as Counter<string> | undefined;
    if (existing) return existing;
    return new Counter({ name, help: name, labelNames });
  }

  private async resolveQueue(name: string) {
    if (this.queueCache.has(name)) {
      return this.queueCache.get(name) ?? null;
    }
    try {
      const queue = this.moduleRef.get<Queue>(getQueueToken(name), { strict: false });
      this.queueCache.set(name, queue ?? null);
      return queue ?? null;
    } catch (error) {
      this.logger.warn(`Queue not available for metrics: ${name}`);
      this.queueCache.set(name, null);
      return null;
    }
  }

  async check() {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    return {
      status: 'ok',
      timestamp,
      uptime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async detailedCheck() {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    // Check all dependencies
    const [database, redis, email] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkEmail(),
    ]);

    const checks = {
      database: this.getCheckResult(database),
      redis: this.getCheckResult(redis),
      email: this.getCheckResult(email),
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'ok');
    
    return {
      status: allHealthy ? 'ok' : 'error',
      timestamp,
      uptime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  async readinessCheck() {
    try {
      // Check critical dependencies for readiness
      const [databaseReady, redisReady] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
      ]);

      if (!databaseReady || !redisReady) {
        throw new Error('Critical dependencies not ready');
      }

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw error;
    }
  }

  async livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async metrics(): Promise<string> {
    this.ensureMetrics();
    await this.updateDynamicMetrics();
    return register.metrics();
  }

  private async updateDynamicMetrics() {
    await Promise.all([
      this.updateQueueMetrics(),
      this.updateDatabaseMetrics(),
    ]);
  }

  private async updateQueueMetrics() {
    if (!this.queueWaitingGauge) return;
    await Promise.all(
      this.queueNames.map(async (name) => {
        const queue = await this.resolveQueue(name);
        if (!queue) {
          this.queueWaitingGauge?.set({ queue: name }, 0);
          return;
        }
        try {
          const counts = await queue.getJobCounts();
          this.queueWaitingGauge?.set({ queue: name }, counts.waiting ?? 0);
        } catch (error) {
          this.logger.warn(
            `Failed to collect queue metrics for ${name}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }

  private async updateDatabaseMetrics() {
    if (!this.dbConnectionsGauge) return;
    try {
      const activeConnections = await this.prisma.$queryRawUnsafe<Array<{ count?: number }>>(
        `SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE datname = current_database()`
      );
      const maxConnections = await this.prisma.$queryRawUnsafe<Array<{ max_connections?: number }>>(
        `SELECT current_setting('max_connections')::int AS max_connections`
      );
      const current = activeConnections?.[0]?.count ?? 0;
      const max = maxConnections?.[0]?.max_connections ?? 0;
      this.dbConnectionsGauge.set({ state: 'active' }, current);
      this.dbConnectionsGauge.set({ state: 'max' }, max);
    } catch (error) {
      this.logger.warn(
        `Failed to collect database metrics: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  private async checkEmail(): Promise<boolean> {
    try {
      return await this.email.testConnection();
    } catch (error) {
      this.logger.error('Email health check failed', error);
      return false;
    }
  }

  private getCheckResult(result: PromiseSettledResult<boolean>) {
    if (result.status === 'fulfilled' && result.value) {
      return { status: 'ok', timestamp: new Date().toISOString() };
    } else {
      return { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: result.status === 'rejected' ? result.reason?.message : 'Check failed'
      };
    }
  }
}
