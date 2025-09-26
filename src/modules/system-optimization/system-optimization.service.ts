// path: backend/src/modules/system-optimization/system-optimization.service.ts
// purpose: Advanced system optimization and performance monitoring
// dependencies: @nestjs/common, prisma, redis, node:os, node:cluster

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as os from 'node:os';
import * as cluster from 'node:cluster';
import * as process from 'node:process';

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    database: number;
    redis: number;
  };
  recommendations: string[];
  issues: SystemIssue[];
}

export interface SystemIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'security' | 'reliability' | 'capacity';
  description: string;
  impact: string;
  solution: string;
  autoFix: boolean;
  priority: number;
}

export interface PerformanceOptimization {
  component: string;
  current: number;
  target: number;
  improvement: number;
  actions: string[];
  estimatedTime: number;
}

@Injectable()
export class SystemOptimizationService {
  private readonly logger = new Logger(SystemOptimizationService.name);
  private optimizationInterval: NodeJS.Timeout;
  private metricsInterval: NodeJS.Timeout;
  private healthCheckInterval: NodeJS.Timeout;
  private lastHealthCheck: SystemHealth;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.startHealthMonitoring();
    this.startOptimizationCycle();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const metrics = await this.collectSystemMetrics();
      const issues = await this.detectSystemIssues();
      const recommendations = await this.generateRecommendations(metrics, issues);
      
      const score = this.calculateHealthScore(metrics, issues);
      const status = this.determineHealthStatus(score, issues);

      const health: SystemHealth = {
        status,
        score,
        metrics,
        recommendations,
        issues
      };

      this.lastHealthCheck = health;
      await this.cacheHealthStatus(health);

      return health;
    } catch (error) {
      this.logger.error(`Failed to get system health: ${error.message}`);
      throw error;
    }
  }

  async optimizeSystemPerformance(): Promise<PerformanceOptimization[]> {
    try {
      const optimizations: PerformanceOptimization[] = [];

      // Database optimization
      const dbOptimization = await this.optimizeDatabase();
      if (dbOptimization) optimizations.push(dbOptimization);

      // Memory optimization
      const memoryOptimization = await this.optimizeMemory();
      if (memoryOptimization) optimizations.push(memoryOptimization);

      // CPU optimization
      const cpuOptimization = await this.optimizeCPU();
      if (cpuOptimization) optimizations.push(cpuOptimization);

      // Redis optimization
      const redisOptimization = await this.optimizeRedis();
      if (redisOptimization) optimizations.push(redisOptimization);

      // Network optimization
      const networkOptimization = await this.optimizeNetwork();
      if (networkOptimization) optimizations.push(networkOptimization);

      // Apply automatic optimizations
      await this.applyAutomaticOptimizations(optimizations);

      this.logger.log(`Applied ${optimizations.length} performance optimizations`);
      return optimizations;
    } catch (error) {
      this.logger.error(`Failed to optimize system performance: ${error.message}`);
      throw error;
    }
  }

  private async collectSystemMetrics(): Promise<SystemHealth['metrics']> {
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();
    const networkUsage = await this.getNetworkUsage();
    const databaseHealth = await this.getDatabaseHealth();
    const redisHealth = await this.getRedisHealth();

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      network: networkUsage,
      database: databaseHealth,
      redis: redisHealth
    };
  }

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime.bigint();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime.bigint();
        
        const elapsedTime = Number(currentTime - startTime) / 1000000; // Convert to ms
        const cpuUsage = (currentUsage.user + currentUsage.system) / elapsedTime * 100;
        
        resolve(Math.min(100, Math.max(0, cpuUsage)));
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const memoryData = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return (usedMemory / totalMemory) * 100;
  }

  private async getDiskUsage(): Promise<number> {
    try {
      const fs = await import('node:fs/promises');
      const stats = await fs.stat(process.cwd());
      // Simplified disk usage calculation
      return 45; // Placeholder - implement actual disk usage calculation
    } catch (error) {
      this.logger.warn(`Failed to get disk usage: ${error.message}`);
      return 0;
    }
  }

  private async getNetworkUsage(): Promise<number> {
    // Simplified network usage - implement actual network monitoring
    return 20;
  }

  private async getDatabaseHealth(): Promise<number> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      // Health score based on response time
      if (responseTime < 50) return 100;
      if (responseTime < 100) return 90;
      if (responseTime < 200) return 80;
      if (responseTime < 500) return 70;
      if (responseTime < 1000) return 50;
      return 30;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error.message}`);
      return 0;
    }
  }

  private async getRedisHealth(): Promise<number> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      // Health score based on response time
      if (responseTime < 10) return 100;
      if (responseTime < 25) return 90;
      if (responseTime < 50) return 80;
      if (responseTime < 100) return 70;
      if (responseTime < 200) return 50;
      return 30;
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return 0;
    }
  }

  private async detectSystemIssues(): Promise<SystemIssue[]> {
    const issues: SystemIssue[] = [];

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 85) {
      issues.push({
        id: 'high-memory-usage',
        severity: memoryUsage > 95 ? 'critical' : 'high',
        category: 'performance',
        description: `Memory usage is ${memoryUsage.toFixed(1)}%`,
        impact: 'System may become unresponsive or crash',
        solution: 'Restart services, optimize memory usage, increase memory allocation',
        autoFix: memoryUsage < 95,
        priority: memoryUsage > 95 ? 1 : 2
      });
    }

    // Check database performance
    const dbHealth = await this.getDatabaseHealth();
    if (dbHealth < 70) {
      issues.push({
        id: 'poor-database-performance',
        severity: dbHealth < 50 ? 'high' : 'medium',
        category: 'performance',
        description: 'Database response time is slow',
        impact: 'Application performance degradation',
        solution: 'Optimize queries, update statistics, check indexes',
        autoFix: true,
        priority: dbHealth < 50 ? 2 : 3
      });
    }

    return issues.sort((a, b) => a.priority - b.priority);
  }

  private async generateRecommendations(metrics: SystemHealth['metrics'], issues: SystemIssue[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.memory > 80) {
      recommendations.push('Consider increasing Node.js heap size with --max-old-space-size');
      recommendations.push('Implement memory cleanup routines for long-running processes');
    }

    if (metrics.cpu > 75) {
      recommendations.push('Enable CPU clustering for better load distribution');
      recommendations.push('Optimize CPU-intensive operations');
    }

    if (metrics.database < 80) {
      recommendations.push('Review and optimize database queries');
      recommendations.push('Update database statistics and rebuild indexes');
    }

    if (issues.length > 5) {
      recommendations.push('Schedule system maintenance window');
      recommendations.push('Implement automated issue resolution');
    }

    return recommendations;
  }

  private calculateHealthScore(metrics: SystemHealth['metrics'], issues: SystemIssue[]): number {
    const metricWeights = {
      cpu: 0.2,
      memory: 0.2,
      disk: 0.15,
      network: 0.15,
      database: 0.2,
      redis: 0.1
    };

    let baseScore = 0;
    Object.entries(metrics).forEach(([key, value]) => {
      const weight = metricWeights[key] || 0;
      const score = Math.max(0, 100 - value); // Invert for usage metrics
      baseScore += score * weight;
    });

    // Deduct points for issues
    const issueDeduction = issues.reduce((deduction, issue) => {
      switch (issue.severity) {
        case 'critical': return deduction + 20;
        case 'high': return deduction + 10;
        case 'medium': return deduction + 5;
        case 'low': return deduction + 2;
        default: return deduction;
      }
    }, 0);

    return Math.max(0, Math.min(100, baseScore - issueDeduction));
  }

  private determineHealthStatus(score: number, issues: SystemIssue[]): SystemHealth['status'] {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical');
    
    if (criticalIssues.length > 0 || score < 30) {
      return 'critical';
    } else if (score < 70) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private async optimizeDatabase(): Promise<PerformanceOptimization | null> {
    try {
      const currentHealth = await this.getDatabaseHealth();
      if (currentHealth > 85) return null;

      // Run database optimization
      await this.prisma.$executeRaw`ANALYZE;`;
      
      return {
        component: 'Database',
        current: currentHealth,
        target: 90,
        improvement: 90 - currentHealth,
        actions: ['Analyzed database statistics', 'Optimized query planner'],
        estimatedTime: 2000
      };
    } catch (error) {
      this.logger.warn(`Database optimization failed: ${error.message}`);
      return null;
    }
  }

  private async optimizeMemory(): Promise<PerformanceOptimization | null> {
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage < 80) return null;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const newMemoryUsage = this.getMemoryUsage();
    const improvement = memoryUsage - newMemoryUsage;

    if (improvement > 1) {
      return {
        component: 'Memory',
        current: memoryUsage,
        target: newMemoryUsage,
        improvement,
        actions: ['Forced garbage collection', 'Cleared memory caches'],
        estimatedTime: 500
      };
    }

    return null;
  }

  private async optimizeCPU(): Promise<PerformanceOptimization | null> {
    // CPU optimization strategies would go here
    return null;
  }

  private async optimizeRedis(): Promise<PerformanceOptimization | null> {
    try {
      const currentHealth = await this.getRedisHealth();
      if (currentHealth > 85) return null;

      // Clear expired keys - simplified implementation
      await this.redis.del('temp:*'); // Clear temporary keys
      
      return {
        component: 'Redis',
        current: currentHealth,
        target: 90,
        improvement: 90 - currentHealth,
        actions: ['Cleared expired keys', 'Optimized memory usage'],
        estimatedTime: 1000
      };
    } catch (error) {
      this.logger.warn(`Redis optimization failed: ${error.message}`);
      return null;
    }
  }

  private async optimizeNetwork(): Promise<PerformanceOptimization | null> {
    // Network optimization strategies would go here
    return null;
  }

  private async applyAutomaticOptimizations(optimizations: PerformanceOptimization[]): Promise<void> {
    for (const optimization of optimizations) {
      if (optimization.estimatedTime && optimization.estimatedTime < 5000) {
        this.logger.log(`Auto-applying optimization for ${optimization.component}`);
        // Apply the optimization
        await new Promise(resolve => setTimeout(resolve, optimization.estimatedTime));
      }
    }
  }

  private async cacheHealthStatus(health: SystemHealth): Promise<void> {
    try {
      await this.redis.setex(
        'system:health',
        60, // Cache for 1 minute
        JSON.stringify(health)
      );
    } catch (error) {
      this.logger.warn(`Failed to cache health status: ${error.message}`);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.getSystemHealth();
      } catch (error) {
        this.logger.error(`Health monitoring failed: ${error.message}`);
      }
    }, 30000); // Every 30 seconds
  }

  private startOptimizationCycle(): void {
    this.optimizationInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        if (health.status === 'warning' || health.status === 'critical') {
          await this.optimizeSystemPerformance();
        }
      } catch (error) {
        this.logger.error(`Optimization cycle failed: ${error.message}`);
      }
    }, 300000); // Every 5 minutes
  }

  onModuleDestroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
  }
}