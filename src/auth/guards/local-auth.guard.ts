// path: backend/src/auth/guards/local-auth.guard.ts
// purpose: Local authentication guard for login endpoint
// dependencies: Passport local strategy

import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}