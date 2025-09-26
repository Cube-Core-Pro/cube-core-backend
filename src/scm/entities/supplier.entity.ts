// path: src/scm/entities/supplier.entity.ts
// purpose: Supplier entity for SCM module
// dependencies: prisma types

export interface SupplierEntity {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: any;
  taxId?: string | null;
  paymentTerms?: string | null;
  currency: string;
  status: string;
  rating?: number | null;
  certifications?: string[];
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierWithRelations extends SupplierEntity {
  purchase_orders?: any[];
}
