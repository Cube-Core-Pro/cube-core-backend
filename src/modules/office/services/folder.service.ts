// path: backend/src/modules/office/services/folder.service.ts
// purpose: Enterprise folder and file organization service for office documents
// dependencies: @nestjs/common, prisma, redis, file-system

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';

export interface DocumentFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  depth: number;
  color?: string;
  icon?: string;
  isShared: boolean;
  permissions: FolderPermissions;
  metadata: FolderMetadata;
  children?: DocumentFolder[];
  documents?: DocumentReference[];
}

export interface DocumentReference {
  id: string;
  name: string;
  type: 'document' | 'spreadsheet' | 'presentation' | 'form' | 'other';
  size: number;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  isStarred: boolean;
  tags: string[];
}

export interface FolderPermissions {
  owner: string;
  canView: string[];
  canEdit: string[];
  canManage: string[];
  isPublic: boolean;
  inheritFromParent: boolean;
  customPermissions: CustomPermission[];
}

export interface CustomPermission {
  userId: string;
  role: 'viewer' | 'editor' | 'manager';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface FolderMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  documentCount: number;
  totalSize: number;
  lastActivityAt: Date;
  tags: string[];
  isArchived: boolean;
  archivedAt?: Date;
}

export interface FolderStats {
  totalFolders: number;
  totalDocuments: number;
  totalSize: number;
  recentActivity: Array<{
    type: 'created' | 'modified' | 'deleted' | 'moved';
    itemName: string;
    itemType: 'folder' | 'document';
    userId: string;
    timestamp: Date;
  }>;
  topFolders: Array<{
    folderId: string;
    name: string;
    documentCount: number;
    size: number;
  }>;
}

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createFolder(
    userId: string,
    tenantId: string,
    folderData: {
      name: string;
      description?: string;
      parentId?: string;
      color?: string;
      icon?: string;
      tags?: string[];
    }
  ): Promise<DocumentFolder> {
    try {
      // Validate folder name
      if (!folderData.name || folderData.name.trim().length === 0) {
        throw new BadRequestException('Folder name is required');
      }

      // Check for duplicate names in the same parent
      const existingFolder = await this.prisma.officeFolder.findFirst({
        where: {
          name: folderData.name,
          parentId: folderData.parentId || undefined,
          tenantId,
          deletedAt: null,
        },
      });

      if (existingFolder) {
        throw new ConflictException('Folder with this name already exists in this location');
      }

      // Get parent folder info if specified
      let parentPath = '/';
      let depth = 0;
      
      if (folderData.parentId) {
        const parentFolder = await this.getFolderById(folderData.parentId, userId, tenantId);
        if (!parentFolder) {
          throw new NotFoundException('Parent folder not found');
        }
        
        // Check if user can create folders in parent
        const canEdit = await this.checkPermission(folderData.parentId, userId, 'edit');
        if (!canEdit) {
          throw new BadRequestException('No permission to create folders in this location');
        }
        
        parentPath = parentFolder.path;
        depth = parentFolder.depth + 1;
      }

      const fullPath = parentPath === '/' ? `/${folderData.name}` : `${parentPath}/${folderData.name}`;

      const folder = await this.prisma.officeFolder.create({
        data: {
          name: folderData.name.trim(),
          description: folderData.description,
          parentId: folderData.parentId,
          path: fullPath,
          tenantId,
          createdBy: userId,
          // Note: OfficeFolder schema does not contain color/icon/isShared/permissions/metadata/depth.
          // We compute depth and other presentational fields in memory.
        },
      });

      // Update parent folder's document count if applicable
      if (folderData.parentId) {
        await this.updateFolderStats(folderData.parentId);
      }

      // Log activity
      await this.logActivity(tenantId, userId, 'created', 'folder', folder.name, folder.id);

      this.logger.log(`Folder created: ${folder.name} (${folder.id})`);
      return this.formatFolder(folder);
    } catch (error) {
      this.logger.error('Error creating folder', error);
      throw error;
    }
  }

  async getFolderById(
    folderId: string,
    userId: string,
    tenantId: string,
    includeChildren: boolean = false
  ): Promise<DocumentFolder | null> {
    try {
      const cacheKey = `folder:${folderId}:${includeChildren}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const folder = JSON.parse(cached);
        // Still check permissions
        const hasAccess = await this.checkPermission(folderId, userId, 'view');
        if (!hasAccess) {
          throw new BadRequestException('No permission to access this folder');
        }
        return folder;
      }

      const folder = await this.prisma.officeFolder.findFirst({
        where: { id: folderId, tenantId, deletedAt: null },
      });

      if (!folder) {
        return null;
      }

      // Check permissions
      const hasAccess = await this.checkPermission(folderId, userId, 'view');
      if (!hasAccess) {
        throw new BadRequestException('No permission to access this folder');
      }

  const formattedFolder = this.formatFolder(folder as any);

      if (includeChildren) {
        const [children, documents] = await Promise.all([
          this.getChildFolders(folderId, userId, tenantId),
          this.getFolderDocuments(folderId, userId, tenantId),
        ]);
        
        formattedFolder.children = children;
        formattedFolder.documents = documents;
      }

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(formattedFolder));

      return formattedFolder;
    } catch (error) {
      this.logger.error('Error getting folder', error);
      throw error;
    }
  }

  async updateFolder(
    folderId: string,
    userId: string,
    tenantId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
      tags?: string[];
    }
  ): Promise<DocumentFolder> {
    try {
      const existingFolder = await this.getFolderById(folderId, userId, tenantId);
      if (!existingFolder) {
        throw new NotFoundException('Folder not found');
      }

      // Check edit permission
      const canEdit = await this.checkPermission(folderId, userId, 'edit');
      if (!canEdit) {
        throw new BadRequestException('No permission to edit this folder');
      }

      // Check for name conflicts if name is being changed
      if (updates.name && updates.name !== existingFolder.name) {
        const duplicate = await this.prisma.officeFolder.findFirst({
          where: {
            name: updates.name,
            parentId: existingFolder.parentId,
            tenantId,
            deletedAt: null,
            id: { not: folderId },
          },
        });

        if (duplicate) {
          throw new ConflictException('Folder with this name already exists in this location');
        }
      }

      // Update path if name changed
      let newPath = existingFolder.path;
      if (updates.name && updates.name !== existingFolder.name) {
        const pathParts = existingFolder.path.split('/');
        pathParts[pathParts.length - 1] = updates.name;
        newPath = pathParts.join('/');
      }

      const updatedFolder = await this.prisma.officeFolder.update({
        where: { id: folderId },
        data: {
          name: updates.name ?? existingFolder.name,
          description: updates.description ?? existingFolder.description,
          path: newPath,
        },
      });

      // Update child paths if name changed
      if (updates.name && updates.name !== existingFolder.name) {
        await this.updateChildPaths(folderId, existingFolder.path, newPath);
      }

      // Clear cache
      await this.clearFolderCache(folderId);

      // Log activity
      await this.logActivity(tenantId, userId, 'modified', 'folder', updatedFolder.name, folderId);

      this.logger.log(`Folder updated: ${folderId}`);
      return this.formatFolder(updatedFolder);
    } catch (error) {
      this.logger.error('Error updating folder', error);
      throw error;
    }
  }

  async moveFolder(
    folderId: string,
    newParentId: string | null,
    userId: string,
    tenantId: string
  ): Promise<DocumentFolder> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Check permissions on source folder
      const canManage = await this.checkPermission(folderId, userId, 'manage');
      if (!canManage) {
        throw new BadRequestException('No permission to move this folder');
      }

      // Check permissions on destination
      if (newParentId) {
        const canEdit = await this.checkPermission(newParentId, userId, 'edit');
        if (!canEdit) {
          throw new BadRequestException('No permission to move folders to this location');
        }

        // Prevent moving to own child
        const isChild = await this.isChildFolder(newParentId, folderId);
        if (isChild) {
          throw new BadRequestException('Cannot move folder to its own child');
        }
      }

      // Get new path and depth
      let newPath = `/${folder.name}`;
      let newDepth = 0;
      
      if (newParentId) {
        const parentFolder = await this.getFolderById(newParentId, userId, tenantId);
        if (!parentFolder) {
          throw new NotFoundException('Parent folder not found');
        }
        newPath = `${parentFolder.path}/${folder.name}`;
        newDepth = parentFolder.depth + 1;
      }

      // Check for name conflicts in destination
      const duplicate = await this.prisma.officeFolder.findFirst({
        where: {
          name: folder.name,
          parentId: newParentId,
          tenantId,
          deletedAt: null,
          id: { not: folderId },
        },
      });

      if (duplicate) {
        throw new ConflictException('Folder with this name already exists in destination');
      }

      const oldPath = folder.path;
      const oldParentId = folder.parentId;

      // Update folder
      const updatedFolder = await this.prisma.officeFolder.update({
        where: { id: folderId },
        data: {
          parentId: newParentId,
          path: newPath,
        },
      });

      // Update child paths
      await this.updateChildPaths(folderId, oldPath, newPath);

      // Update stats for old and new parent folders
      if (oldParentId) {
        await this.updateFolderStats(oldParentId);
      }
      if (newParentId) {
        await this.updateFolderStats(newParentId);
      }

      // Clear caches
      await this.clearFolderCache(folderId);
      if (oldParentId) await this.clearFolderCache(oldParentId);
      if (newParentId) await this.clearFolderCache(newParentId);

      // Log activity
      await this.logActivity(tenantId, userId, 'moved', 'folder', folder.name, folderId);

      this.logger.log(`Folder moved: ${folderId} from ${oldPath} to ${newPath}`);
      return this.formatFolder(updatedFolder);
    } catch (error) {
      this.logger.error('Error moving folder', error);
      throw error;
    }
  }

  async deleteFolder(
    folderId: string,
    userId: string,
    tenantId: string,
    permanent: boolean = false
  ): Promise<void> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Check manage permission
      const canManage = await this.checkPermission(folderId, userId, 'manage');
      if (!canManage) {
        throw new BadRequestException('No permission to delete this folder');
      }

      if (permanent) {
        // Permanently delete folder and all contents
        await this.permanentlyDeleteFolder(folderId);
      } else {
        // Soft delete - mark as deleted
        await this.prisma.officeFolder.update({
          where: { id: folderId },
          data: {
            deletedAt: new Date(),
          },
        });
      }

      // Update parent folder stats
      if (folder.parentId) {
        await this.updateFolderStats(folder.parentId);
      }

      // Clear caches
      await this.clearFolderCache(folderId);
      if (folder.parentId) {
        await this.clearFolderCache(folder.parentId);
      }

      // Log activity
      await this.logActivity(tenantId, userId, 'deleted', 'folder', folder.name, folderId);

      this.logger.log(`Folder ${permanent ? 'permanently ' : ''}deleted: ${folderId}`);
    } catch (error) {
      this.logger.error('Error deleting folder', error);
      throw error;
    }
  }

  async getUserFolders(
    userId: string,
    tenantId: string,
    options: {
      parentId?: string;
      includeShared?: boolean;
      includeArchived?: boolean;
      search?: string;
      tags?: string[];
      sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'size';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const where: any = {
        tenantId,
        deletedAt: null,
        ...(options.parentId !== undefined && { parentId: options.parentId }),
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' as any } },
            { description: { contains: options.search, mode: 'insensitive' as any } },
          ],
        }),
      };

      if (!options.includeArchived) {
        where.archivedAt = null;
      }

      if (options.includeShared) {
        where.OR = [
          { userId },
          { permissions: { path: ['isPublic'], equals: true } },
        ];
      } else {
        where.userId = userId;
      }

      const orderBy = this.buildFolderOrderBy(options.sortBy, options.sortOrder);

      const [folders, total] = await Promise.all([
        this.prisma.officeFolder.findMany({
          where,
          orderBy,
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.officeFolder.count({ where }),
      ]);

      return {
        folders: folders.map(f => this.formatFolder(f)),
        total,
      };
    } catch (error) {
      this.logger.error('Error getting user folders', error);
      throw error;
    }
  }

  async shareFolder(
    folderId: string,
    userId: string,
    tenantId: string,
    shareData: {
      userIds: string[];
      role: 'viewer' | 'editor' | 'manager';
      expiresAt?: Date;
      message?: string;
    }
  ): Promise<void> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      // Check manage permission
      const canManage = await this.checkPermission(folderId, userId, 'manage');
      if (!canManage) {
        throw new BadRequestException('No permission to share this folder');
      }

      // NOTE: OfficeFolder does not have built-in sharing fields.
      // Implement folder sharing via a dedicated model in the future.
      // For now, this method only logs and notifies.

      // Send notifications (would integrate with notification service)
      await this.sendShareNotifications(shareData.userIds, folder, shareData.role, shareData.message);

      // Clear cache
      await this.clearFolderCache(folderId);

      this.logger.log(`Folder shared: ${folderId} with ${shareData.userIds.length} users`);
    } catch (error) {
      this.logger.error('Error sharing folder', error);
      throw error;
    }
  }

  async getFolderStats(
    userId: string,
    tenantId: string,
    folderId?: string
  ): Promise<FolderStats> {
    try {
      const baseWhere: any = {
        tenantId,
        deletedAt: null,
        ...(folderId && { id: folderId }),
      };

      const [totalFolders, totalDocuments, recentActivity, topFolders] = await Promise.all([
        this.prisma.officeFolder.count({ where: baseWhere }),
        this.getTotalDocumentsCount(tenantId, folderId),
        this.getRecentActivity(tenantId, userId),
        this.getTopFolders(tenantId, userId),
      ]);

      const totalSize = await this.getTotalSize(tenantId, folderId);

      return {
        totalFolders,
        totalDocuments,
        totalSize,
        recentActivity,
        topFolders,
      };
    } catch (error) {
      this.logger.error('Error getting folder stats', error);
      throw error;
    }
  }

  private formatFolder(folder: any): DocumentFolder {
    const depth = typeof folder.path === 'string' ? Math.max(folder.path.split('/').length - 1, 0) : 0;
    const defaultPermissions: FolderPermissions = {
      owner: folder.createdBy || 'unknown',
      canView: [folder.createdBy || 'unknown'],
      canEdit: [folder.createdBy || 'unknown'],
      canManage: [folder.createdBy || 'unknown'],
      isPublic: false,
      inheritFromParent: !!folder.parentId,
      customPermissions: [],
    };
    const defaultMetadata: FolderMetadata = {
      createdAt: folder.createdAt || new Date(),
      updatedAt: folder.updatedAt || new Date(),
      createdBy: folder.createdBy || 'unknown',
      lastModifiedBy: folder.createdBy || 'unknown',
      documentCount: 0,
      totalSize: 0,
      lastActivityAt: folder.updatedAt || new Date(),
      tags: [],
      isArchived: false,
    };
    return {
      id: folder.id,
      name: folder.name,
      description: folder.description,
      parentId: folder.parentId,
      path: folder.path,
      depth,
      color: '#3b82f6',
      icon: 'folder',
      isShared: false,
      permissions: defaultPermissions,
      metadata: defaultMetadata,
    };
  }

  private async checkPermission(
    folderId: string,
    userId: string,
    action: 'view' | 'edit' | 'manage'
  ): Promise<boolean> {
    try {
      const folder = await this.prisma.officeFolder.findFirst({
        where: { id: folderId },
        select: { id: true, createdBy: true },
      });

      if (!folder) return false;

      // Minimal permission model: creator has all permissions.
      if (folder.createdBy === userId) return true;

      // Otherwise, currently no folder-level sharing is supported.
      return false;
    } catch (error) {
      this.logger.error('Error checking permission', error);
      return false;
    }
  }

  private async getChildFolders(
    parentId: string,
    userId: string,
    tenantId: string
  ): Promise<DocumentFolder[]> {
    const folders = await this.prisma.officeFolder.findMany({
      where: {
        parentId,
        tenantId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });

    // Filter by permissions
    const accessibleFolders = [];
    for (const folder of folders) {
      const hasAccess = await this.checkPermission(folder.id, userId, 'view');
      if (hasAccess) {
        accessibleFolders.push(this.formatFolder(folder));
      }
    }

    return accessibleFolders;
  }

  private async getFolderDocuments(
    folderId: string,
    userId: string,
    tenantId: string
  ): Promise<DocumentReference[]> {
    // This would get actual documents in the folder
    // For now, return empty array
    return [];
  }

  private async isChildFolder(childId: string, parentId: string): Promise<boolean> {
    if (childId === parentId) return true;

    const child = await this.prisma.officeFolder.findFirst({
      where: { id: childId },
      select: { parentId: true },
    });

    if (!child || !child.parentId) return false;

    return this.isChildFolder(child.parentId, parentId);
  }

  private async updateChildPaths(folderId: string, oldPath: string, newPath: string): Promise<void> {
    try {
      const children = await this.prisma.officeFolder.findMany({
        where: {
          path: { startsWith: oldPath + '/' },
        },
      });

      for (const child of children) {
        const newChildPath = child.path.replace(oldPath, newPath);
        await this.prisma.officeFolder.update({
          where: { id: child.id },
          data: { path: newChildPath },
        });
      }
    } catch (error) {
      this.logger.warn('Failed to update child paths', error);
    }
  }

  private async updateFolderStats(folderId: string): Promise<void> {
    try {
      // Count documents and calculate size
      // This would be implemented with actual document queries
      const stats = { documentCount: 0, totalSize: 0 };

      await this.prisma.officeFolder.update({
        where: { id: folderId },
        data: {
          // No metadata field available; placeholder for future aggregation table
        },
      });
    } catch (error) {
      this.logger.warn('Failed to update folder stats', error);
    }
  }

  private async permanentlyDeleteFolder(folderId: string): Promise<void> {
    // Recursively delete all child folders and documents
    const children = await this.prisma.officeFolder.findMany({
      where: { parentId: folderId },
    });

    for (const child of children) {
      await this.permanentlyDeleteFolder(child.id);
    }

    // Delete the folder
    await this.prisma.officeFolder.delete({
      where: { id: folderId },
    });
  }

  private buildFolderOrderBy(sortBy?: string, sortOrder?: string): any {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'createdAt':
        return { createdAt: order } as any;
      case 'updatedAt':
        return { updatedAt: order } as any;
      case 'size':
        return { name: 'asc' } as any; // Placeholder: size not stored on OfficeFolder
      default:
        return { name: 'asc' };
    }
  }

  private async logActivity(
    tenantId: string,
    userId: string,
    type: string,
    itemType: string,
    itemName: string,
    itemId: string
  ): Promise<void> {
    try {
      const activity = {
        tenantId,
        userId,
        type,
        itemType,
        itemName,
        itemId,
        timestamp: new Date(),
      };

      await this.redis.lpush(`activity:${tenantId}`, JSON.stringify(activity));
      await this.redis.ltrim(`activity:${tenantId}`, 0, 100); // Keep only recent 100 activities
    } catch (error) {
      this.logger.warn('Failed to log activity', error);
    }
  }

  private async clearFolderCache(folderId: string): Promise<void> {
    const keys = [`folder:${folderId}:true`, `folder:${folderId}:false`];
    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  private async sendShareNotifications(
    userIds: string[],
    folder: DocumentFolder,
    role: string,
    message?: string
  ): Promise<void> {
    // This would integrate with the notification service
    this.logger.log(`Sharing notifications sent to ${userIds.length} users for folder ${folder.name}`);
  }

  private async getTotalDocumentsCount(tenantId: string, folderId?: string): Promise<number> {
    // This would count actual documents
    return 0;
  }

  private async getTotalSize(tenantId: string, folderId?: string): Promise<number> {
    // This would calculate total size of documents
    return 0;
  }

  private async getRecentActivity(tenantId: string, userId: string): Promise<any[]> {
    try {
      const activities = await this.redis.lrange(`activity:${tenantId}`, 0, 9);
      return activities.map(a => JSON.parse(a));
    } catch {
      return [];
    }
  }

  private async getTopFolders(tenantId: string, userId: string): Promise<any[]> {
    try {
      const folders = await this.prisma.officeFolder.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
        take: 5,
      });

      return folders.map(f => ({
        folderId: f.id,
        name: f.name,
        documentCount: 0,
        size: 0,
      }));
    } catch {
      return [];
    }
  }
}