import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CurrentUser } from "../types/user.types";

export const GetCurrentUser = createParamDecorator(
  (data: keyof CurrentUser | undefined, ctx: ExecutionContext): CurrentUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUser;
    
    return data ? user?.[data] : user;
  },
);