// path: src/hr/entities/employee.entity.ts
// purpose: Employee entity definition
// dependencies: none

import { Decimal } from '@prisma/client/runtime/library';

export interface EmployeeEntity {
  id: string;
  tenantId: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: Date | null;
  hireDate: Date;
  terminationDate?: Date | null;
  status: string;
  department?: string | null;
  position?: string | null;
  managerId?: string | null;
  salary?: Decimal | null;
  currency: string;
  payrollFrequency?: string | null;
  address?: any;
  emergencyContact?: any;
  benefits?: any;
  documents?: any;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  employees?: EmployeeEntity | null; // Manager
  other_employees?: EmployeeEntity[]; // Direct reports
  leave_requests?: LeaveRequestEntity[];
  performance_reviews?: PerformanceReviewEntity[];
}

export interface LeaveRequestEntity {
  id: string;
  tenantId: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: Decimal;
  reason?: string | null;
  status: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceReviewEntity {
  id: string;
  tenantId: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  type: string;
  status: string;
  overallRating?: number | null;
  goals?: any;
  achievements?: any;
  areasForImprovement?: any;
  feedback?: string | null;
  employeeComments?: string | null;
  nextReviewDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}