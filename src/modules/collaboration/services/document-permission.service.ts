// path: backend/src/modules/collaboration/services/document-permission.service.ts
// purpose: Document permission management service
// dependencies: @nestjs/common, prisma

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type PermissionLevel = 'READ' | 'WRITE' | 'COMMENT' | 'ADMIN';

@Injectable()
export class DocumentPermissionService {
  private readonly logger = new Logger(DocumentPermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkDocumentAccess(
    documentId: string,
    userId: string,
    requiredPermission: PermissionLevel,
  ): Promise<boolean> {
    try {
      // Check if user is document owner
      const document = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          createdBy: userId,
        },
      });

      if (document) {
        return true; // Owner has all permissions
      }

      // Check explicit permissions
      const permission = await this.prisma.document_permissions.findFirst({
        where: {
          documentId,
          userId,
        },
      });

      if (permission) {
        return this.hasPermission(permission.permission, requiredPermission);
      }

      // Check role-based permissions
      const rolePermission = await this.prisma.document_permissions.findFirst({
        where: {
          documentId,
          roleId: { not: null },
        },
        include: {
          roles: {
            include: {
              UserRole: {
                where: { userId },
              },
            },
          },
        },
      });

      if (rolePermission && rolePermission.roles?.UserRole.length > 0) {
        return this.hasPermission(rolePermission.permission, requiredPermission);
      }

      // Check if document is public
      const publicDoc = await this.prisma.officeDocument.findFirst({
        where: {
          id: documentId,
          isPublic: true,
        },
      });

      return publicDoc ? this.hasPermission('READ', requiredPermission) : false;
    } catch (error) {
      this.logger.error('Error checking document access', error);
      return false;
    }
  }

  async grantPermission(
    documentId: string,
    userId: string,
    permission: PermissionLevel,
    grantedBy: string,
    expiresAt?: Date,
  ) {
    return this.prisma.document_permissions.create({
      data: {
        id: `${documentId}-${userId}-${Date.now()}`,
        documentId,
        userId,
        permission,
        grantedById: grantedBy,
        expiresAt,
      },
    });
  }

  async revokePermission(documentId: string, userId: string) {
    return this.prisma.document_permissions.deleteMany({
      where: {
        documentId,
        userId,
      },
    });
  }

  async getDocumentPermissions(documentId: string) {
    return this.prisma.document_permissions.findMany({
      where: { documentId },
      include: {
        users_document_permissions_userIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        users_document_permissions_grantedByIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        roles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private hasPermission(
    userPermission: string,
    requiredPermission: PermissionLevel,
  ): boolean {
    const permissionHierarchy = {
      READ: 1,
      COMMENT: 2,
      WRITE: 3,
      ADMIN: 4,
    };

    const userLevel = permissionHierarchy[userPermission as PermissionLevel] || 0;
    const requiredLevel = permissionHierarchy[requiredPermission] || 0;

    return userLevel >= requiredLevel;
  }

  async cleanupExpiredPermissions() {
    const result = await this.prisma.document_permissions.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired permissions`);
    return result;
  }
}