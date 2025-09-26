import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { PasswordPolicyService } from "./services/password-policy.service";
import { FeatureFlagsService } from "./feature-flags.service";
// import { AccountLockoutService } from "./services/account-lockout.service";

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  providers: [PasswordPolicyService, FeatureFlagsService],
  exports: [PasswordPolicyService, FeatureFlagsService],
})
export class CommonModule {}
