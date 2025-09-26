import { ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Injectable()
export class AdminJwtOrOpenGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (process.env.ADMIN_PUBLIC_MODE === 'true') {
      return true;
    }
    return super.canActivate(context);
  }
}

@Injectable()
export class AdminRolesOrOpenGuard extends RolesGuard {
  canActivate(context: ExecutionContext): boolean {
    if (process.env.ADMIN_PUBLIC_MODE === 'true') {
      return true;
    }
    return super.canActivate(context);
  }
}
