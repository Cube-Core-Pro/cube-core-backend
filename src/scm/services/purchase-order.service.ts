// path: src/scm/services/purchase-order.service.ts
// purpose: Purchase Order management service
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto, PurchaseOrderStatus } from '../dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrderEntity, PurchaseOrderWithRelations } from '../entities/purchase-order.entity';

@Injectable()
export class PurchaseOrderService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createPurchaseOrderDto: CreatePurchaseOrderDto): Promise<PurchaseOrderEntity> {
    // Validate supplier exists
    const supplier = await this.prisma.suppliers.findFirst({
      where: { id: createPurchaseOrderDto.supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Check if PO number already exists
    const existingPO = await this.prisma.purchase_orders.findFirst({
      where: {
        orderNumber: createPurchaseOrderDto.orderNumber,
        tenantId,
      },
    });

    if (existingPO) {
      throw new BadRequestException('Purchase order number already exists');
    }

    // Create PO with items in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchase_orders.create({
        data: {
          id: `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId,
          orderNumber: createPurchaseOrderDto.orderNumber,
          supplierId: createPurchaseOrderDto.supplierId,
          status: createPurchaseOrderDto.status || PurchaseOrderStatus.DRAFT,
          orderDate: new Date(createPurchaseOrderDto.orderDate),
          expectedDate: createPurchaseOrderDto.expectedDate
            ? new Date(createPurchaseOrderDto.expectedDate)
            : null,
          receivedDate: createPurchaseOrderDto.receivedDate
            ? new Date(createPurchaseOrderDto.receivedDate)
            : null,
          subtotal: new Prisma.Decimal(createPurchaseOrderDto.subtotal),
          taxAmount: new Prisma.Decimal(createPurchaseOrderDto.taxAmount ?? 0),
          totalAmount: new Prisma.Decimal(createPurchaseOrderDto.totalAmount),
          currency: createPurchaseOrderDto.currency || 'USD',
          notes: createPurchaseOrderDto.notes,
          createdById: createPurchaseOrderDto.createdById,
          approvedById: createPurchaseOrderDto.approvedById ?? null,
          approvedAt: createPurchaseOrderDto.approvedAt
            ? new Date(createPurchaseOrderDto.approvedAt)
            : null,
          updatedAt: new Date(),
        },
      });

      // Create PO items
      if (createPurchaseOrderDto.lines && createPurchaseOrderDto.lines.length > 0) {
        await tx.purchase_order_lines.createMany({
          data: createPurchaseOrderDto.lines.map((line) => ({
            id: `pol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            purchaseOrderId: purchaseOrder.id,
            itemId: line.itemId ?? null,
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            totalPrice: new Prisma.Decimal(line.totalPrice ?? line.quantity * line.unitPrice),
            receivedQuantity: new Prisma.Decimal(line.receivedQuantity ?? 0),
          })),
        });
      }

      return purchaseOrder;
    });

    return result as PurchaseOrderEntity;
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      supplierId?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, search, status, supplierId } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { suppliers: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const [purchaseOrders, total] = await Promise.all([
      this.prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          suppliers: {
            select: { id: true, name: true, code: true },
          },
          purchase_order_lines: {
            select: {
              id: true,
              description: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              receivedQuantity: true,
              inventory_items: {
                select: { name: true, sku: true },
              },
            },
          },
        },
      }),
      this.prisma.purchase_orders.count({ where }),
    ]);

    return {
      data: purchaseOrders as PurchaseOrderWithRelations[],
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<PurchaseOrderWithRelations> {
    const purchaseOrder = await this.prisma.purchase_orders.findFirst({
      where: { id, tenantId },
      include: {
        suppliers: true,
        purchase_order_lines: {
          include: {
            inventory_items: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        users_purchase_orders_createdByIdTousers: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        users_purchase_orders_approvedByIdTousers: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    return purchaseOrder as PurchaseOrderWithRelations;
  }

  async update(tenantId: string, id: string, updatePurchaseOrderDto: UpdatePurchaseOrderDto): Promise<PurchaseOrderEntity> {
    const purchaseOrder = await this.findOne(tenantId, id);

    // Check if order number is being changed and already exists
    if (updatePurchaseOrderDto.orderNumber && updatePurchaseOrderDto.orderNumber !== purchaseOrder.orderNumber) {
      const existingPO = await this.prisma.purchase_orders.findFirst({
        where: {
          orderNumber: updatePurchaseOrderDto.orderNumber,
          tenantId,
          id: { not: id },
        },
      });

      if (existingPO) {
        throw new BadRequestException('Purchase order number already exists');
      }
    }

    const updatedPurchaseOrder = await this.prisma.purchase_orders.update({
      where: { id },
      data: {
        orderNumber: updatePurchaseOrderDto.orderNumber ?? undefined,
        supplierId: updatePurchaseOrderDto.supplierId ?? undefined,
        status: updatePurchaseOrderDto.status ?? undefined,
        orderDate: updatePurchaseOrderDto.orderDate ? new Date(updatePurchaseOrderDto.orderDate) : undefined,
        expectedDate: updatePurchaseOrderDto.expectedDate ? new Date(updatePurchaseOrderDto.expectedDate) : undefined,
        receivedDate: updatePurchaseOrderDto.receivedDate ? new Date(updatePurchaseOrderDto.receivedDate) : undefined,
        subtotal: updatePurchaseOrderDto.subtotal !== undefined ? new Prisma.Decimal(updatePurchaseOrderDto.subtotal) : undefined,
        taxAmount: updatePurchaseOrderDto.taxAmount !== undefined ? new Prisma.Decimal(updatePurchaseOrderDto.taxAmount) : undefined,
        totalAmount: updatePurchaseOrderDto.totalAmount !== undefined ? new Prisma.Decimal(updatePurchaseOrderDto.totalAmount) : undefined,
        currency: updatePurchaseOrderDto.currency ?? undefined,
        notes: updatePurchaseOrderDto.notes ?? undefined,
        approvedById: updatePurchaseOrderDto.approvedById ?? undefined,
        approvedAt: updatePurchaseOrderDto.approvedAt ? new Date(updatePurchaseOrderDto.approvedAt) : undefined,
        updatedAt: new Date(),
      },
    });

    return updatedPurchaseOrder as PurchaseOrderEntity;
  }

  async approve(tenantId: string, id: string, approvedById: string): Promise<PurchaseOrderEntity> {
    const purchaseOrder = await this.findOne(tenantId, id);

    if (purchaseOrder.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Purchase order is not pending approval');
    }

    const updatedPurchaseOrder = await this.prisma.purchase_orders.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return updatedPurchaseOrder as PurchaseOrderEntity;
  }

  async cancel(tenantId: string, id: string): Promise<PurchaseOrderEntity> {
    const purchaseOrder = await this.findOne(tenantId, id);

    if (['RECEIVED', 'CANCELLED'].includes(purchaseOrder.status)) {
      throw new BadRequestException('Cannot cancel purchase order in current status');
    }

    const updatedPurchaseOrder = await this.prisma.purchase_orders.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    return updatedPurchaseOrder as PurchaseOrderEntity;
  }

  async getPurchaseOrderStats(tenantId: string) {
    const [total, draft, pending, approved, sent, received, cancelled] = await Promise.all([
      this.prisma.purchase_orders.count({ where: { tenantId } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'DRAFT' } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'PENDING_APPROVAL' } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'APPROVED' } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'SENT' } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'RECEIVED' } }),
      this.prisma.purchase_orders.count({ where: { tenantId, status: 'CANCELLED' } }),
    ]);

    const totalValue = await this.prisma.purchase_orders.aggregate({
      where: { tenantId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });

    return {
      total,
      draft,
      pending,
      approved,
      sent,
      received,
      cancelled,
      totalValue: totalValue._sum.totalAmount || 0,
    };
  }
}
