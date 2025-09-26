// path: src/pos/services/pos-product.service.ts
// purpose: POS Product service with CRUD operations and inventory management
// dependencies: @nestjs/common, PrismaService, DTOs

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../dto';
import { PosProduct, PosProductWithRelations } from '../entities';

@Injectable()
export class PosProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createProductDto: CreateProductDto): Promise<PosProduct> {
    try {
      // Check if SKU already exists
      const existingProduct = await this.prisma.posProduct.findFirst({
        where: {
          sku: createProductDto.sku,
          tenantId,
        },
      });

      if (existingProduct) {
        throw new ConflictException(`Product with SKU ${createProductDto.sku} already exists`);
      }

      // Check if barcode already exists (if provided)
      if (createProductDto.barcode) {
        const existingBarcode = await this.prisma.posProduct.findFirst({
          where: {
            barcode: createProductDto.barcode,
            tenantId,
          },
        });

        if (existingBarcode) {
          throw new ConflictException(`Product with barcode ${createProductDto.barcode} already exists`);
        }
      }

      return await this.prisma.posProduct.create({
        data: {
          ...createProductDto,
          tenantId,
        },
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create product');
    }
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      isActive?: boolean;
    } = {}
  ): Promise<{ data: PosProduct[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, search, category, isActive } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.prisma.posProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.posProduct.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, id: string): Promise<PosProductWithRelations> {
    const product = await this.prisma.posProduct.findFirst({
      where: { id, tenantId },
      include: {
        transactionItems: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        inventoryMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async findBySku(tenantId: string, sku: string): Promise<PosProduct> {
    const product = await this.prisma.posProduct.findFirst({
      where: { sku, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return product;
  }

  async findByBarcode(tenantId: string, barcode: string): Promise<PosProduct> {
    const product = await this.prisma.posProduct.findFirst({
      where: { barcode, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with barcode ${barcode} not found`);
    }

    return product;
  }

  async update(tenantId: string, id: string, updateProductDto: UpdateProductDto): Promise<PosProduct> {
    const existingProduct = await this.prisma.posProduct.findFirst({
      where: { id, tenantId },
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check SKU uniqueness if being updated
    if (updateProductDto.sku && updateProductDto.sku !== existingProduct.sku) {
      const skuExists = await this.prisma.posProduct.findFirst({
        where: {
          sku: updateProductDto.sku,
          tenantId,
          id: { not: id },
        },
      });

      if (skuExists) {
        throw new ConflictException(`Product with SKU ${updateProductDto.sku} already exists`);
      }
    }

    // Check barcode uniqueness if being updated
    if (updateProductDto.barcode && updateProductDto.barcode !== existingProduct.barcode) {
      const barcodeExists = await this.prisma.posProduct.findFirst({
        where: {
          barcode: updateProductDto.barcode,
          tenantId,
          id: { not: id },
        },
      });

      if (barcodeExists) {
        throw new ConflictException(`Product with barcode ${updateProductDto.barcode} already exists`);
      }
    }

    return await this.prisma.posProduct.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.prisma.posProduct.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Check if product has transaction items
    const hasTransactions = await this.prisma.posTransactionItem.findFirst({
      where: { productId: id },
    });

    if (hasTransactions) {
      throw new ConflictException('Cannot delete product with existing transactions');
    }

    await this.prisma.posProduct.delete({
      where: { id },
    });
  }

  async updateStock(
    tenantId: string,
    productId: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason?: string,
    userId?: string,
    reference?: string
  ): Promise<PosProduct> {
    return await this.prisma.$transaction(async (tx) => {
      const product = await tx.posProduct.findFirst({
        where: { id: productId, tenantId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      let newStockLevel = product.stockLevel;

      switch (type) {
        case 'IN':
          newStockLevel += quantity;
          break;
        case 'OUT':
          newStockLevel -= quantity;
          if (newStockLevel < 0) {
            throw new BadRequestException('Insufficient stock');
          }
          break;
        case 'ADJUSTMENT':
          newStockLevel = quantity;
          break;
      }

      // Update product stock
      const updatedProduct = await tx.posProduct.update({
        where: { id: productId },
        data: { stockLevel: newStockLevel },
      });

      // Create inventory movement record
      if (userId) {
        await tx.posInventoryMovement.create({
          data: {
            productId,
            type,
            quantity: type === 'ADJUSTMENT' ? quantity - product.stockLevel : quantity,
            reason,
            reference,
            userId,
            tenantId,
          },
        });
      }

      return updatedProduct;
    });
  }

  async getLowStockProducts(tenantId: string): Promise<PosProduct[]> {
    return await this.prisma.posProduct.findMany({
      where: {
        tenantId,
        isActive: true,
        stockLevel: {
          lte: this.prisma.posProduct.fields.minStock,
        },
      },
      orderBy: { stockLevel: 'asc' },
    });
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const categories = await this.prisma.posProduct.findMany({
      where: { tenantId, isActive: true },
      select: { category: true },
      distinct: ['category'],
    });

    return categories
      .map(c => c.category)
      .filter(Boolean)
      .sort();
  }
}