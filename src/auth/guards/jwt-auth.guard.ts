// path: backend/src/auth/guards/jwt-auth.guard.ts
// purpose: JWT authentication guard for protected routes
// dependencies: Passport JWT strategy

import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}