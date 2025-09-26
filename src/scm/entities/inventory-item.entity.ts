// path: src/scm/entities/inventory-item.entity.ts
// purpose: Inventory Item entity for SCM module
// dependencies: prisma types

export interface InventoryItemEntity {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unitOfMeasure: string;
  currentStock: any; // Decimal
  minimumStock: any; // Decimal
  maximumStock?: any | null; // Decimal
  reorderPoint: any; // Decimal
  unitCost: any; // Decimal
  averageCost: any; // Decimal
  lastCost: any; // Decimal
  currency: string;
  location?: string | null;
  barcode?: string | null;
  isActive: boolean;
  trackingMethod: string;
  attributes?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItemWithRelations extends InventoryItemEntity {
  inventory_movements?: any[];
  purchase_order_items?: any[];
}