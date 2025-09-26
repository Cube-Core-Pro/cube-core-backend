// path: src/hr/entities/performance-review.entity.ts
// purpose: Performance review entity definition
// dependencies: none

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
  
  // Relations
  employees?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: string | null;
    department?: string | null;
    hireDate?: Date;
  };
  users?: {
    id: string;
    name: string;
    email: string;
  };
}