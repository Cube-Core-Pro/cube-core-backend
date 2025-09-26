// path: backend/src/common/interceptors/validation.interceptor.ts
// purpose: Global validation interceptor for enterprise-grade input validation
// dependencies: @nestjs/common, rxjs, class-validator

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { sanitizeObject } from '../validators/sanitization.utils';
import { RequestContext } from '../types/api.types';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ValidationInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Create request context
    const requestContext: RequestContext = {
      requestId: this.generateRequestId(),
      userId: request.user?.['id'],
      tenantId: request.user?.['tenantId'],
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
      path: request.path,
      method: request.method,
      headers: this.sanitizeHeaders(request.headers),
    };

    // Attach request context to request
    request['context'] = requestContext;

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestContext.requestId);

    // Validate and sanitize request
    this.validateRequest(request, requestContext);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `${request.method} ${request.path} - ${response.statusCode} - ${duration}ms - ${requestContext.requestId}`
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `${request.method} ${request.path} - ERROR - ${duration}ms - ${requestContext.requestId}`,
          error.stack
        );
        throw error;
      })
    );
  }

  private validateRequest(request: Request, context: RequestContext): void {
    // Validate request size
    const maxBodySize = 10 * 1024 * 1024; // 10MB
    const contentLength = parseInt(request.get('content-length') || '0');
    
    if (contentLength > maxBodySize) {
      throw new BadRequestException({
        success: false,
        message: 'Request body too large',
        errors: [{
          field: 'body',
          message: `Request body exceeds maximum size of ${maxBodySize} bytes`,
          code: 'BODY_TOO_LARGE',
          value: contentLength,
        }],
      });
    }

    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.get('content-type');
      const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
      ];

      if (contentType && !allowedTypes.some(type => contentType.includes(type))) {
        throw new BadRequestException({
          success: false,
          message: 'Unsupported content type',
          errors: [{
            field: 'content-type',
            message: `Content type ${contentType} is not supported`,
            code: 'UNSUPPORTED_CONTENT_TYPE',
            value: contentType,
          }],
        });
      }
    }

    // Sanitize query parameters
    if (request.query && Object.keys(request.query).length > 0) {
      request.query = sanitizeObject(request.query, {
        allowHtml: false,
        maxStringLength: 1000,
        removeEmptyStrings: true,
      }) as any;
    }

    // Sanitize request body (if JSON)
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeObject(request.body, {
        allowHtml: false,
        maxStringLength: 10000,
        removeEmptyStrings: false,
      });
    }

    // Validate required headers for API requests
    if (request.path.startsWith('/api/')) {
      this.validateApiHeaders(request);
    }

    // Rate limiting validation (basic)
    this.validateRateLimit(request, context);
  }

  private validateApiHeaders(request: Request): void {
    const requiredHeaders = ['user-agent'];
    const missingHeaders = requiredHeaders.filter(header => 
      !request.get(header)
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'Required headers missing',
        errors: missingHeaders.map(header => ({
          field: header,
          message: `Header ${header} is required`,
          code: 'HEADER_REQUIRED',
          value: null,
        })),
      });
    }

    // Validate User-Agent
    const userAgent = request.get('user-agent');
    if (userAgent && userAgent.length > 500) {
      throw new BadRequestException({
        success: false,
        message: 'User-Agent header too long',
        errors: [{
          field: 'user-agent',
          message: 'User-Agent header exceeds maximum length',
          code: 'HEADER_TOO_LONG',
          value: userAgent.substring(0, 100) + '...',
        }],
      });
    }
  }

  private validateRateLimit(request: Request, context: RequestContext): void {
    // Basic rate limiting validation
    // In production, this should be handled by a proper rate limiting service
    const rateLimitHeader = request.get('x-rate-limit-remaining');
    if (rateLimitHeader === '0') {
      throw new BadRequestException({
        success: false,
        message: 'Rate limit exceeded',
        errors: [{
          field: 'rate-limit',
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          value: context.ipAddress,
        }],
      });
    }
  }

  private getClientIP(request: Request): string {
    return (
      request.get('x-forwarded-for')?.split(',')[0] ||
      request.get('x-real-ip') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      'user-agent',
      'accept',
      'accept-language',
      'accept-encoding',
      'content-type',
      'content-length',
      'authorization',
      'x-forwarded-for',
      'x-real-ip',
      'x-request-id',
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        sanitized[key] = typeof value === 'string' ? value : String(value);
      }
    }

    return sanitized;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // Security headers
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('X-XSS-Protection', '1; mode=block');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        // HSTS (only for HTTPS)
        if (context.switchToHttp().getRequest().secure) {
          response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // CSP (Content Security Policy)
        response.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';"
        );
      })
    );
  }
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestContext = request['context'] as RequestContext;

    return next.handle().pipe(
      tap((data) => {
        // Transform response to standard format
        if (data && typeof data === 'object' && !data.success && !data.error) {
          return {
            success: true,
            data,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: requestContext?.requestId,
              version: '1.0.0',
            },
          };
        }
        return data;
      })
    );
  }
}