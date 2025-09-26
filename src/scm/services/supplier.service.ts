// path: src/scm/services/supplier.service.ts
// purpose: Supplier management service
// dependencies: @nestjs/common, prisma

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { SupplierEntity, SupplierWithRelations } from '../entities/supplier.entity';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createSupplierDto: CreateSupplierDto): Promise<SupplierEntity> {
    // Check if supplier code already exists
    const existingSupplier = await this.prisma.suppliers.findFirst({
      where: {
        code: createSupplierDto.code,
        tenantId,
      },
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier code already exists');
    }

    const supplier = await this.prisma.suppliers.create({
      data: {
        id: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        code: createSupplierDto.code,
        name: createSupplierDto.name,
        contactPerson: createSupplierDto.contactPerson,
        email: createSupplierDto.email,
        phone: createSupplierDto.phone,
        address: createSupplierDto.address,
        taxId: createSupplierDto.taxId,
        paymentTerms: createSupplierDto.paymentTerms,
        currency: createSupplierDto.currency,
        status: createSupplierDto.status || 'ACTIVE',
        rating: createSupplierDto.rating,
        certifications: createSupplierDto.certifications || [],
        notes: createSupplierDto.notes,
        updatedAt: new Date(),
      },
    });

    return supplier as SupplierEntity;
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      category?: string;
    } = {}
  ) {
    const { page = 1, limit = 20, search, status, category: _category } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.suppliers.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          purchase_orders: {
            select: { id: true, orderNumber: true, totalAmount: true, status: true, currency: true },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.suppliers.count({ where }),
    ]);

    return {
      data: suppliers as SupplierWithRelations[],
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<SupplierWithRelations> {
    const supplier = await this.prisma.suppliers.findFirst({
      where: { id, tenantId },
      include: {
        purchase_orders: {
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            totalAmount: true,
            status: true,
            currency: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier as SupplierWithRelations;
  }

  async update(tenantId: string, id: string, updateSupplierDto: UpdateSupplierDto): Promise<SupplierEntity> {
    const supplier = await this.findOne(tenantId, id);

    // Check if supplier code is being changed and already exists
    if (updateSupplierDto.code && updateSupplierDto.code !== supplier.code) {
      const existingSupplier = await this.prisma.suppliers.findFirst({
        where: {
          code: updateSupplierDto.code,
          tenantId,
          id: { not: id },
        },
      });

      if (existingSupplier) {
        throw new ConflictException('Supplier code already exists');
      }
    }

    const updatedSupplier = await this.prisma.suppliers.update({
      where: { id },
      data: {
        ...updateSupplierDto,
        certifications: updateSupplierDto.certifications ?? undefined,
        updatedAt: new Date(),
      },
    });

    return updatedSupplier as SupplierEntity;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const _supplier = await this.findOne(tenantId, id);

    // Check if supplier has dependent records
    const purchaseOrders = await this.prisma.purchase_orders.findFirst({
      where: { supplierId: id },
    });

    if (purchaseOrders) {
      throw new ConflictException('Cannot delete supplier with existing purchase orders');
    }

    await this.prisma.suppliers.delete({ where: { id } });
  }

  async getSupplierStats(tenantId: string) {
    const [total, active, inactive, suspended, topSuppliers] = await Promise.all([
      this.prisma.suppliers.count({ where: { tenantId } }),
      this.prisma.suppliers.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.suppliers.count({ where: { tenantId, status: 'INACTIVE' } }),
      this.prisma.suppliers.count({ where: { tenantId, status: 'SUSPENDED' } }),
      this.prisma.suppliers.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          rating: true,
          purchase_orders: {
            select: { totalAmount: true },
          },
        },
        take: 10,
      }),
    ]);

    const suppliersWithTotals = topSuppliers
      .map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        code: supplier.code,
        totalPurchases: supplier.purchase_orders.reduce(
          (sum, po) => sum + Number(po.totalAmount ?? 0),
          0,
        ),
      }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 5);

    return {
      total,
      active,
      inactive,
      suspended,
      topSuppliers: suppliersWithTotals.map(({ id, name, totalPurchases }) => ({
        id,
        name,
        totalPurchases,
      })),
    };
  }
}
