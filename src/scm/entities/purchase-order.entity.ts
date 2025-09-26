// path: src/scm/entities/purchase-order.entity.ts
// purpose: Purchase Order entity for SCM module
// dependencies: prisma types

export interface PurchaseOrderEntity {
  id: string;
  tenantId: string;
  orderNumber: string;
  supplierId: string;
  status: string;
  orderDate: Date;
  expectedDate?: Date | null;
  receivedDate?: Date | null;
  subtotal: any; // Decimal
  taxAmount: any; // Decimal
  totalAmount: any; // Decimal
  currency: string;
  notes?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderWithRelations extends PurchaseOrderEntity {
  suppliers?: any;
  purchase_order_lines?: any[];
  users_purchase_orders_createdByIdTousers?: any;
  users_purchase_orders_approvedByIdTousers?: any;
}
