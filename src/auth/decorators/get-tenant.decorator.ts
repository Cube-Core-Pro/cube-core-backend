// path: backend/src/auth/decorators/get-tenant.decorator.ts
// purpose: Decorator para extraer tenant ID del request
// dependencies: @nestjs/common

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para extraer el tenant ID del request
 * Busca en el user del request o en los headers
 */
export const GetTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // Primero intenta obtener del usuario autenticado
    if (request.user?.tenantId) {
      return request.user.tenantId;
    }
    
    // Si no, intenta obtener del header
    const tenantId = request.headers['x-tenant-id'] || request.headers['tenant-id'];
    
    if (!tenantId) {
      throw new Error('Tenant ID not found in request');
    }
    
    return tenantId;
  },
);