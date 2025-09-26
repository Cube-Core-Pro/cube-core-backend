// path: backend/src/auth/decorators/get-user.decorator.ts
// purpose: Decorator para extraer usuario del request
// dependencies: @nestjs/common

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para extraer el usuario del request
 * @param data - Campo específico del usuario a extraer (opcional)
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new Error('User not found in request');
    }
    
    return data ? user[data] : user;
  },
);