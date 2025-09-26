// path: src/hr/entities/leave-request.entity.ts
// purpose: Leave request entity definition
// dependencies: none

import { Decimal } from '@prisma/client/runtime/library';

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
  
  // Relations
  employees?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string | null;
  };
  users?: {
    id: string;
    name: string;
    email: string;
  } | null;
}