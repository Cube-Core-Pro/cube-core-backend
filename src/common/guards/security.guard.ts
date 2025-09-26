// path: backend/src/common/guards/security.guard.ts
// purpose: Advanced security guard with rate limiting, IP filtering, and threat detection
// dependencies: @nestjs/common, redis, express

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  
  Logger,
  
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

export interface SecurityOptions {
  skipRateLimit?: boolean;
  skipIpFilter?: boolean;
  skipThreatDetection?: boolean;
  customRateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  allowedIps?: string[];
  blockedIps?: string[];
  requireHttps?: boolean;
  maxRequestSize?: number;
}

export const SECURITY_OPTIONS_KEY = 'security_options';
export const SecurityOptions = (options: SecurityOptions) =>
  Reflector.createDecorator<SecurityOptions>()(options);

@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const options = this.reflector.get<SecurityOptions>(
      SECURITY_OPTIONS_KEY,
      context.getHandler(),
    ) || {};

    // Get client information
    const clientInfo = this.getClientInfo(request);

    // Security checks
    await this.checkHttps(request, options);
    await this.checkRequestSize(request, options);
    await this.checkIpFilter(clientInfo.ip, options);
    await this.checkRateLimit(clientInfo, options);
    await this.checkThreatDetection(request, clientInfo, options);

    // Log security event
    this.logSecurityEvent(request, clientInfo, 'ALLOWED');

    return true;
  }

  private getClientInfo(request: Request) {
    const ip = this.getClientIP(request);
    const userAgent = request.get('User-Agent') || 'Unknown';
    const referer = request.get('Referer') || '';
    const origin = request.get('Origin') || '';
    
    return {
      ip,
      userAgent,
      referer,
      origin,
      method: request.method,
      path: request.path,
      timestamp: new Date(),
    };
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

  private async checkHttps(request: Request, options: SecurityOptions): Promise<void> {
    if (options.requireHttps && !request.secure && request.get('x-forwarded-proto') !== 'https') {
      this.logger.warn(`HTTPS required but request is not secure: ${request.path}`);
      throw new ForbiddenException({
        success: false,
        message: 'HTTPS is required for this endpoint',
        code: 'HTTPS_REQUIRED',
      });
    }
  }

  private async checkRequestSize(request: Request, options: SecurityOptions): Promise<void> {
    const maxSize = options.maxRequestSize || 10 * 1024 * 1024; // 10MB default
    const contentLength = parseInt(request.get('content-length') || '0');

    if (contentLength > maxSize) {
      this.logger.warn(`Request size too large: ${contentLength} bytes`);
      throw new ForbiddenException({
        success: false,
        message: 'Request size exceeds maximum allowed',
        code: 'REQUEST_TOO_LARGE',
      });
    }
  }

  private async checkIpFilter(ip: string, options: SecurityOptions): Promise<void> {
    if (options.skipIpFilter) return;

    // Check blocked IPs
    const blockedIps = options.blockedIps || await this.getBlockedIps();
    if (this.isIpBlocked(ip, blockedIps)) {
      this.logger.warn(`Blocked IP attempted access: ${ip}`);
      throw new ForbiddenException({
        success: false,
        message: 'Access denied from this IP address',
        code: 'IP_BLOCKED',
      });
    }

    // Check allowed IPs (if whitelist is configured)
    const allowedIps = options.allowedIps || await this.getAllowedIps();
    if (allowedIps.length > 0 && !this.isIpAllowed(ip, allowedIps)) {
      this.logger.warn(`Non-whitelisted IP attempted access: ${ip}`);
      throw new ForbiddenException({
        success: false,
        message: 'Access denied: IP not in whitelist',
        code: 'IP_NOT_WHITELISTED',
      });
    }
  }

  private async checkRateLimit(clientInfo: any, options: SecurityOptions): Promise<void> {
    if (options.skipRateLimit) return;

    const rateLimit = options.customRateLimit || {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // requests per window
    };

    const key = `rate_limit:${clientInfo.ip}`;
    const window = Math.floor(Date.now() / rateLimit.windowMs);
    const windowKey = `${key}:${window}`;

    // Get current request count
    const currentCount = await this.redisService.get(windowKey);
    const requestCount = currentCount ? parseInt(currentCount) : 0;

    if (requestCount >= rateLimit.maxRequests) {
      this.logger.warn(`Rate limit exceeded for IP: ${clientInfo.ip}`);
      
      // Increase penalty for repeated violations
      await this.increasePenalty(clientInfo.ip);
      
      throw new ForbiddenException({
        success: false,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(rateLimit.windowMs / 1000),
      });
    }

    // Increment request count
    await this.redisService.setex(windowKey, Math.ceil(rateLimit.windowMs / 1000), requestCount + 1);
  }

  private async checkThreatDetection(
    request: Request,
    clientInfo: any,
    options: SecurityOptions,
  ): Promise<void> {
    if (options.skipThreatDetection) return;

    const threats = [];

    // SQL Injection detection
    if (this.detectSqlInjection(request)) {
      threats.push('SQL_INJECTION');
    }

    // XSS detection
    if (this.detectXss(request)) {
      threats.push('XSS');
    }

    // Path traversal detection
    if (this.detectPathTraversal(request)) {
      threats.push('PATH_TRAVERSAL');
    }

    // Suspicious user agent
    if (this.detectSuspiciousUserAgent(clientInfo.userAgent)) {
      threats.push('SUSPICIOUS_USER_AGENT');
    }

    // Bot detection
    if (this.detectBot(request, clientInfo)) {
      threats.push('BOT_DETECTED');
    }

    if (threats.length > 0) {
      this.logger.error(`Threats detected from ${clientInfo.ip}: ${threats.join(', ')}`);
      
      // Block IP temporarily
      await this.temporaryBlockIp(clientInfo.ip, threats);
      
      throw new ForbiddenException({
        success: false,
        message: 'Security threat detected',
        code: 'THREAT_DETECTED',
        threats,
      });
    }
  }

  private detectSqlInjection(request: Request): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\'|\"|;|--|\*|\|)/,
      /(\bUNION\b.*\bSELECT\b)/i,
    ];

    const checkString = JSON.stringify({
      query: request.query,
      body: request.body,
      params: request.params,
    });

    return sqlPatterns.some(pattern => pattern.test(checkString));
  }

  private detectXss(request: Request): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    const checkString = JSON.stringify({
      query: request.query,
      body: request.body,
      headers: request.headers,
    });

    return xssPatterns.some(pattern => pattern.test(checkString));
  }

  private detectPathTraversal(request: Request): boolean {
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i,
    ];

    const checkString = `${request.path}${JSON.stringify(request.query)}`;
    return pathTraversalPatterns.some(pattern => pattern.test(checkString));
  }

  private detectSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /curl/i, // Be careful with this one
      /wget/i,
      /python-requests/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private detectBot(request: Request, clientInfo: any): boolean {
    // Advanced bot detection with multiple indicators
    const userAgent = clientInfo.userAgent || '';
    const accept = request.get('accept') || '';
    const acceptLanguage = request.get('accept-language') || '';
    const acceptEncoding = request.get('accept-encoding') || '';
    
    // Known bot patterns (comprehensive list)
    const knownBots = [
      /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot/i,
      /facebookexternalhit|twitterbot|linkedinbot|whatsapp/i,
      /crawler|spider|scraper|bot|indexer|fetcher/i,
      /curl|wget|python|java|go-http|okhttp|apache-httpclient/i,
      /headless|phantom|selenium|puppeteer|playwright/i
    ];

    // Behavioral indicators
    const behavioralIndicators = [
      !accept || accept.length < 10,
      !acceptLanguage,
      !acceptEncoding,
      userAgent.length < 10 || userAgent.length > 500,
      !request.get('connection'),
      !request.get('cache-control'),
      /^Mozilla\/5\.0$/.test(userAgent), // Suspicious minimal UA
      !/Mozilla/.test(userAgent) && !/Chrome|Firefox|Safari|Edge/.test(userAgent)
    ];

    // Header analysis
    const headerIndicators = [
      request.get('x-forwarded-for')?.split(',').length > 5, // Too many proxies
      request.get('via') !== undefined, // Proxy usage
      !request.get('sec-fetch-site'), // Missing modern browser headers
      !request.get('sec-fetch-mode'),
      request.get('x-real-ip') !== undefined // Load balancer indicator
    ];

    // Pattern matching
    const patternMatches = knownBots.some(pattern => pattern.test(userAgent));
    const behavioralScore = behavioralIndicators.filter(Boolean).length;
    const headerScore = headerIndicators.filter(Boolean).length;

    // Scoring system: pattern match = instant bot, otherwise use scoring
    if (patternMatches) return true;
    
    // Advanced scoring: behavioral (weight 1) + headers (weight 0.5)
    const totalScore = behavioralScore + (headerScore * 0.5);
    return totalScore >= 3;
  }

  private isIpBlocked(ip: string, blockedIps: string[]): boolean {
    return blockedIps.some(blockedIp => {
      if (blockedIp.includes('/')) {
        // CIDR notation
        return this.isIpInCidr(ip, blockedIp);
      }
      return ip === blockedIp || ip.startsWith(blockedIp);
    });
  }

  private isIpAllowed(ip: string, allowedIps: string[]): boolean {
    return allowedIps.some(allowedIp => {
      if (allowedIp.includes('/')) {
        // CIDR notation
        return this.isIpInCidr(ip, allowedIp);
      }
      return ip === allowedIp || ip.startsWith(allowedIp);
    });
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    // Advanced CIDR check with IPv4 and IPv6 support
    try {
      const [network, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength, 10);
      
      // IPv6 support
      if (network.includes(':')) {
        return this.isIpv6InCidr(ip, network, prefix);
      }
      
      // IPv4 processing
      const networkParts = network.split('.').map(Number);
      const ipParts = ip.split('.').map(Number);
      
      // Validate IP format
      if (networkParts.length !== 4 || ipParts.length !== 4) return false;
      if (networkParts.some(p => p < 0 || p > 255) || ipParts.some(p => p < 0 || p > 255)) return false;
      if (prefix < 0 || prefix > 32) return false;
      
      // Calculate subnet mask
      const mask = (0xffffffff << (32 - prefix)) >>> 0;
      
      // Convert IPs to integers
      const networkInt = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3];
      const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      
      // Check if IP is in subnet
      return (networkInt & mask) === (ipInt & mask);
    } catch (error) {
      this.logger.warn(`Invalid CIDR notation: ${cidr}`, error);
      return false;
    }
  }

  private isIpv6InCidr(ip: string, network: string, prefix: number): boolean {
    // Basic IPv6 CIDR check - simplified implementation
    try {
      // For production, use a proper IPv6 library like 'ip6addr'
      if (prefix === 0) return true;
      if (prefix >= 128) return ip === network;
      
      // Simplified check for common IPv6 patterns
      const ipParts = ip.split(':');
      const networkParts = network.split(':');
      const segmentsToCheck = Math.floor(prefix / 16);
      
      for (let i = 0; i < segmentsToCheck && i < Math.min(ipParts.length, networkParts.length); i++) {
        if (ipParts[i] !== networkParts[i]) return false;
      }
      
      return true;
    } catch (error) {
      this.logger.warn(`IPv6 CIDR check failed for ${ip} in ${network}/${prefix}`, error);
      return false;
    }
  }

  private async getBlockedIps(): Promise<string[]> {
    const blockedIps = await this.redisService.get('security:blocked_ips');
    return blockedIps ? JSON.parse(blockedIps) : [];
  }

  private async getAllowedIps(): Promise<string[]> {
    const allowedIps = await this.redisService.get('security:allowed_ips');
    return allowedIps ? JSON.parse(allowedIps) : [];
  }

  private async increasePenalty(ip: string): Promise<void> {
    const penaltyKey = `security:penalty:${ip}`;
    const currentPenalty = await this.redisService.get(penaltyKey);
    const penalty = currentPenalty ? parseInt(currentPenalty) + 1 : 1;
    
    // Exponential backoff: 1min, 5min, 15min, 1hour, 24hours
    const penaltyDuration = Math.min(penalty * penalty * 60, 24 * 60 * 60);
    
    await this.redisService.setex(penaltyKey, penaltyDuration, penalty);
  }

  private async temporaryBlockIp(ip: string, threats: string[]): Promise<void> {
    const blockKey = `security:temp_block:${ip}`;
    const blockDuration = 15 * 60; // 15 minutes
    
    await this.redisService.setex(blockKey, blockDuration, JSON.stringify({
      threats,
      blockedAt: new Date().toISOString(),
    }));

    // Add to blocked IPs list temporarily
    const blockedIps = await this.getBlockedIps();
    if (!blockedIps.includes(ip)) {
      blockedIps.push(ip);
      await this.redisService.setex('security:blocked_ips', blockDuration, JSON.stringify(blockedIps));
    }
  }

  private logSecurityEvent(request: Request, clientInfo: any, action: string): void {
    this.logger.log({
      action,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      method: request.method,
      path: request.path,
      timestamp: clientInfo.timestamp,
    });
  }
}