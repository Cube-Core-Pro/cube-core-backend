// path: src/hr/services/leave-request.service.ts
// purpose: Leave request management service
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveRequestEntity } from '../entities/leave-request.entity';

@Injectable()
export class LeaveRequestService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createLeaveRequestDto: CreateLeaveRequestDto): Promise<LeaveRequestEntity> {
    // Validate employee exists
    const employee = await this.prisma.employees.findFirst({
      where: { id: createLeaveRequestDto.employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Validate dates
    const startDate = new Date(createLeaveRequestDto.startDate);
    const endDate = new Date(createLeaveRequestDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping leave requests
    const overlapping = await this.prisma.leave_requests.findFirst({
      where: {
        employeeId: createLeaveRequestDto.employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Leave request overlaps with existing request');
    }

    const leaveRequest = await this.prisma.leave_requests.create({
      data: {
        id: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        employeeId: createLeaveRequestDto.employeeId,
        type: createLeaveRequestDto.type,
        startDate,
        endDate,
        days: createLeaveRequestDto.days,
        reason: createLeaveRequestDto.reason,
        status: createLeaveRequestDto.status || 'PENDING',
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });

    return leaveRequest as LeaveRequestEntity;
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      employeeId?: string;
      status?: string;
      type?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, employeeId, status, type } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [leaveRequests, total] = await Promise.all([
      this.prisma.leave_requests.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employees: {
            select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          },
          users: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.leave_requests.count({ where }),
    ]);

    return {
      data: leaveRequests,
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<LeaveRequestEntity> {
    const leaveRequest = await this.prisma.leave_requests.findFirst({
      where: { id, tenantId },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true, department: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest as LeaveRequestEntity;
  }

  async approve(tenantId: string, id: string, approvedById: string): Promise<LeaveRequestEntity> {
    const leaveRequest = await this.findOne(tenantId, id);

    if (leaveRequest.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave requests can be approved');
    }

    const updatedRequest = await this.prisma.leave_requests.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updatedRequest as LeaveRequestEntity;
  }

  async reject(tenantId: string, id: string, approvedById: string, rejectionReason: string): Promise<LeaveRequestEntity> {
    const leaveRequest = await this.findOne(tenantId, id);

    if (leaveRequest.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave requests can be rejected');
    }

    const updatedRequest = await this.prisma.leave_requests.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById,
        rejectionReason,
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updatedRequest as LeaveRequestEntity;
  }

  async cancel(tenantId: string, id: string): Promise<LeaveRequestEntity> {
    const leaveRequest = await this.findOne(tenantId, id);

    if (!['PENDING', 'APPROVED'].includes(leaveRequest.status)) {
      throw new BadRequestException('Only pending or approved leave requests can be cancelled');
    }

    const updatedRequest = await this.prisma.leave_requests.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });

    return updatedRequest as LeaveRequestEntity;
  }

  async getLeaveBalance(tenantId: string, employeeId: string, year: number = new Date().getFullYear()) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const approvedLeaves = await this.prisma.leave_requests.findMany({
      where: {
        tenantId,
        employeeId,
        status: 'APPROVED',
        startDate: { gte: startOfYear },
        endDate: { lte: endOfYear },
      },
    });

    const usedDays = approvedLeaves.reduce((total, leave) => total + Number(leave.days), 0);

    // This would typically come from employee benefits or company policy
    const annualAllowance = 25; // Default 25 days per year

    return {
      year,
      annualAllowance,
      usedDays,
      remainingDays: annualAllowance - usedDays,
      leaveHistory: approvedLeaves,
    };
  }

  async getLeaveStats(tenantId: string) {
    const [pending, approved, rejected, byType] = await Promise.all([
      this.prisma.leave_requests.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.leave_requests.count({ where: { tenantId, status: 'APPROVED' } }),
      this.prisma.leave_requests.count({ where: { tenantId, status: 'REJECTED' } }),
      this.prisma.leave_requests.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { id: true },
        _sum: { days: true },
      }),
    ]);

    return {
      pending,
      approved,
      rejected,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count.id,
        totalDays: Number(t._sum.days || 0),
      })),
    };
  }
}