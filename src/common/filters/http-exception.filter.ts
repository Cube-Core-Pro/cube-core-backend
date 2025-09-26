// path: backend/src/common/filters/http-exception.filter.ts
// purpose: Enterprise-grade exception filter with comprehensive error handling and security
// dependencies: @nestjs/common, express, winston

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from "@nestjs/common";
import { Request, Response } from "express";
import { StandardResponseDto } from "../types/response.types";
import { RequestContext } from "../types/api.types";

export interface ErrorDetails {
  field?: string;
  message: string;
  code?: string;
  value?: any;
}

export interface EnhancedErrorResponse {
  success: false;
  message: string;
  errors?: ErrorDetails[];
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  correlationId?: string;
  stack?: string;
  meta?: {
    userAgent?: string;
    ip?: string;
    userId?: string;
    tenantId?: string;
  };
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestContext = request['context'] as RequestContext;

    let status: number;
    let message: string;
    let errors: ErrorDetails[] = [];
    let code: string = 'INTERNAL_ERROR';

    // Determine error type and extract information
  if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errors = responseObj.errors || [];
        code = responseObj.code || this.getErrorCodeFromStatus(status);
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Special-case common platform errors (e.g., body-parser PayloadTooLargeError)
      const name = (exception as any).name || '';
      const msg = (exception as any).message || '';
      if (name === 'PayloadTooLargeError' || /request entity too large/i.test(msg)) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'Request payload too large';
        code = 'PAYLOAD_TOO_LARGE';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = this.isProduction() ? 'Internal server error' : exception.message;
        code = 'INTERNAL_ERROR';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
    }

    // Sanitize sensitive information
    message = this.sanitizeErrorMessage(message);
    errors = this.sanitizeErrors(errors);

    // Create error response
    const errorResponse: EnhancedErrorResponse = {
      success: false,
      message,
      errors: errors.length > 0 ? errors : undefined,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      method: request.method,
      requestId: requestContext?.requestId,
      correlationId: request.get('X-Correlation-ID'),
      meta: {
        userAgent: this.sanitizeUserAgent(request.get('User-Agent')),
        ip: this.getClientIP(request),
        userId: requestContext?.userId,
        tenantId: requestContext?.tenantId,
      },
    };

    // Add stack trace in development
    if (!this.isProduction() && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log the error with appropriate level
    this.logError(exception, request, requestContext, status);

    // Set security headers
    this.setSecurityHeaders(response);

    // Send response
    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    const sensitivePatterns = [
      /password[=:]\s*\S+/gi,
      /token[=:]\s*\S+/gi,
      /key[=:]\s*\S+/gi,
      /secret[=:]\s*\S+/gi,
      /authorization[=:]\s*\S+/gi,
      /bearer\s+\S+/gi,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    ];

    let sanitized = message;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  private sanitizeErrors(errors: ErrorDetails[]): ErrorDetails[] {
    return errors.map(error => ({
      ...error,
      message: this.sanitizeErrorMessage(error.message),
      value: this.sanitizeValue(error.value),
    }));
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeErrorMessage(value);
    }
    if (typeof value === 'object' && value !== null) {
      // Don't expose sensitive object properties
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = val;
        }
      }
      return sanitized;
    }
    return value;
  }

  private sanitizeUserAgent(userAgent?: string): string {
    if (!userAgent) return 'Unknown';
    
    // Truncate very long user agents
    if (userAgent.length > 200) {
      return userAgent.substring(0, 200) + '...';
    }
    
    return userAgent;
  }

  private getClientIP(request: Request): string {
    return (
      request.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.get('x-real-ip') ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private logError(
    exception: unknown,
    request: Request,
    context: RequestContext | undefined,
    status: number,
  ): void {
    const logData = {
      message: exception instanceof Error ? exception.message : 'Unknown error',
      statusCode: status,
      path: request.path,
      method: request.method,
      requestId: context?.requestId,
      userId: context?.userId,
      tenantId: context?.tenantId,
      ip: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      // Server errors - log as error with stack trace
      this.logger.error(
        `Server Error: ${logData.message}`,
        exception instanceof Error ? exception.stack : undefined,
        logData,
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(`Client Error: ${logData.message}`, logData);
    } else {
      // Other errors - log as info
      this.logger.log(`Request Error: ${logData.message}`, logData);
    }
  }

  private setSecurityHeaders(response: Response): void {
    // Security headers to prevent information leakage
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.removeHeader('X-Powered-By');
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}

// Legacy filter for backward compatibility
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const message = typeof exceptionResponse === 'string' 
      ? exceptionResponse 
      : (exceptionResponse as any)?.message || 'Internal server error';

    const errorResponse = new StandardResponseDto(
      false,
      message,
      null,
      exception.message
    );

    // Log the error
    this.logger.error(
      `HTTP Exception: ${status} - ${message}`,
      {
        path: request.url,
        method: request.method,
        statusCode: status,
        timestamp: new Date().toISOString(),
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      }
    );

    response.status(status).json(errorResponse);
  }
}
