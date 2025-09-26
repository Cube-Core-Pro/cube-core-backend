// path: src/pos/entities/pos-transaction.entity.ts
// purpose: POS Transaction entity interface
// dependencies: @prisma/client

import { 
  PosTransaction as PrismaPosTransaction,
  PosTransactionItem as PrismaPosTransactionItem,
  PosPayment as PrismaPosPayment,
  PosCustomer as PrismaPosCustomer,
  PosProduct as PrismaPosProduct,
  User
} from '@prisma/client';

export interface PosTransaction extends PrismaPosTransaction {}

export interface PosTransactionItem extends PrismaPosTransactionItem {}

export interface PosPayment extends PrismaPosPayment {}

export interface PosTransactionWithRelations extends PrismaPosTransaction {
  items?: (PrismaPosTransactionItem & {
    product?: PrismaPosProduct;
  })[];
  payments?: PrismaPosPayment[];
  customer?: PrismaPosCustomer | null;
  cashier?: Pick<User, 'id' | 'name' | 'email'>;
}