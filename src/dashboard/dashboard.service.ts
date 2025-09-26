// path: backend/src/dashboard/dashboard.service.ts
// purpose: Dashboard service with comprehensive analytics and metrics
// dependencies: PrismaService, RedisService

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getOverview() {
    try {
      // Check cache first
      const cached = await this.redis.getJson('dashboard:overview');
      if (cached) {
        return cached;
      }

      const [
        totalUsers,
        activeUsers,
        totalTransactions,
        totalInvoices,
        recentLogins,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ 
          where: { 
            deletedAt: null, 
            isActive: true,
            lastLoginAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          } 
        }),
        this.prisma.transaction.count(),
        this.prisma.invoice.count(),
        this.prisma.user.count({
          where: {
            deletedAt: null,
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      const overview = {
        users: {
          total: totalUsers,
          active: activeUsers,
          recentLogins,
        },
        transactions: {
          total: totalTransactions,
        },
        invoices: {
          total: totalInvoices,
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache for 5 minutes
      await this.redis.setJson('dashboard:overview', overview, 300);

      return overview;
    } catch (error) {
      this.logger.error('Failed to get dashboard overview', error);
      throw error;
    }
  }

  async getAnalytics(period: string) {
    try {
      const cacheKey = `dashboard:analytics:${period}`;
      const cached = await this.redis.getJson(cacheKey);
      if (cached) {
        return cached;
      }

      const days = this.getPeriodDays(period);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [userGrowth, transactionVolume, invoiceStats] = await Promise.all([
        this.getUserGrowthData(startDate),
        this.getTransactionVolumeData(startDate),
        this.getInvoiceStatsData(startDate),
      ]);

      const analytics = {
        period,
        userGrowth,
        transactionVolume,
        invoiceStats,
        timestamp: new Date().toISOString(),
      };

      // Cache for 1 hour
      await this.redis.setJson(cacheKey, analytics, 3600);

      return analytics;
    } catch (error) {
      this.logger.error('Failed to get analytics data', error);
      throw error;
    }
  }

  async getRecentActivities(limit: number) {
    try {
      const activities = await this.prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {
        activities: activities.map(activity => ({
          id: activity.id,
          action: activity.action,
          resource: activity.resource,
          details: activity.details,
          user: activity.users,
          createdAt: activity.createdAt,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get recent activities', error);
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get system health', error);
      throw error;
    }
  }

  async getFinancialSummary(period: string) {
    try {
      const cacheKey = `dashboard:financial:${period}`;
      const cached = await this.redis.getJson(cacheKey);
      if (cached) {
        return cached;
      }

      const days = this.getPeriodDays(period);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalRevenue, paidInvoices, pendingInvoices, transactionStats] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            status: 'PAID',
            paidDate: { gte: startDate },
          },
          _sum: { amount: true },
        }),
        this.prisma.invoice.count({
          where: {
            status: 'PAID',
            paidDate: { gte: startDate },
          },
        }),
        this.prisma.invoice.count({
          where: {
            status: { in: ['SENT', 'OVERDUE'] },
            createdAt: { gte: startDate },
          },
        }),
        this.prisma.transaction.aggregate({
          where: {
            createdAt: { gte: startDate },
            status: 'COMPLETED',
          },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      const financial = {
        period,
        revenue: {
          total: totalRevenue._sum.amount || 0,
          invoicesPaid: paidInvoices,
          invoicesPending: pendingInvoices,
        },
        transactions: {
          total: transactionStats._sum.amount || 0,
          count: transactionStats._count,
        },
        timestamp: new Date().toISOString(),
      };

      // Cache for 30 minutes
      await this.redis.setJson(cacheKey, financial, 1800);

      return financial;
    } catch (error) {
      this.logger.error('Failed to get financial summary', error);
      throw error;
    }
  }

  async getUserMetrics() {
    try {
      const cached = await this.redis.getJson('dashboard:user-metrics');
      if (cached) {
        return cached;
      }

      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersThisMonth,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ 
          where: { 
            deletedAt: null, 
            isActive: true 
          } 
        }),
        this.prisma.user.count({ 
          where: { 
            deletedAt: null, 
            isVerified: true 
          } 
        }),
        this.prisma.user.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        // this.prisma.userRole.groupBy({
        //   by: ['roleId'],
        //   _count: true,
        // }),
        Promise.resolve([]), // Placeholder for usersByRole
      ]);

      const metrics = {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        newThisMonth: newUsersThisMonth,
        activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        verifiedPercentage: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        roleDistribution: [],
        timestamp: new Date().toISOString(),
      };

      // Cache for 10 minutes
      await this.redis.setJson('dashboard:user-metrics', metrics, 600);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get user metrics', error);
      throw error;
    }
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private async getUserGrowthData(startDate: Date) {
    const userGrowth = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        deletedAt: null,
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    return userGrowth.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      count: item._count,
    }));
  }

  private async getTransactionVolumeData(startDate: Date) {
    const transactions = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    return transactions.map(item => ({
      date: item.createdAt.toISOString().split('T')[0],
      volume: item._sum.amount || 0,
      count: item._count,
    }));
  }

  private async getInvoiceStatsData(startDate: Date) {
    const invoices = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: { amount: true },
    });

    return invoices.map(item => ({
      status: item.status,
      count: item._count,
      amount: item._sum.amount || 0,
    }));
  }
}