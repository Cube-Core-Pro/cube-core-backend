// path: src/pos/services/pos-transaction.service.ts
// purpose: POS Transaction service with sales processing and payment handling
// dependencies: @nestjs/common, PrismaService, DTOs

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto, TransactionType, TransactionStatus } from '../dto';
import { PosTransaction, PosTransactionWithRelations } from '../entities';

@Injectable()
export class PosTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    cashierId: string,
    createTransactionDto: CreateTransactionDto
  ): Promise<PosTransactionWithRelations> {
    return await this.prisma.$transaction(async (tx) => {
      // Generate transaction number
      const transactionNo = await this.generateTransactionNumber(tenantId);

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;

      // Validate items and calculate totals
      for (const item of createTransactionDto.items) {
        const product = await tx.posProduct.findFirst({
          where: { id: item.productId, tenantId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Product ${product.name} is not active`);
        }

        // Check stock for sales
        if (createTransactionDto.type !== TransactionType.RETURN && product.stockLevel < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.name}`);
        }

        const itemTotal = item.quantity * item.unitPrice;
        const itemDiscount = item.discountAmount || 0;
        const itemTax = item.taxAmount || 0;

        subtotal += itemTotal - itemDiscount;
        totalTax += itemTax;
      }

      const discountAmount = createTransactionDto.discountAmount || 0;
      const totalAmount = subtotal + totalTax - discountAmount;

      // Create transaction
      const transaction = await tx.posTransaction.create({
        data: {
          transactionNo,
          type: createTransactionDto.type || TransactionType.SALE,
          status: TransactionStatus.PENDING,
          subtotal,
          taxAmount: totalTax,
          discountAmount,
          totalAmount,
          customerId: createTransactionDto.customerId,
          customerName: createTransactionDto.customerName,
          cashierId,
          terminalId: createTransactionDto.terminalId,
          notes: createTransactionDto.notes,
          metadata: createTransactionDto.metadata,
          isOffline: createTransactionDto.isOffline || false,
          tenantId,
        },
      });

      // Create transaction items
      for (const item of createTransactionDto.items) {
        const itemTotal = item.quantity * item.unitPrice - (item.discountAmount || 0);

        await tx.posTransactionItem.create({
          data: {
            transactionId: transaction.id,
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal,
            discountAmount: item.discountAmount || 0,
            taxAmount: item.taxAmount || 0,
            notes: item.notes,
            metadata: item.metadata,
            tenantId,
          },
        });

        // Update product stock for sales
        if (createTransactionDto.type !== TransactionType.RETURN) {
          await tx.posProduct.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory movement
          await tx.posInventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'OUT',
              quantity: item.quantity,
              reason: 'SALE',
              reference: transaction.transactionNo,
              userId: cashierId,
              tenantId,
            },
          });
        }
      }

      // Create payments if provided
      if (createTransactionDto.payments && createTransactionDto.payments.length > 0) {
        let totalPaid = 0;

        for (const payment of createTransactionDto.payments) {
          await tx.posPayment.create({
            data: {
              transactionId: transaction.id,
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference,
              status: 'APPROVED', // Simplified for now
              processedAt: new Date(),
              metadata: payment.metadata,
              tenantId,
            },
          });

          totalPaid += payment.amount;
        }

        // Update transaction with payment info
        const changeAmount = Math.max(0, totalPaid - totalAmount);
        const status = totalPaid >= totalAmount ? TransactionStatus.COMPLETED : TransactionStatus.PENDING;

        await tx.posTransaction.update({
          where: { id: transaction.id },
          data: {
            paidAmount: totalPaid,
            changeAmount,
            status,
          },
        });
      }

      // Return transaction with relations
      return await tx.posTransaction.findUnique({
        where: { id: transaction.id },
        include: {
          items: true,
          payments: true,
          customer: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
        },
      }) as PosTransactionWithRelations;
    });
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      status?: TransactionStatus;
      type?: TransactionType;
      cashierId?: string;
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ data: PosTransactionWithRelations[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, type, cashierId, customerId, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (status) where.status = status;
    if (type) where.type = type;
    if (cashierId) where.cashierId = cashierId;
    if (customerId) where.customerId = customerId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.posTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: true,
          customer: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
        },
      }) as Promise<PosTransactionWithRelations[]>,
      this.prisma.posTransaction.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string): Promise<PosTransactionWithRelations> {
    const transaction = await this.prisma.posTransaction.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        customer: true,
        cashier: {
          select: { id: true, name: true, email: true },
        },
      },
    }) as PosTransactionWithRelations | null;

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async addPayment(
    tenantId: string,
    transactionId: string,
    paymentData: {
      method: string;
      amount: number;
      reference?: string;
      metadata?: any;
    }
  ): Promise<PosTransactionWithRelations> {
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.posTransaction.findFirst({
        where: { id: transactionId, tenantId },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException('Transaction is already completed');
      }

      // Create payment
      await tx.posPayment.create({
        data: {
          transactionId,
          method: paymentData.method,
          amount: paymentData.amount,
          reference: paymentData.reference,
          status: 'APPROVED',
          processedAt: new Date(),
          metadata: paymentData.metadata,
          tenantId,
        },
      });

      // Calculate new totals
      const payments = await tx.posPayment.findMany({
        where: { transactionId, status: 'APPROVED' },
      });

      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
      const changeAmount = Math.max(0, totalPaid - transaction.totalAmount.toNumber());
      const status = totalPaid >= transaction.totalAmount.toNumber() 
        ? TransactionStatus.COMPLETED 
        : TransactionStatus.PENDING;

      // Update transaction
      await tx.posTransaction.update({
        where: { id: transactionId },
        data: {
          paidAmount: totalPaid,
          changeAmount,
          status,
        },
      });

      // Return updated transaction
      return await tx.posTransaction.findUnique({
        where: { id: transactionId },
        include: {
          items: true,
          payments: true,
          customer: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
        },
      }) as PosTransactionWithRelations;
    });
  }

  async voidTransaction(tenantId: string, transactionId: string, reason?: string): Promise<PosTransaction> {
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.posTransaction.findFirst({
        where: { id: transactionId, tenantId },
        include: { items: true },
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
      }

      if (transaction.status === TransactionStatus.CANCELLED) {
        throw new BadRequestException('Transaction is already cancelled');
      }

      // Restore stock for completed sales
      if (transaction.status === TransactionStatus.COMPLETED && transaction.type === TransactionType.SALE) {
        for (const item of transaction.items) {
          await tx.posProduct.update({
            where: { id: item.productId },
            data: {
              stockLevel: {
                increment: item.quantity.toNumber(),
              },
            },
          });

          // Create inventory movement
          await tx.posInventoryMovement.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity.toNumber(),
              reason: 'VOID',
              reference: transaction.transactionNo,
              userId: transaction.cashierId,
              tenantId,
            },
          });
        }
      }

      // Update transaction status
      return await tx.posTransaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.CANCELLED,
          notes: reason ? `${transaction.notes || ''}\nVOID: ${reason}`.trim() : transaction.notes,
        },
      });
    });
  }

  private async generateTransactionNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastTransaction = await this.prisma.posTransaction.findFirst({
      where: {
        tenantId,
        transactionNo: {
          startsWith: `TXN-${dateStr}`,
        },
      },
      orderBy: { transactionNo: 'desc' },
    });

    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionNo.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `TXN-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  async getDailySales(tenantId: string, date?: Date): Promise<{
    totalSales: number;
    totalTransactions: number;
    averageTransaction: number;
    topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  }> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.prisma.posTransaction.findMany({
      where: {
        tenantId,
        status: TransactionStatus.COMPLETED,
        type: TransactionType.SALE,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
    });

    const totalSales = transactions.reduce((sum, txn) => sum + txn.totalAmount.toNumber(), 0);
    const totalTransactions = transactions.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate top products
    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    transactions.forEach(txn => {
      txn.items.forEach(item => {
        const existing = productStats.get(item.productId) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity.toNumber();
        existing.revenue += item.totalPrice.toNumber();
        productStats.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      topProducts,
    };
  }
}