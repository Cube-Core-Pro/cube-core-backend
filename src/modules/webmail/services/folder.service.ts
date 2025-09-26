// path: backend/src/modules/webmail/services/folder.service.ts
// purpose: Email folder management service with hierarchical organization
// dependencies: NestJS, Prisma, folder validation

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailFolder } from '../webmail.service';
import { CreateFolderDto } from '../dto/webmail.dto';

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFolder(
    userId: string, 
    tenantId: string, 
    createFolderDto: CreateFolderDto
  ): Promise<EmailFolder> {
    try {
      const { name, parentId } = createFolderDto;

      // Validate folder name
      if (!name || name.trim().length === 0) {
        throw new BadRequestException('Folder name is required');
      }

      if (name.length > 100) {
        throw new BadRequestException('Folder name is too long');
      }

      // Check for reserved folder names
      const reservedNames = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'outbox'];
      if (reservedNames.includes(name.toLowerCase())) {
        throw new BadRequestException('Cannot use reserved folder name');
      }

      // Validate parent folder exists if specified
      if (parentId) {
        const parentExists = await this.folderExists(parentId, userId, tenantId);
        if (!parentExists) {
          throw new NotFoundException('Parent folder not found');
        }
      }

      // Check for duplicate folder names in the same parent
      const existingFolder = await this.findFolderByName(name, parentId, userId, tenantId);
      if (existingFolder) {
        throw new BadRequestException('Folder with this name already exists');
      }

      // TODO: Create folder in database when folder model is added
      const newFolder: EmailFolder = {
        id: `folder_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        type: 'custom',
        parentId,
        messageCount: 0,
        unreadCount: 0,
        tenantId,
        userId,
      };

      this.logger.log(`Created folder: ${newFolder.name} (${newFolder.id})`);
      return newFolder;
    } catch (error) {
      this.logger.error('Failed to create folder:', error);
      throw error;
    }
  }

  async getFolders(userId: string, tenantId: string): Promise<EmailFolder[]> {
    try {
      // TODO: Query database when folder model is added
      const systemFolders: EmailFolder[] = [
        {
          id: 'inbox',
          name: 'Inbox',
          type: 'inbox',
          messageCount: 15,
          unreadCount: 5,
          tenantId,
          userId,
        },
        {
          id: 'sent',
          name: 'Sent',
          type: 'sent',
          messageCount: 25,
          unreadCount: 0,
          tenantId,
          userId,
        },
        {
          id: 'drafts',
          name: 'Drafts',
          type: 'drafts',
          messageCount: 3,
          unreadCount: 0,
          tenantId,
          userId,
        },
        {
          id: 'trash',
          name: 'Trash',
          type: 'trash',
          messageCount: 8,
          unreadCount: 0,
          tenantId,
          userId,
        },
        {
          id: 'spam',
          name: 'Spam',
          type: 'spam',
          messageCount: 2,
          unreadCount: 0,
          tenantId,
          userId,
        },
      ];

      return systemFolders;
    } catch (error) {
      this.logger.error('Failed to get folders:', error);
      throw error;
    }
  }

  async getFolderById(folderId: string, userId: string, tenantId: string): Promise<EmailFolder> {
    try {
      // TODO: Query database when folder model is added
      const folders = await this.getFolders(userId, tenantId);
      const folder = folders.find(f => f.id === folderId);
      
      if (!folder) {
        throw new NotFoundException('Folder not found');
      }

      return folder;
    } catch (error) {
      this.logger.error('Failed to get folder by ID:', error);
      throw error;
    }
  }

  async updateFolder(
    folderId: string, 
    userId: string, 
    tenantId: string, 
    updateData: { name?: string; parentId?: string }
  ): Promise<EmailFolder> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);

      // Prevent updating system folders
      if (folder.type !== 'custom') {
        throw new BadRequestException('Cannot modify system folders');
      }

      // Validate new name if provided
      if (updateData.name) {
        if (updateData.name.trim().length === 0) {
          throw new BadRequestException('Folder name cannot be empty');
        }

        if (updateData.name.length > 100) {
          throw new BadRequestException('Folder name is too long');
        }

        // Check for reserved names
        const reservedNames = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'outbox'];
        if (reservedNames.includes(updateData.name.toLowerCase())) {
          throw new BadRequestException('Cannot use reserved folder name');
        }
      }

      // Validate new parent if provided
      if (updateData.parentId) {
        const parentExists = await this.folderExists(updateData.parentId, userId, tenantId);
        if (!parentExists) {
          throw new NotFoundException('Parent folder not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(folderId, updateData.parentId, userId, tenantId)) {
          throw new BadRequestException('Cannot move folder: would create circular reference');
        }
      }

      // TODO: Update folder in database when folder model is added
      const updatedFolder: EmailFolder = {
        ...folder,
        ...(updateData.name && { name: updateData.name.trim() }),
        ...(updateData.parentId !== undefined && { parentId: updateData.parentId }),
      };

      this.logger.log(`Updated folder: ${folderId}`);
      return updatedFolder;
    } catch (error) {
      this.logger.error('Failed to update folder:', error);
      throw error;
    }
  }

  async deleteFolder(folderId: string, userId: string, tenantId: string): Promise<void> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);

      // Prevent deleting system folders
      if (folder.type !== 'custom') {
        throw new BadRequestException('Cannot delete system folders');
      }

      // Check if folder has messages
      if (folder.messageCount > 0) {
        throw new BadRequestException('Cannot delete folder with messages. Move or delete messages first.');
      }

      // Check if folder has subfolders
      const hasSubfolders = await this.hasSubfolders(folderId, userId, tenantId);
      if (hasSubfolders) {
        throw new BadRequestException('Cannot delete folder with subfolders. Delete subfolders first.');
      }

      // TODO: Delete folder from database when folder model is added
      this.logger.log(`Deleted folder: ${folderId}`);
    } catch (error) {
      this.logger.error('Failed to delete folder:', error);
      throw error;
    }
  }

  async getFolderHierarchy(userId: string, tenantId: string): Promise<EmailFolder[]> {
    try {
      const folders = await this.getFolders(userId, tenantId);
      return this.buildFolderTree(folders);
    } catch (error) {
      this.logger.error('Failed to get folder hierarchy:', error);
      throw error;
    }
  }

  async updateFolderCounts(folderId: string, userId: string, tenantId: string): Promise<void> {
    try {
      // TODO: Update message counts when email model is added
      this.logger.log(`Updated folder counts for: ${folderId}`);
    } catch (error) {
      this.logger.error('Failed to update folder counts:', error);
      throw error;
    }
  }

  async moveFolder(
    folderId: string, 
    newParentId: string | null, 
    userId: string, 
    tenantId: string
  ): Promise<EmailFolder> {
    try {
      const folder = await this.getFolderById(folderId, userId, tenantId);

      // Prevent moving system folders
      if (folder.type !== 'custom') {
        throw new BadRequestException('Cannot move system folders');
      }

      // Validate new parent
      if (newParentId) {
        const parentExists = await this.folderExists(newParentId, userId, tenantId);
        if (!parentExists) {
          throw new NotFoundException('Parent folder not found');
        }

        // Prevent circular references
        if (await this.wouldCreateCircularReference(folderId, newParentId, userId, tenantId)) {
          throw new BadRequestException('Cannot move folder: would create circular reference');
        }
      }

      return await this.updateFolder(folderId, userId, tenantId, { parentId: newParentId });
    } catch (error) {
      this.logger.error('Failed to move folder:', error);
      throw error;
    }
  }

  private async folderExists(folderId: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      await this.getFolderById(folderId, userId, tenantId);
      return true;
    } catch {
      return false;
    }
  }

  private async findFolderByName(
    name: string, 
    parentId: string | undefined, 
    userId: string, 
    tenantId: string
  ): Promise<EmailFolder | null> {
    try {
      const folders = await this.getFolders(userId, tenantId);
      return folders.find(f => 
        f.name.toLowerCase() === name.toLowerCase() && 
        f.parentId === parentId
      ) || null;
    } catch {
      return null;
    }
  }

  private async hasSubfolders(folderId: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      const folders = await this.getFolders(userId, tenantId);
      return folders.some(f => f.parentId === folderId);
    } catch {
      return false;
    }
  }

  private async wouldCreateCircularReference(
    folderId: string, 
    newParentId: string, 
    userId: string, 
    tenantId: string
  ): Promise<boolean> {
    try {
      // Check if newParentId is a descendant of folderId
      const folders = await this.getFolders(userId, tenantId);
      const folderMap = new Map(folders.map(f => [f.id, f]));

      let currentId = newParentId;
      const visited = new Set<string>();

      while (currentId && !visited.has(currentId)) {
        if (currentId === folderId) {
          return true; // Circular reference detected
        }

        visited.add(currentId);
        const currentFolder = folderMap.get(currentId);
        currentId = currentFolder?.parentId || null;
      }

      return false;
    } catch {
      return true; // Assume circular reference on error to be safe
    }
  }

  private buildFolderTree(folders: EmailFolder[]): EmailFolder[] {
    const folderMap = new Map(folders.map(f => [f.id, { ...f, children: [] }]));
    const rootFolders: any[] = [];

    for (const folder of folderMap.values()) {
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folder);
        } else {
          rootFolders.push(folder);
        }
      } else {
        rootFolders.push(folder);
      }
    }

    return rootFolders;
  }
}