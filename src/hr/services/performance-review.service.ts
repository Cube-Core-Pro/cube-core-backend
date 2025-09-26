// path: src/hr/services/performance-review.service.ts
// purpose: Performance review management service
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePerformanceReviewDto } from '../dto/create-performance-review.dto';
import { PerformanceReviewEntity } from '../entities/performance-review.entity';

@Injectable()
export class PerformanceReviewService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createReviewDto: CreatePerformanceReviewDto): Promise<PerformanceReviewEntity> {
    // Validate employee exists
    const employee = await this.prisma.employees.findFirst({
      where: { id: createReviewDto.employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate reviewer exists
    const reviewer = await this.prisma.user.findFirst({
      where: { id: createReviewDto.reviewerId, tenantId },
    });

    if (!reviewer) {
      throw new NotFoundException('Reviewer not found');
    }

    // Check for existing review in the same period
    const existingReview = await this.prisma.performance_reviews.findFirst({
      where: {
        tenantId,
        employeeId: createReviewDto.employeeId,
        period: createReviewDto.period,
        type: createReviewDto.type || 'ANNUAL',
      },
    });

    if (existingReview) {
      throw new BadRequestException('Performance review already exists for this period');
    }

    const review = await this.prisma.performance_reviews.create({
      data: {
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        employeeId: createReviewDto.employeeId,
        reviewerId: createReviewDto.reviewerId,
        period: createReviewDto.period,
        type: createReviewDto.type || 'ANNUAL',
        status: createReviewDto.status || 'DRAFT',
        overallRating: createReviewDto.overallRating,
        goals: createReviewDto.goals,
        achievements: createReviewDto.achievements,
        areasForImprovement: createReviewDto.areasForImprovement,
        feedback: createReviewDto.feedback,
        employeeComments: createReviewDto.employeeComments,
        nextReviewDate: createReviewDto.nextReviewDate ? new Date(createReviewDto.nextReviewDate) : null,
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return review as PerformanceReviewEntity;
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      employeeId?: string;
      reviewerId?: string;
      status?: string;
      type?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, employeeId, reviewerId, status, type } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.performance_reviews.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employees: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
          },
          users: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.performance_reviews.count({ where }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<PerformanceReviewEntity> {
    const review = await this.prisma.performance_reviews.findFirst({
      where: { id, tenantId },
      include: {
        employees: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            employeeNumber: true, 
            position: true,
            department: true,
            hireDate: true,
          },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Performance review not found');
    }

    return review as PerformanceReviewEntity;
  }

  async update(tenantId: string, id: string, updateData: Partial<CreatePerformanceReviewDto>): Promise<PerformanceReviewEntity> {
    const _review = await this.findOne(tenantId, id);

    const updatedReview = await this.prisma.performance_reviews.update({
      where: { id },
      data: {
        ...updateData,
        nextReviewDate: updateData.nextReviewDate ? new Date(updateData.nextReviewDate) : undefined,
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updatedReview as PerformanceReviewEntity;
  }

  async complete(tenantId: string, id: string): Promise<PerformanceReviewEntity> {
    const review = await this.findOne(tenantId, id);

    if (review.status === 'COMPLETED') {
      throw new BadRequestException('Review is already completed');
    }

    const updatedReview = await this.prisma.performance_reviews.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updatedReview as PerformanceReviewEntity;
  }

  async approve(tenantId: string, id: string): Promise<PerformanceReviewEntity> {
    const review = await this.findOne(tenantId, id);

    if (review.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed reviews can be approved');
    }

    const updatedReview = await this.prisma.performance_reviews.update({
      where: { id },
      data: {
        status: 'APPROVED',
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updatedReview as PerformanceReviewEntity;
  }

  async getReviewStats(tenantId: string) {
    const [draft, inProgress, completed, approved, byRating] = await Promise.all([
      this.prisma.performance_reviews.count({ where: { tenantId, status: 'DRAFT' } }),
      this.prisma.performance_reviews.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
      this.prisma.performance_reviews.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.performance_reviews.count({ where: { tenantId, status: 'APPROVED' } }),
      this.prisma.performance_reviews.groupBy({
        by: ['overallRating'],
        where: { tenantId, overallRating: { not: null } },
        _count: { id: true },
      }),
    ]);

    const averageRating = await this.prisma.performance_reviews.aggregate({
      where: { tenantId, overallRating: { not: null } },
      _avg: { overallRating: true },
    });

    return {
      draft,
      inProgress,
      completed,
      approved,
      averageRating: averageRating._avg.overallRating || 0,
      ratingDistribution: byRating.map(r => ({
        rating: r.overallRating,
        count: r._count.id,
      })),
    };
  }

  async getUpcomingReviews(tenantId: string, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const upcomingReviews = await this.prisma.performance_reviews.findMany({
      where: {
        tenantId,
        nextReviewDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, position: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    return upcomingReviews;
  }
}