// path: backend/src/common/validation.module.ts
// purpose: Fortune 500 Enterprise-grade validation module with advanced security and compliance
// dependencies: @nestjs/common, class-validator, class-transformer, enterprise security

import { Module, Global } from '@nestjs/common';
import { APP_PIPE, APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Pipes
import { 
  EnterpriseValidationPipe, 
  ParseUUIDPipe, 
  ParseBooleanPipe, 
  ParseArrayPipe 
} from './pipes/validation.pipe';
import { ParseIntPipe } from './pipes/parse-int.pipe';

// Guards
import { SecurityGuard } from './guards/security.guard';

// Filters
import { GlobalExceptionFilter } from './filters/http-exception.filter';

// Interceptors
import { 
  ValidationInterceptor, 
  SecurityHeadersInterceptor, 
  ResponseTransformInterceptor 
} from './interceptors/validation.interceptor';
import { HttpMetricsInterceptor } from '../metrics/http-metrics.interceptor';

// Validators
import { IsUniqueConstraint, ExistsConstraint } from './validators/custom.validators';

// Services
import { RedisService } from '../redis/redis.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get('THROTTLE_TTL', 60000), // milliseconds
            limit: configService.get('THROTTLE_LIMIT', 300), // Fortune 500 higher limits
          },
          {
            name: 'strict',
            ttl: configService.get('STRICT_THROTTLE_TTL', 60000),
            limit: configService.get('STRICT_THROTTLE_LIMIT', 50), // For sensitive operations
          },
          {
            name: 'premium',
            ttl: configService.get('PREMIUM_THROTTLE_TTL', 60000),
            limit: configService.get('PREMIUM_THROTTLE_LIMIT', 1000), // For enterprise users
          }
        ],
      }),
    }),
  ],
  providers: [
    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () => new EnterpriseValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        sanitize: true,
        enableDebugMessages: process.env.NODE_ENV !== 'production',
      }),
    },

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global security guard
    {
      provide: APP_GUARD,
      useClass: SecurityGuard,
    },

    // Global throttler guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },

    // Custom validators
    IsUniqueConstraint,
    ExistsConstraint,

    // Utility pipes (can be injected where needed)
    ParseUUIDPipe,
    {
      provide: ParseIntPipe,
      useValue: new ParseIntPipe({}),
    },
    {
      provide: ParseBooleanPipe,
      useValue: new ParseBooleanPipe(false),
    },
    {
      provide: ParseArrayPipe,
      useValue: new ParseArrayPipe({}),
    },

    // Services
    RedisService,
  ],
  exports: [
    // Export pipes for manual use
    ParseUUIDPipe,
    ParseIntPipe,
    ParseBooleanPipe,
    ParseArrayPipe,
    
    // Export validators
    IsUniqueConstraint,
    ExistsConstraint,
    
    // Export services
    RedisService,
  ],
})
export class ValidationModule {
  static forRoot() {
    return {
      module: ValidationModule,
      global: true,
    };
  }
}
