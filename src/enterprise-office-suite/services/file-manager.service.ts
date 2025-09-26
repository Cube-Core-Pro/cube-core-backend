// path: backend/src/enterprise-office-suite/services/file-manager.service.ts
// purpose: File and folder management service with advanced organization
// dependencies: Prisma, Redis, File Storage, Search Engine, Metadata Extraction

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createFolder(tenantId: string, userId: string, data: {
    name: string;
    parentId?: string;
    description?: string;
    color?: string;
    tags?: string[];
  }) {
    try {
      // Validate parent folder if provided
      let parentPath = '/';
      if (data.parentId) {
        const parent = await this.prisma.officeFolder.findFirst({
          where: { id: data.parentId, tenantId },
        });
        
        if (!parent) {
          throw new NotFoundException('Parent folder not found');
        }
        
        parentPath = `${parent.path}${parent.name}/`;
      }

      // Check for duplicate names in the same parent
      const existing = await this.prisma.officeFolder.findFirst({
        where: {
          tenantId,
          parentId: data.parentId,
          name: data.name,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new BadRequestException('Folder with this name already exists');
      }

      const folder = await this.prisma.officeFolder.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description,
          parentId: data.parentId,
          path: parentPath,
          createdBy: userId,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { children: true, documents: true },
          },
        },
      });

      // Log activity
      await this.logActivity(userId, 'folder_created', {
        folderId: folder.id,
        folderName: folder.name,
        parentId: data.parentId,
      });

      // Emit event
      this.eventEmitter.emit('office.folder.created', {
        tenantId,
        userId,
        folder,
      });

      return folder;
    } catch (error) {
      this.logger.error('Error creating folder:', error);
      throw error;
    }
  }

  async updateFolder(folderId: string, userId: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    tags?: string[];
  }) {
    try {
      // Check if folder exists and user has permission
      const folder = await this.prisma.officeFolder.findFirst({
        where: {
          id: folderId,
          createdBy: userId, // Only creator can update
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found or insufficient permissions');
      }

      // Check for duplicate names if name is being updated
      if (updates.name && updates.name !== folder.name) {
        const existing = await this.prisma.officeFolder.findFirst({
          where: {
            tenantId: folder.tenantId,
            parentId: folder.parentId,
            name: updates.name,
            deletedAt: null,
            id: { not: folderId },
          },
        });

        if (existing) {
          throw new BadRequestException('Folder with this name already exists');
        }
      }

      const updatedFolder = await this.prisma.officeFolder.update({
        where: { id: folderId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          parent: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { children: true, documents: true },
          },
        },
      });

      // Update paths of child folders if name changed
      if (updates.name && updates.name !== folder.name) {
        await this.updateChildPaths(folderId, updatedFolder.path + updatedFolder.name + '/');
      }

      // Log activity
      await this.logActivity(userId, 'folder_updated', {
        folderId,
        changes: Object.keys(updates),
      });

      return updatedFolder;
    } catch (error) {
      this.logger.error('Error updating folder:', error);
      throw error;
    }
  }

  async deleteFolder(folderId: string, userId: string, permanent: boolean = false) {
    try {
      // Check if folder exists and user has permission
      const folder = await this.prisma.officeFolder.findFirst({
        where: {
          id: folderId,
          createdBy: userId,
        },
        include: {
          _count: {
            select: { children: true, documents: true },
          },
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found or insufficient permissions');
      }

      if (permanent) {
        // Permanent deletion
        await this.permanentlyDeleteFolder(folderId);
      } else {
        // Soft delete
        await this.prisma.officeFolder.update({
          where: { id: folderId },
          data: {
            deletedAt: new Date(),
          },
        });

        // Soft delete all contents
        await this.softDeleteFolderContents(folderId, userId);
      }

      // Log activity
      await this.logActivity(userId, permanent ? 'folder_permanently_deleted' : 'folder_deleted', {
        folderId,
        folderName: folder.name,
        permanent,
      });

      return { success: true, message: permanent ? 'Folder permanently deleted' : 'Folder moved to trash' };
    } catch (error) {
      this.logger.error('Error deleting folder:', error);
      throw error;
    }
  }

  async moveFolder(folderId: string, userId: string, newParentId?: string) {
    try {
      // Check if folder exists and user has permission
      const folder = await this.prisma.officeFolder.findFirst({
        where: {
          id: folderId,
          createdBy: userId,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found or insufficient permissions');
      }

      // Validate new parent
      let newPath = '/';
      if (newParentId) {
        const newParent = await this.prisma.officeFolder.findFirst({
          where: { id: newParentId, tenantId: folder.tenantId },
        });

        if (!newParent) {
          throw new NotFoundException('Target folder not found');
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(folderId, newParentId)) {
          throw new BadRequestException('Cannot move folder into its own subfolder');
        }

        newPath = `${newParent.path}${newParent.name}/`;
      }

      // Check for duplicate names in new location
      const existing = await this.prisma.officeFolder.findFirst({
        where: {
          tenantId: folder.tenantId,
          parentId: newParentId,
          name: folder.name,
          deletedAt: null,
          id: { not: folderId },
        },
      });

      if (existing) {
        throw new BadRequestException('Folder with this name already exists in target location');
      }

      // Update folder
      const updatedFolder = await this.prisma.officeFolder.update({
        where: { id: folderId },
        data: {
          parentId: newParentId,
          path: newPath,
          updatedAt: new Date(),
        },
      });

      // Update paths of all child folders
      await this.updateChildPaths(folderId, newPath + folder.name + '/');

      // Log activity
      await this.logActivity(userId, 'folder_moved', {
        folderId,
        folderName: folder.name,
        oldParentId: folder.parentId,
        newParentId,
      });

      return updatedFolder;
    } catch (error) {
      this.logger.error('Error moving folder:', error);
      throw error;
    }
  }

  async copyFolder(folderId: string, userId: string, newParentId?: string, newName?: string) {
    try {
      // Check if folder exists and user has access
      const folder = await this.prisma.officeFolder.findFirst({
        where: { id: folderId },
        include: {
          children: true,
          documents: true,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Validate new parent
      let newPath = '/';
      if (newParentId) {
        const newParent = await this.prisma.officeFolder.findFirst({
          where: { id: newParentId, tenantId: folder.tenantId },
        });

        if (!newParent) {
          throw new NotFoundException('Target folder not found');
        }

        newPath = `${newParent.path}${newParent.name}/`;
      }

      const copyName = newName || `${folder.name} (Copy)`;

      // Create copy of folder
      const copiedFolder = await this.prisma.officeFolder.create({
        data: {
          tenantId: folder.tenantId,
          name: copyName,
          description: folder.description,
          parentId: newParentId,
          path: newPath,
          createdBy: userId,
        },
      });

      // Copy all child folders and documents recursively
      await this.copyFolderContents(folder, copiedFolder.id, userId);

      // Log activity
      await this.logActivity(userId, 'folder_copied', {
        originalFolderId: folderId,
        copiedFolderId: copiedFolder.id,
        folderName: copyName,
      });

      return copiedFolder;
    } catch (error) {
      this.logger.error('Error copying folder:', error);
      throw error;
    }
  }

  async getFolderContents(folderId: string, tenantId: string, userId: string, options?: {
    sortBy?: 'name' | 'created' | 'updated' | 'size' | 'type';
    sortOrder?: 'asc' | 'desc';
    filter?: {
      type?: string;
      tags?: string[];
      dateRange?: { from: Date; to: Date };
    };
    includeDeleted?: boolean;
  }) {
    try {
      const sortBy = options?.sortBy || 'name';
      const sortOrder = options?.sortOrder || 'asc';

      // Build where clause for folders
      const folderWhere: any = {
        tenantId,
        parentId: folderId,
        isDeleted: options?.includeDeleted ? undefined : false,
      };

      // Build where clause for documents
      const documentWhere: any = {
        tenantId,
        folderId,
        isDeleted: options?.includeDeleted ? undefined : false,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
        ],
      };

      // Apply filters
      if (options?.filter) {
        if (options.filter.type) {
          documentWhere.type = options.filter.type;
        }

        if (options.filter.tags && options.filter.tags.length > 0) {
          folderWhere.tags = { hasSome: options.filter.tags };
          documentWhere.tags = { hasSome: options.filter.tags };
        }

        if (options.filter.dateRange) {
          const dateFilter = {
            gte: options.filter.dateRange.from,
            lte: options.filter.dateRange.to,
          };
          folderWhere.createdAt = dateFilter;
          documentWhere.createdAt = dateFilter;
        }
      }

      // Build order by clause
      const orderBy: any = {};
      switch (sortBy) {
        case 'name':
          orderBy.name = sortOrder;
          break;
        case 'created':
          orderBy.createdAt = sortOrder;
          break;
        case 'updated':
          orderBy.updatedAt = sortOrder;
          break;
        case 'size':
          orderBy.size = sortOrder;
          break;
        case 'type':
          orderBy.type = sortOrder;
          break;
      }

      const [folders, documents] = await Promise.all([
        this.prisma.officeFolder.findMany({
          where: folderWhere,
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            _count: {
              select: { children: true, documents: true },
            },
          },
          orderBy: sortBy === 'size' ? { name: sortOrder } : orderBy, // Folders don't have size
        }),
        this.prisma.officeDocument.findMany({
          where: documentWhere,
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            _count: {
              select: { collaborators: true, comments: true, versions: true },
            },
          },
          orderBy,
        }),
      ]);

      return { folders, documents };
    } catch (error) {
      this.logger.error('Error getting folder contents:', error);
      throw error;
    }
  }

  async getFolderPath(folderId: string) {
    try {
      const folder = await this.prisma.officeFolder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Build breadcrumb path
      const pathParts = folder.path.split('/').filter(part => part);
      const breadcrumbs = [];

      // Add root
      breadcrumbs.push({ id: null, name: 'Root', path: '/' });

      // Add each path part
      let currentPath = '/';
      for (const part of pathParts) {
        currentPath += part + '/';
        const pathFolder = await this.prisma.officeFolder.findFirst({
          where: { path: currentPath, name: part },
        });

        if (pathFolder) {
          breadcrumbs.push({
            id: pathFolder.id,
            name: pathFolder.name,
            path: currentPath,
          });
        }
      }

      // Add current folder
      breadcrumbs.push({
        id: folder.id,
        name: folder.name,
        path: folder.path + folder.name + '/',
      });

      return breadcrumbs;
    } catch (error) {
      this.logger.error('Error getting folder path:', error);
      throw error;
    }
  }

  async searchFiles(tenantId: string, userId: string, query: string, options?: {
    folderId?: string;
    type?: string;
    tags?: string[];
    dateRange?: { from: Date; to: Date };
    limit?: number;
  }) {
    try {
      const limit = options?.limit || 50;

      // Build where clause
      const where: any = {
        tenantId,
        isDeleted: false,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
        ],
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { tags: { hasSome: [query] } },
            ],
          },
        ],
      };

      // Apply filters
      if (options?.folderId) {
        where.folderId = options.folderId;
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.tags && options.tags.length > 0) {
        where.tags = { hasSome: options.tags };
      }

      if (options?.dateRange) {
        where.createdAt = {
          gte: options.dateRange.from,
          lte: options.dateRange.to,
        };
      }

      const documents = await this.prisma.officeDocument.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { collaborators: true, comments: true, versions: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return documents;
    } catch (error) {
      this.logger.error('Error searching files:', error);
      throw error;
    }
  }

  async getRecentFiles(tenantId: string, userId: string, limit: number = 20) {
    try {
      const documents = await this.prisma.officeDocument.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { createdBy: userId },
            { collaborators: { some: { userId } } },
          ],
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          folder: {
            select: { id: true, name: true, path: true },
          },
          _count: {
            select: { collaborators: true, comments: true, versions: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return documents;
    } catch (error) {
      this.logger.error('Error getting recent files:', error);
      throw error;
    }
  }

  async getStarredFiles(_tenantId: string, _userId: string) {
    try {
      // TODO: Implement starred files functionality when DocumentStar model is added
      return [];
    } catch (error) {
      this.logger.error('Error getting starred files:', error);
      throw error;
    }
  }

  async starFile(_documentId: string, _userId: string) {
    try {
      // TODO: Implement starred files functionality when DocumentStar model is added
      return { success: true };
    } catch (error) {
      this.logger.error('Error starring file:', error);
      throw error;
    }
  }

  async unstarFile(_documentId: string, _userId: string) {
    try {
      // TODO: Implement starred files functionality when DocumentStar model is added
      return { success: true };
    } catch (error) {
      this.logger.error('Error unstarring file:', error);
      throw error;
    }
  }

  async getTrash(tenantId: string, userId: string) {
    try {
      const [folders, documents] = await Promise.all([
        this.prisma.officeFolder.findMany({
          where: {
            tenantId,
            createdBy: userId,
            deletedAt: { not: null },
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { deletedAt: 'desc' },
        }),
        this.prisma.officeDocument.findMany({
          where: {
            tenantId,
            createdBy: userId,
            deletedAt: { not: null },
          },
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            folder: {
              select: { id: true, name: true, path: true },
            },
          },
          orderBy: { deletedAt: 'desc' },
        }),
      ]);

      return { folders, documents };
    } catch (error) {
      this.logger.error('Error getting trash:', error);
      throw error;
    }
  }

  async restoreFromTrash(itemId: string, itemType: 'folder' | 'document', userId: string) {
    try {
      if (itemType === 'folder') {
        await this.prisma.officeFolder.update({
          where: { id: itemId, createdBy: userId },
          data: {
            deletedAt: null,
          },
        });
      } else {
        await this.prisma.officeDocument.update({
          where: { id: itemId, createdBy: userId },
          data: {
            deletedAt: null,
          },
        });
      }

      // Log activity
      await this.logActivity(userId, `${itemType}_restored`, {
        itemId,
        itemType,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error restoring from trash:', error);
      throw error;
    }
  }

  async emptyTrash(tenantId: string, userId: string) {
    try {
      // Permanently delete all items in trash
      await Promise.all([
        this.prisma.officeFolder.deleteMany({
          where: {
            tenantId,
            createdBy: userId,
            deletedAt: { not: null },
          },
        }),
        this.prisma.officeDocument.deleteMany({
          where: {
            tenantId,
            createdBy: userId,
            deletedAt: { not: null },
          },
        }),
      ]);

      // Log activity
      await this.logActivity(userId, 'trash_emptied', {
        tenantId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error emptying trash:', error);
      throw error;
    }
  }

  // Private helper methods
  private async updateChildPaths(folderId: string, newBasePath: string) {
    const children = await this.prisma.officeFolder.findMany({
      where: { parentId: folderId },
    });

    for (const child of children) {
      const newPath = newBasePath;
      await this.prisma.officeFolder.update({
        where: { id: child.id },
        data: { path: newPath },
      });

      // Recursively update grandchildren
      await this.updateChildPaths(child.id, newPath + child.name + '/');
    }
  }

  private async wouldCreateCircularReference(folderId: string, newParentId: string): Promise<boolean> {
    let currentParentId = newParentId;

    while (currentParentId) {
      if (currentParentId === folderId) {
        return true;
      }

      const parent = await this.prisma.officeFolder.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId || null;
    }

    return false;
  }

  private async softDeleteFolderContents(folderId: string, userId: string) {
    // Soft delete all child folders
    const childFolders = await this.prisma.officeFolder.findMany({
      where: { parentId: folderId },
    });

    for (const child of childFolders) {
      await this.prisma.officeFolder.update({
        where: { id: child.id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Recursively delete contents
      await this.softDeleteFolderContents(child.id, userId);
    }

    // Soft delete all documents in folder
    await this.prisma.officeDocument.updateMany({
      where: { folderId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private async permanentlyDeleteFolder(folderId: string) {
    // Delete all child folders recursively
    const childFolders = await this.prisma.officeFolder.findMany({
      where: { parentId: folderId },
    });

    for (const child of childFolders) {
      await this.permanentlyDeleteFolder(child.id);
    }

    // Delete all documents in folder
    await this.prisma.officeDocument.deleteMany({
      where: { folderId },
    });

    // Delete the folder itself
    await this.prisma.officeFolder.delete({
      where: { id: folderId },
    });
  }

  private async copyFolderContents(originalFolder: any, newFolderId: string, userId: string) {
    // Copy child folders
    for (const child of originalFolder.children) {
      const copiedChild = await this.prisma.officeFolder.create({
        data: {
          tenantId: child.tenantId,
          name: child.name,
          description: child.description,
          parentId: newFolderId,
          path: `${originalFolder.path}${originalFolder.name}/`,
          createdBy: userId,
        },
      });

      // Recursively copy contents
      const childWithContents = await this.prisma.officeFolder.findUnique({
        where: { id: child.id },
        include: { children: true, documents: true },
      });

      if (childWithContents) {
        await this.copyFolderContents(childWithContents, copiedChild.id, userId);
      }
    }

    // Copy documents
    for (const document of originalFolder.documents) {
      await this.prisma.officeDocument.create({
        data: {
          tenantId: document.tenantId,
          title: `${document.title} (Copy)`,
          type: document.type,
          format: document.format,
          content: document.content,
          folderId: newFolderId,
          size: document.size,
          checksum: document.checksum,
          tags: document.tags,
          createdBy: userId,
        },
      });
    }
  }

  private async logActivity(userId: string, action: string, metadata?: any) {
    try {
      // TODO: Implement activity logging when UserActivity model is added
      this.logger.log(`Activity: ${action} by user ${userId}`, metadata);
    } catch (error) {
      this.logger.warn('Failed to log activity:', error);
    }
  }
}