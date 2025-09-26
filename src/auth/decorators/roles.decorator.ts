// path: backend/src/auth/decorators/roles.decorator.ts
// purpose: Role-based access control decorator for enterprise security
// dependencies: @nestjs/common, reflect-metadata

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);