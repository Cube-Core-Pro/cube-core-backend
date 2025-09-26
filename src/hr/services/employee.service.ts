// path: src/hr/services/employee.service.ts
// purpose: Employee management service
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { EmployeeEntity } from '../entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    // Check if employee number already exists
    const existingEmployee = await this.prisma.employees.findFirst({
      where: {
        employeeNumber: createEmployeeDto.employeeNumber,
        tenantId,
      },
    });

    if (existingEmployee) {
      throw new ConflictException('Employee number already exists');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.employees.findFirst({
      where: {
        email: createEmployeeDto.email,
        tenantId,
      },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Create user first (simplified - in real implementation, integrate with auth)
    const user = await this.prisma.user.create({
      data: {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: createEmployeeDto.email,
        name: `${createEmployeeDto.firstName} ${createEmployeeDto.lastName}`,
        password: 'temp_password', // In real implementation, this would be handled by auth
        tenantId,
        role: 'EMPLOYEE',
        isActive: true,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        phone: createEmployeeDto.phone,
      },
    });

    const employee = await this.prisma.employees.create({
      data: {
        id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId: user.id,
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        email: createEmployeeDto.email,
        phone: createEmployeeDto.phone,
        dateOfBirth: createEmployeeDto.dateOfBirth ? new Date(createEmployeeDto.dateOfBirth) : null,
        hireDate: new Date(createEmployeeDto.hireDate),
        terminationDate: createEmployeeDto.terminationDate ? new Date(createEmployeeDto.terminationDate) : null,
        status: createEmployeeDto.status || 'ACTIVE',
        department: createEmployeeDto.department,
        position: createEmployeeDto.position,
        managerId: createEmployeeDto.managerId,
        salary: createEmployeeDto.salary,
        currency: createEmployeeDto.currency || 'USD',
        payrollFrequency: createEmployeeDto.payrollFrequency,
        address: createEmployeeDto.address,
        emergencyContact: createEmployeeDto.emergencyContact,
        benefits: createEmployeeDto.benefits,
        documents: createEmployeeDto.documents,
        notes: createEmployeeDto.notes,
        updatedAt: new Date(),
      },
    });

    return employee as any; // TODO: Fix type casting when proper types are defined
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      department?: string;
      status?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, search, department, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = department;
    }

    if (status) {
      where.status = status;
    }

    const [employees, total] = await Promise.all([
      this.prisma.employees.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: {
          other_employees: {
            select: { id: true, firstName: true, lastName: true, position: true },
          },
        },
      }),
      this.prisma.employees.count({ where }),
    ]);

    return {
      data: employees,
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<EmployeeEntity> {
    const employee = await this.prisma.employees.findFirst({
      where: { id, tenantId },
      include: {
        employees: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
        other_employees: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
        leave_requests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        performance_reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            users: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee as any; // TODO: Fix type casting when proper types are defined
  }

  async update(tenantId: string, id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<EmployeeEntity> {
    const employee = await this.findOne(tenantId, id);

    // Check for conflicts if updating email or employee number
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmail = await this.prisma.employees.findFirst({
        where: {
          email: updateEmployeeDto.email,
          tenantId,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (updateEmployeeDto.employeeNumber && updateEmployeeDto.employeeNumber !== employee.employeeNumber) {
      const existingNumber = await this.prisma.employees.findFirst({
        where: {
          employeeNumber: updateEmployeeDto.employeeNumber,
          tenantId,
          id: { not: id },
        },
      });

      if (existingNumber) {
        throw new ConflictException('Employee number already exists');
      }
    }

    const updatedEmployee = await this.prisma.employees.update({
      where: { id },
      data: {
        ...updateEmployeeDto,
        dateOfBirth: updateEmployeeDto.dateOfBirth ? new Date(updateEmployeeDto.dateOfBirth) : undefined,
        hireDate: updateEmployeeDto.hireDate ? new Date(updateEmployeeDto.hireDate) : undefined,
        terminationDate: updateEmployeeDto.terminationDate ? new Date(updateEmployeeDto.terminationDate) : undefined,
        updatedAt: new Date(),
      },
    });

    return updatedEmployee as EmployeeEntity;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const _employee = await this.findOne(tenantId, id);

    // Check if employee has dependent records
    const [leaveRequests, performanceReviews] = await Promise.all([
      this.prisma.leave_requests.findFirst({ where: { employeeId: id } }),
      this.prisma.performance_reviews.findFirst({ where: { employeeId: id } }),
    ]);

    if (leaveRequests || performanceReviews) {
      throw new ConflictException('Cannot delete employee with existing leave requests or performance reviews');
    }

    await this.prisma.employees.delete({ where: { id } });
  }

  async getDepartments(tenantId: string): Promise<string[]> {
    const departments = await this.prisma.employees.findMany({
      where: { tenantId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });

    return departments.map(d => d.department).filter(Boolean);
  }

  async getEmployeeStats(tenantId: string) {
    const [total, active, onLeave, terminated, byDepartment] = await Promise.all([
      this.prisma.employees.count({ where: { tenantId } }),
      this.prisma.employees.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.employees.count({ where: { tenantId, status: 'ON_LEAVE' } }),
      this.prisma.employees.count({ where: { tenantId, status: 'TERMINATED' } }),
      this.prisma.employees.groupBy({
        by: ['department'],
        where: { tenantId, department: { not: null } },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      onLeave,
      terminated,
      byDepartment: byDepartment.map(d => ({
        department: d.department,
        count: d._count.id,
      })),
    };
  }
}