// path: src/pos/entities/pos-product.entity.ts
// purpose: POS Product entity interface
// dependencies: @prisma/client

import { PosProduct as PrismaPosProduct } from '@prisma/client';

export interface PosProduct extends PrismaPosProduct {}

export interface PosProductWithRelations extends PosProduct {
  transactionItems?: any[];
  inventoryMovements?: any[];
}