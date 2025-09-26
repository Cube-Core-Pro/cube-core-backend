// path: backend/src/enterprise-office-suite/services/version-control.service.ts
// purpose: Document version control and history management
// dependencies: Prisma, Redis, Diff Engine, Compression

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const VERSION_CREATOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true,
} as const;

type VersionWithCreator = Prisma.OfficeVersionGetPayload<{
  include: { creator: { select: typeof VERSION_CREATOR_SELECT } };
}>;

type VersionWithDocument = Prisma.OfficeVersionGetPayload<{
  include: {
    creator: { select: typeof VERSION_CREATOR_SELECT };
    document: { select: { id: true; title: true; tenantId: true } };
  };
}>;

@Injectable()
export class VersionControlService {
  private readonly logger = new Logger(VersionControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createVersion(documentId: string, userId: string, data: {
    content: any;
    comment?: string;
    isAutoSave?: boolean;
  }) {
    try {
      // Get current version number
      const lastVersion = await this.prisma.officeVersion.findFirst({
        where: { documentId },
        orderBy: { version: 'desc' },
      });

      const version = await this.prisma.officeVersion.create({
        data: {
          documentId,
          version: (lastVersion?.version || 0) + 1,
          changes: JSON.stringify(data.content),
          comment: data.comment ?? null,
          isAutoSave: data.isAutoSave ?? false,
          createdBy: userId,
        },
        include: {
          creator: { select: VERSION_CREATOR_SELECT },
        },
      }) as VersionWithCreator;

      // Clean up old auto-save versions (keep only last 10)
      if (data.isAutoSave) {
        await this.cleanupAutoSaveVersions(documentId);
      }

      return version;
    } catch (error) {
      this.logger.error('Error creating version:', error);
      throw error;
    }
  }

  async getVersions(documentId: string, userId: string, options?: {
    includeAutoSave?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      // Check access to document
      await this.checkDocumentAccess(documentId, userId);

      const where: any = { documentId };
      
      if (!options?.includeAutoSave) {
        where.isAutoSave = false;
      }

      const versions = await this.prisma.officeVersion.findMany({
        where,
        include: {
          creator: { select: VERSION_CREATOR_SELECT },
        },
        orderBy: { version: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }) as VersionWithCreator[];

      return versions;
    } catch (error) {
      this.logger.error('Error getting versions:', error);
      throw error;
    }
  }

  async getVersion(versionId: string, userId: string) {
    try {
      const version = await this.prisma.officeVersion.findUnique({
        where: { id: versionId },
        include: {
          document: {
            select: { id: true, title: true, tenantId: true },
          },
          creator: { select: VERSION_CREATOR_SELECT },
        },
      }) as VersionWithDocument | null;

      if (!version) {
        throw new NotFoundException('Version not found');
      }

      // Check access to document
      await this.checkDocumentAccess(version.documentId, userId);

      return version;
    } catch (error) {
      this.logger.error('Error getting version:', error);
      throw error;
    }
  }

  async restoreVersion(documentId: string, userId: string, versionId: string) {
    try {
      // Check edit permission
      await this.checkEditPermission(documentId, userId);

      const version = await this.prisma.officeVersion.findUnique({
        where: { id: versionId },
      });

      if (!version || version.documentId !== documentId) {
        throw new NotFoundException('Version not found');
      }

      // Parse content from changes field
      const restoredContent = JSON.parse(version.changes);

      // Create new version with restored content
      const restoredVersion = await this.createVersion(documentId, userId, {
        content: restoredContent,
        comment: `Restored from version ${version.version}`,
      });

      // Update document with restored content
      await this.prisma.officeDocument.update({
        where: { id: documentId },
        data: {
          content: restoredContent,
          updatedAt: new Date(),
        },
      });

      // Log activity
      await this.logActivity(documentId, userId, 'version_restored', {
        restoredVersionId: versionId,
        restoredVersion: version.version,
        newVersionId: restoredVersion.id,
      });

      return restoredVersion;
    } catch (error) {
      this.logger.error('Error restoring version:', error);
      throw error;
    }
  }

  async compareVersions(versionId1: string, versionId2: string, userId: string) {
    try {
      const [version1, version2] = await Promise.all([
        this.getVersion(versionId1, userId),
        this.getVersion(versionId2, userId),
      ]);

      if (version1.documentId !== version2.documentId) {
        throw new ForbiddenException('Versions must be from the same document');
      }

      // Generate diff
      const content1 = JSON.parse(version1.changes);
      const content2 = JSON.parse(version2.changes);
      const diff = this.generateDiff(content1, content2);

      return {
        version1: {
          id: version1.id,
          version: version1.version,
          createdAt: version1.createdAt,
          creator: version1.creator,
        },
        version2: {
          id: version2.id,
          version: version2.version,
          createdAt: version2.createdAt,
          creator: version2.creator,
        },
        diff,
      };
    } catch (error) {
      this.logger.error('Error comparing versions:', error);
      throw error;
    }
  }

  async deleteVersion(versionId: string, userId: string) {
    try {
      const version = await this.prisma.officeVersion.findUnique({
        where: { id: versionId },
        include: {
          document: {
            select: { id: true, createdBy: true },
          },
        },
      });

      if (!version) {
        throw new NotFoundException('Version not found');
      }

      // Only document owner can delete versions
      if (version.document.createdBy !== userId) {
        throw new ForbiddenException('Only document owner can delete versions');
      }

      // Cannot delete the latest version
      const latestVersion = await this.prisma.officeVersion.findFirst({
        where: { documentId: version.documentId },
        orderBy: { version: 'desc' },
      });

      if (latestVersion?.id === versionId) {
        throw new ForbiddenException('Cannot delete the latest version');
      }

      await this.prisma.officeVersion.delete({
        where: { id: versionId },
      });

      // Log activity
      await this.logActivity(version.documentId, userId, 'version_deleted', {
        deletedVersionId: versionId,
        deletedVersion: version.version,
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting version:', error);
      throw error;
    }
  }

  async getVersionHistory(documentId: string, userId: string) {
    try {
      // Check access to document
      await this.checkDocumentAccess(documentId, userId);

      const versions = await this.prisma.officeVersion.findMany({
        where: { documentId },
        include: {
          creator: { select: VERSION_CREATOR_SELECT },
        },
        orderBy: { version: 'desc' },
      }) as VersionWithCreator[];

      // Calculate changes between versions
      const history = [];
      for (let i = 0; i < versions.length; i++) {
        const current = versions[i];
        const previous = versions[i + 1];

        const currentContent = JSON.parse(current.changes);
        const previousContent = previous ? JSON.parse(previous.changes) : null;

        const historyItem = {
          id: current.id,
          version: current.version,
          createdAt: current.createdAt,
          creator: current.creator,
          size: current.changes.length,
          changes: previousContent ? this.calculateChanges(previousContent, currentContent) : null,
        };

        history.push(historyItem);
      }

      return history;
    } catch (error) {
      this.logger.error('Error getting version history:', error);
      throw error;
    }
  }

  async createBranch(documentId: string, userId: string, data: {
    name: string;
    description?: string;
    baseVersionId?: string;
  }) {
    try {
      // Check edit permission
      await this.checkEditPermission(documentId, userId);

      // Get base version content
      let baseContent;
      if (data.baseVersionId) {
        const baseVersion = await this.prisma.documentVersion.findUnique({
          where: { id: data.baseVersionId },
        });
        if (!baseVersion || baseVersion.documentId !== documentId) {
          throw new NotFoundException('Base version not found');
        }
        baseContent = JSON.parse(baseVersion.changes);
      } else {
        // Use current document content
        const document = await this.prisma.officeDocument.findUnique({
          where: { id: documentId },
          select: { content: true },
        });
        baseContent = document?.content;
      }

      // TODO: Implement branching functionality when DocumentBranch model is added
      const branch = {
        id: 'temp-branch-id',
        documentId,
        name: data.name,
        description: data.description,
        baseVersionId: data.baseVersionId,
        content: baseContent,
        createdBy: userId,
        createdAt: new Date(),
        creator: { id: userId, name: 'User', email: 'user@example.com', avatar: null },
      };

      return branch;
    } catch (error) {
      this.logger.error('Error creating branch:', error);
      throw error;
    }
  }

  async mergeBranch(_documentId: string, _userId: string, _branchId: string, _strategy: 'overwrite' | 'merge') {
    try {
      // TODO: Implement branching functionality when DocumentBranch model is added
      return { success: true, message: 'Branch merging not yet implemented' };
    } catch (error) {
      this.logger.error('Error merging branch:', error);
      throw error;
    }
  }

  // Private helper methods
  private async checkDocumentAccess(documentId: string, userId: string) {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        OR: [
          { createdBy: userId },
          { collaborators: { some: { userId } } },
        ],
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or access denied');
    }

    return document;
  }

  private async checkEditPermission(documentId: string, userId: string) {
    const document = await this.prisma.officeDocument.findFirst({
      where: {
        id: documentId,
        OR: [
          { createdBy: userId },
          { 
            collaborators: {
              some: {
                userId,
                permission: 'edit',
              },
            },
          },
        ],
      },
    });

    if (!document) {
      throw new ForbiddenException('Edit permission required');
    }

    return document;
  }

  private async cleanupAutoSaveVersions(documentId: string) {
    // TODO: Implement auto-save cleanup when isAutoSave field is added to schema
    const oldVersions = await this.prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      skip: 20, // Keep last 20 versions
    });

    if (oldVersions.length > 0) {
      await this.prisma.documentVersion.deleteMany({
        where: {
          id: { in: oldVersions.map(v => v.id) },
        },
      });
    }
  }

  private generateDiff(_content1: any, _content2: any) {
    // Simplified diff generation
    // In a real implementation, this would use a proper diff algorithm
    return {
      added: [],
      removed: [],
      modified: [],
      summary: {
        additions: 0,
        deletions: 0,
        modifications: 0,
      },
    };
  }

  private calculateChanges(oldContent: any, newContent: any) {
    // Calculate what changed between versions
    const oldSize = JSON.stringify(oldContent).length;
    const newSize = JSON.stringify(newContent).length;
    
    return {
      sizeChange: newSize - oldSize,
      percentageChange: oldSize > 0 ? ((newSize - oldSize) / oldSize) * 100 : 0,
      type: newSize > oldSize ? 'addition' : newSize < oldSize ? 'deletion' : 'modification',
    };
  }

  private mergeContent(baseContent: any, branchContent: any) {
    // Simplified merge - in reality this would be much more sophisticated
    return branchContent;
  }

  private async logActivity(documentId: string, userId: string, action: string, details?: any) {
    try {
      // Get document to obtain tenantId
      const document = await this.prisma.officeDocument.findUnique({
        where: { id: documentId },
        select: { tenantId: true },
      });

      if (document) {
        await this.prisma.documentActivity.create({
          data: {
            documentId,
            userId,
            action,
            details,
            tenantId: document.tenantId,
          },
        });
      }
    } catch (error) {
      this.logger.warn('Failed to log activity:', error);
    }
  }
}
