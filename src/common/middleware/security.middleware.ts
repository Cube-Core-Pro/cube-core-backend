// path: backend/src/common/middleware/security.middleware.ts
// purpose: Advanced security middleware with comprehensive protection mechanisms
// dependencies: @nestjs/common, express, helmet, express-rate-limit

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers
    this.applySecurityHeaders(req, res);
    
    // Validate request
    this.validateRequest(req, res);
    
    // Log security events
    this.logSecurityEvent(req);
    
    next();
  }

  private applySecurityHeaders(req: Request, res: Response): void {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https:",
        "connect-src 'self' https: wss:",
        "media-src 'self'",
        "object-src 'none'",
        "child-src 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "base-uri 'self'",
        "manifest-src 'self'"
      ].join('; ')
    );

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS for HTTPS
    if (req.secure || req.get('x-forwarded-proto') === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // CORS headers (if needed)
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }

  private validateRequest(req: Request, res: Response): void {
    // Validate content type for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('content-type');
      if (contentType && !this.isAllowedContentType(contentType)) {
        res.status(415).json({
          success: false,
          message: 'Unsupported Media Type',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
        return;
      }
    }

    // Validate request size
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = this.getMaxRequestSize(req.path);
    if (contentLength > maxSize) {
      res.status(413).json({
        success: false,
        message: 'Request Entity Too Large',
        code: 'REQUEST_TOO_LARGE'
      });
      return;
    }

    // Validate headers
    this.validateHeaders(req, res);
  }

  private isAllowedContentType(contentType: string): boolean {
    const allowedTypes = [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'application/xml',
      'text/xml'
    ];

    return allowedTypes.some(type => contentType.toLowerCase().includes(type));
  }

  private getMaxRequestSize(path: string): number {
    // Different size limits for different endpoints
    if (path.includes('/upload') || path.includes('/files')) {
      return 100 * 1024 * 1024; // 100MB for file uploads
    }
    if (path.includes('/api/')) {
      return 10 * 1024 * 1024; // 10MB for API endpoints
    }
    return 1 * 1024 * 1024; // 1MB default
  }

  private validateHeaders(req: Request, res: Response): void {
    const userAgent = req.get('User-Agent');
    
    // Block requests without User-Agent (potential bots)
    if (!userAgent && process.env.NODE_ENV === 'production') {
      res.status(400).json({
        success: false,
        message: 'User-Agent header is required',
        code: 'MISSING_USER_AGENT'
      });
      return;
    }

    // Check for suspicious User-Agent patterns
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      this.logger.warn(`Suspicious User-Agent detected: ${userAgent}`);
      res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'SUSPICIOUS_USER_AGENT'
      });
      return;
    }

    // Validate Host header to prevent Host header injection
    const host = req.get('Host');
    if (host && !this.isValidHost(host)) {
      res.status(400).json({
        success: false,
        message: 'Invalid Host header',
        code: 'INVALID_HOST'
      });
      return;
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /python-requests/i,
      /curl/i,
      /wget/i,
      /<script/i,
      /javascript:/i,
      /vbscript:/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isValidHost(host: string): boolean {
    // Allow localhost and development hosts
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Validate against allowed hosts
    const allowedHosts = (process.env.ALLOWED_HOSTS || '').split(',').map(h => h.trim());
    if (allowedHosts.length === 0) {
      return true; // No restriction if not configured
    }

    return allowedHosts.some(allowedHost => 
      host === allowedHost || host.endsWith(`.${allowedHost}`)
    );
  }

  private logSecurityEvent(req: Request): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
    };

    // Log suspicious activities
    if (this.isSuspiciousRequest(req)) {
      this.logger.warn('Suspicious request detected', securityEvent);
    }
  }

  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousIndicators = [
      // SQL injection patterns in URL
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i.test(req.url),
      // XSS patterns in URL
      /<script|javascript:|on\w+=/i.test(req.url),
      // Path traversal patterns
      /\.\.\//i.test(req.url),
      // Suspicious file extensions
      /\.(php|asp|aspx|jsp|cgi)$/i.test(req.path),
      // Admin panel probing
      /\/(admin|wp-admin|phpmyadmin|administrator)/i.test(req.path),
    ];

    return suspiciousIndicators.some(indicator => indicator);
  }

  private getClientIP(req: Request): string {
    return (
      req.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.get('x-real-ip') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Apply rate limiting based on endpoint
    const rateLimiter = this.getRateLimiter(req.path);
    rateLimiter(req, res, next);
  }

  private getRateLimiter(path: string) {
    // Different rate limits for different endpoints
    if (path.includes('/auth/login')) {
      return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: {
          success: false,
          message: 'Too many login attempts, please try again later',
          code: 'LOGIN_RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false,
      });
    }

    if (path.includes('/auth/')) {
      return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // 20 requests per window for auth endpoints
        message: {
          success: false,
          message: 'Too many authentication requests',
          code: 'AUTH_RATE_LIMIT_EXCEEDED'
        },
      });
    }

    if (path.includes('/api/')) {
      return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window for API
        message: {
          success: false,
          message: 'Too many API requests',
          code: 'API_RATE_LIMIT_EXCEEDED'
        },
      });
    }

    // Default rate limit
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        success: false,
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      },
    });
  }
}

@Injectable()
export class SlowDownMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const slowDownLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // Allow 100 requests per windowMs without delay
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 20000, // Maximum delay of 20 seconds
    });

    slowDownLimiter(req, res, next);
  }
}

@Injectable()
export class RequestSizeMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestSizeMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSize = this.getMaxSize(req.path);

    if (contentLength > maxSize) {
      this.logger.warn(`Request size ${contentLength} exceeds limit ${maxSize} for ${req.path}`);
      
      res.status(413).json({
        success: false,
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize,
        actualSize: contentLength,
      });
      return;
    }

    next();
  }

  private getMaxSize(path: string): number {
    if (path.includes('/upload') || path.includes('/files')) {
      return 100 * 1024 * 1024; // 100MB
    }
    if (path.includes('/api/')) {
      return 10 * 1024 * 1024; // 10MB
    }
    return 1 * 1024 * 1024; // 1MB
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing correlation ID
    const correlationId = req.get('X-Correlation-ID') || this.generateCorrelationId();
    
    // Add to request and response headers
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}