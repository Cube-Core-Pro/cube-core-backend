// path: backend/src/office/services/folder.service.ts
// purpose: Folder management helpers for Office Suite
// dependencies: Prisma

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface FolderFilters {
  parentId?: string | null;
  search?: string;
}

@Injectable()
export class FolderService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, userId: string, filters: FolderFilters = {}) {
    const { parentId = null, search } = filters;

    const where: any = {
      tenantId,
      deletedAt: null,
      parentId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const folders = await this.prisma.officeFolder.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            children: true,
            documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return folders;
  }

  async create(tenantId: string, userId: string, name: string, description?: string, parentId?: string) {
    let parentPath = '';

    if (parentId) {
      const parent = await this.prisma.officeFolder.findFirst({
        where: { id: parentId, tenantId, deletedAt: null },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      parentPath = parent.path || '';
    }

    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;

    return this.prisma.officeFolder.create({
      data: {
        name,
        description,
        path,
        parentId: parentId ?? null,
        tenantId,
        createdBy: userId,
      },
    });
  }

  async remove(tenantId: string, userId: string, folderId: string) {
    const folder = await this.prisma.officeFolder.findFirst({
      where: { id: folderId, tenantId, deletedAt: null },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.createdBy !== userId) {
      throw new ForbiddenException('Insufficient permissions to delete folder');
    }

    const [documentsCount, subfoldersCount] = await Promise.all([
      this.prisma.officeDocument.count({ where: { folderId, tenantId, deletedAt: null } }),
      this.prisma.officeFolder.count({ where: { parentId: folderId, tenantId, deletedAt: null } }),
    ]);

    if (documentsCount > 0 || subfoldersCount > 0) {
      throw new ForbiddenException('Cannot delete folder with contents');
    }

    await this.prisma.officeFolder.update({
      where: { id: folderId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Folder deleted successfully' };
  }
}
