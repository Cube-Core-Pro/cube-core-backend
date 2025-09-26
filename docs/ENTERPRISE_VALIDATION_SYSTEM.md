# Enterprise Validation System

## Overview

This document describes the comprehensive enterprise-grade validation system implemented in CUBE CORE. The system provides multiple layers of security, input validation, sanitization, and error handling to meet Fortune 500 standards.

## Architecture

### Core Components

1. **Validation Module** (`ValidationModule`) - Global configuration and providers
2. **Custom Validators** (`custom.validators.ts`) - Business-specific validation rules
3. **Sanitization Utils** (`sanitization.utils.ts`) - Input sanitization and security
4. **Validation Pipes** (`validation.pipe.ts`) - Request transformation and validation
5. **Security Guards** (`security.guard.ts`) - Advanced threat detection and IP filtering
6. **Exception Filters** (`http-exception.filter.ts`) - Comprehensive error handling
7. **Security Middleware** (`security.middleware.ts`) - Request-level security
8. **Validation Interceptors** (`validation.interceptor.ts`) - Request/response processing

## Features

### 1. Input Validation

#### Built-in Validators
- **UUID Validation**: Strict UUID v4 format validation
- **Email Validation**: RFC-compliant email validation
- **Phone Validation**: International phone number formats
- **Credit Card Validation**: Luhn algorithm validation
- **SSN Validation**: US Social Security Number validation
- **Routing Number Validation**: US bank routing number validation

#### Custom Business Validators
- **IsUnique**: Database uniqueness validation
- **Exists**: Database existence validation
- **IsBusinessHours**: Business hours format validation
- **IsIPAddress**: IPv4/IPv6 validation
- **IsMACAddress**: MAC address format validation

#### Example Usage
```typescript
import { IsUnique, Exists, IsCreditCard } from '../validators/custom.validators';

class CreateUserDto {
  @IsEmail()
  @IsUnique('user', 'email')
  email: string;

  @IsCreditCard()
  cardNumber: string;

  @Exists('tenant', 'id')
  tenantId: string;
}
```

### 2. Input Sanitization

#### Automatic Sanitization
- **HTML Sanitization**: Removes dangerous HTML tags and attributes
- **SQL Injection Prevention**: Removes SQL injection patterns
- **XSS Prevention**: Removes JavaScript and event handlers
- **Path Traversal Prevention**: Removes directory traversal attempts
- **NoSQL Injection Prevention**: Removes MongoDB operators

#### Manual Sanitization
```typescript
import { sanitizeHtml, sanitizeSql, sanitizeObject } from '../validators/sanitization.utils';

// Sanitize HTML content
const cleanHtml = sanitizeHtml(userInput);

// Sanitize SQL input
const cleanSql = sanitizeSql(userInput);

// Sanitize entire object
const cleanObject = sanitizeObject(requestBody, {
  allowHtml: false,
  maxStringLength: 1000,
  removeEmptyStrings: true,
});
```

### 3. Advanced Security

#### Security Guard Features
- **Rate Limiting**: Configurable per-endpoint rate limits
- **IP Filtering**: Whitelist/blacklist with CIDR support
- **Threat Detection**: SQL injection, XSS, path traversal detection
- **Bot Detection**: Suspicious user agent and behavior detection
- **Request Size Validation**: Configurable size limits
- **HTTPS Enforcement**: Optional HTTPS requirement

#### Usage Example
```typescript
import { SecurityGuard, SecurityOptions } from '../guards/security.guard';

@Controller('api/sensitive')
@UseGuards(SecurityGuard)
export class SensitiveController {
  
  @Post('payment')
  @SecurityOptions({
    requireHttps: true,
    customRateLimit: { windowMs: 300000, maxRequests: 3 },
    skipThreatDetection: false,
  })
  async processPayment(@Body() paymentDto: PaymentDto) {
    // Payment processing logic
  }
}
```

### 4. Request Validation Decorators

#### ValidateBody
Validates and sanitizes request body using DTO classes.

```typescript
@Post('users')
async createUser(@ValidateBody(CreateUserDto) userData: CreateUserDto) {
  // userData is validated and sanitized
}
```

#### ValidateQuery
Validates query parameters with automatic type conversion.

```typescript
@Get('users')
async getUsers(@ValidateQuery(UserQueryDto) query: UserQueryDto) {
  // query parameters are validated and converted
}
```

#### ValidateParams
Validates URL parameters.

```typescript
@Get('users/:id')
async getUser(@ValidateParams(UserParamsDto) params: UserParamsDto) {
  // params.id is validated as UUID
}
```

#### ValidateFile/ValidateFiles
Validates file uploads with security checks.

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @ValidateFile({
    required: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['.jpg', '.png'],
  }) file: Express.Multer.File,
) {
  // file is validated for size, type, and security
}
```

### 5. Custom Pipes

#### ParseUUIDPipe
Validates and parses UUID parameters.

```typescript
@Get('users/:id')
async getUser(@Param('id', ParseUUIDPipe) id: string) {
  // id is guaranteed to be a valid UUID
}
```

#### ParseIntPipe
Validates and parses integer parameters with range validation.

```typescript
@Get('items')
async getItems(
  @Query('page', new ParseIntPipe({ min: 1, max: 1000 })) page: number,
) {
  // page is guaranteed to be an integer between 1 and 1000
}
```

#### ParseArrayPipe
Validates and parses array parameters.

```typescript
@Get('search')
async search(
  @Query('tags', new ParseArrayPipe({ 
    items: 'string', 
    maxItems: 10,
    separator: ',' 
  })) tags: string[],
) {
  // tags is guaranteed to be an array of strings with max 10 items
}
```

### 6. Error Handling

#### Global Exception Filter
Provides comprehensive error handling with:
- Sensitive data sanitization
- Structured error responses
- Security headers
- Request context logging
- Development vs production error details

#### Error Response Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address",
      "code": "INVALID_EMAIL",
      "value": "invalid-email"
    }
  ],
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "requestId": "req_1705312200000_abc123"
}
```

### 7. Security Middleware

#### Features
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Request Size Limits**: Configurable per endpoint
- **Content Type Validation**: Allowed MIME types
- **Host Header Validation**: Prevents host header injection
- **Suspicious Request Detection**: Logs potential attacks

#### Rate Limiting
- **Global Rate Limiting**: Default limits for all endpoints
- **Endpoint-Specific Limits**: Custom limits per route
- **Progressive Delays**: Slow down repeated requests
- **IP-based Tracking**: Per-IP rate limiting

### 8. Configuration

#### Environment Variables
```env
# Validation settings
VALIDATION_ENABLE_DEBUG=false
VALIDATION_SANITIZE_INPUT=true
VALIDATION_MAX_STRING_LENGTH=10000

# Security settings
SECURITY_REQUIRE_HTTPS=true
SECURITY_ALLOWED_HOSTS=example.com,api.example.com
SECURITY_BLOCKED_IPS=192.168.1.100,10.0.0.0/8

# Rate limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_API_MAX=1000
```

#### Feature Flags
```env
# Enable/disable validation features
FEATURE_ADVANCED_VALIDATION=true
FEATURE_THREAT_DETECTION=true
FEATURE_IP_FILTERING=true
FEATURE_REQUEST_LOGGING=true
```

## Best Practices

### 1. DTO Design
- Use specific validation decorators for each field
- Implement custom validators for business rules
- Use nested validation for complex objects
- Apply sanitization at the DTO level

### 2. Security Configuration
- Always enable HTTPS in production
- Configure appropriate rate limits per endpoint
- Use IP whitelisting for admin endpoints
- Enable threat detection for public APIs

### 3. Error Handling
- Never expose sensitive information in error messages
- Use structured error responses
- Log security events for monitoring
- Implement proper error codes for client handling

### 4. Performance Considerations
- Use Redis for rate limiting storage
- Cache validation results where appropriate
- Implement request size limits
- Monitor validation performance metrics

## Monitoring and Logging

### Security Events
The system logs various security events:
- Failed validation attempts
- Rate limit violations
- Threat detection triggers
- IP blocking events
- Suspicious request patterns

### Metrics
Key metrics to monitor:
- Validation failure rates
- Security event frequency
- Rate limit hit rates
- Request processing times
- Error response rates

### Alerts
Configure alerts for:
- High validation failure rates
- Security threat detection
- Rate limit violations
- Unusual error patterns
- Performance degradation

## Integration Examples

### Complete Controller Example
```typescript
@Controller('api/users')
@UseGuards(SecurityGuard)
export class UsersController {
  
  @Get()
  @SecurityOptions({ customRateLimit: { windowMs: 60000, maxRequests: 100 } })
  async getUsers(
    @ValidateQuery(UserQueryDto) query: UserQueryDto,
    @ValidateIP({ allowPrivate: false }) ip: string,
  ) {
    return this.usersService.findAll(query);
  }

  @Post()
  @SecurityOptions({ requireHttps: true })
  async createUser(
    @ValidateBody(CreateUserDto) userData: CreateUserDto,
    @ValidateHeaders(['user-agent']) headers: Record<string, string>,
  ) {
    return this.usersService.create(userData);
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @ValidateBody(UpdateUserDto) userData: UpdateUserDto,
  ) {
    return this.usersService.update(id, userData);
  }
}
```

### Custom Validator Example
```typescript
@ValidatorConstraint({ name: 'isValidTenantUser', async: true })
@Injectable()
export class IsValidTenantUserConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(userId: string, args: ValidationArguments): Promise<boolean> {
    const [tenantId] = args.constraints;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    return !!user;
  }

  defaultMessage(): string {
    return 'User does not belong to the specified tenant';
  }
}

export function IsValidTenantUser(tenantId: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [tenantId],
      validator: IsValidTenantUserConstraint,
    });
  };
}
```

## Troubleshooting

### Common Issues

1. **Validation Not Working**
   - Ensure ValidationModule is imported in app.module.ts
   - Check that DTOs are properly decorated
   - Verify class-transformer is configured correctly

2. **Rate Limiting Issues**
   - Check Redis connection for distributed rate limiting
   - Verify rate limit configuration
   - Monitor rate limit headers in responses

3. **Security Headers Missing**
   - Ensure SecurityHeadersInterceptor is registered
   - Check middleware order
   - Verify environment configuration

4. **File Upload Validation Failing**
   - Check file size limits
   - Verify MIME type configuration
   - Ensure multer is properly configured

### Debug Mode
Enable debug mode for detailed validation logging:
```env
VALIDATION_ENABLE_DEBUG=true
LOG_LEVEL=debug
```

This will provide detailed information about validation processes, security checks, and error handling.