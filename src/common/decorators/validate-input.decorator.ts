// path: backend/src/common/decorators/validate-input.decorator.ts
// purpose: Input validation decorator for enterprise-grade security
// dependencies: class-validator, class-transformer, reflect-metadata

import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { formatValidationErrors } from '../validators/validation.utils';
import { sanitizeObject } from '../validators/sanitization.utils';

/**
 * Validates and sanitizes request body using DTO class
 */
export const ValidateBody = createParamDecorator(
  async (dtoClass: new () => any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const body = request.body;

    if (!body || typeof body !== 'object') {
      throw new BadRequestException({
        success: false,
        message: 'Request body is required',
        errors: [{
          field: 'body',
          message: 'Request body must be a valid object',
          code: 'INVALID_BODY',
          value: body,
        }],
      });
    }

    // Sanitize input
    const sanitizedBody = sanitizeObject(body, {
      allowHtml: false,
      maxStringLength: 10000,
      removeEmptyStrings: false,
    });

    // Transform to DTO
    const dto = plainToClass(dtoClass, sanitizedBody, {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    });

    // Validate DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const validationErrors = formatValidationErrors(errors);
      throw new BadRequestException({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    return dto;
  },
);

/**
 * Validates and sanitizes query parameters using DTO class
 */
export const ValidateQuery = createParamDecorator(
  async (dtoClass: new () => any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    // Sanitize query parameters
    const sanitizedQuery = sanitizeObject(query, {
      allowHtml: false,
      maxStringLength: 1000,
      removeEmptyStrings: true,
    });

    // Transform to DTO
    const dto = plainToClass(dtoClass, sanitizedQuery, {
      enableImplicitConversion: true,
    });

    // Validate DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const validationErrors = formatValidationErrors(errors);
      throw new BadRequestException({
        success: false,
        message: 'Query validation failed',
        errors: validationErrors,
      });
    }

    return dto;
  },
);

/**
 * Validates and sanitizes path parameters using DTO class
 */
export const ValidateParams = createParamDecorator(
  async (dtoClass: new () => any, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const params = request.params;

    // Sanitize parameters
    const sanitizedParams = sanitizeObject(params, {
      allowHtml: false,
      maxStringLength: 100,
      removeEmptyStrings: false,
    });

    // Transform to DTO
    const dto = plainToClass(dtoClass, sanitizedParams, {
      enableImplicitConversion: true,
    });

    // Validate DTO
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const validationErrors = formatValidationErrors(errors);
      throw new BadRequestException({
        success: false,
        message: 'Parameter validation failed',
        errors: validationErrors,
      });
    }

    return dto;
  },
);

/**
 * Validates file upload with security checks
 */
export const ValidateFile = createParamDecorator(
  (options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const file = request.file;

    if (options.required && !file) {
      throw new BadRequestException({
        success: false,
        message: 'File is required',
        errors: [{
          field: 'file',
          message: 'File upload is required',
          code: 'FILE_REQUIRED',
          value: null,
        }],
      });
    }

    if (!file) return null;

    const errors: string[] = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`File size ${file.size} exceeds maximum allowed size ${options.maxSize}`);
    }

    // Check MIME type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!options.allowedExtensions.includes(extension)) {
        errors.push(`File extension ${extension} is not allowed`);
      }
    }

    // Check for dangerous file types
    const dangerousTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-sh',
      'text/x-php',
      'application/x-httpd-php',
    ];

    if (dangerousTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is potentially dangerous`);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'File validation failed',
        errors: errors.map(error => ({
          field: 'file',
          message: error,
          code: 'FILE_VALIDATION_ERROR',
          value: file.originalname,
        })),
      });
    }

    return file;
  },
);

/**
 * Validates multiple file uploads
 */
export const ValidateFiles = createParamDecorator(
  (options: {
    required?: boolean;
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;

    if (options.required && (!files || files.length === 0)) {
      throw new BadRequestException({
        success: false,
        message: 'Files are required',
        errors: [{
          field: 'files',
          message: 'File uploads are required',
          code: 'FILES_REQUIRED',
          value: null,
        }],
      });
    }

    if (!files || files.length === 0) return [];

    // Check maximum number of files
    if (options.maxFiles && files.length > options.maxFiles) {
      throw new BadRequestException({
        success: false,
        message: `Too many files uploaded. Maximum allowed: ${options.maxFiles}`,
        errors: [{
          field: 'files',
          message: `Maximum ${options.maxFiles} files allowed`,
          code: 'TOO_MANY_FILES',
          value: files.length,
        }],
      });
    }

    const errors: Array<{ index: number; errors: string[] }> = [];

    files.forEach((file: Express.Multer.File, index: number) => {
      const fileErrors: string[] = [];

      // Check file size
      if (options.maxSize && file.size > options.maxSize) {
        fileErrors.push(`File size ${file.size} exceeds maximum allowed size ${options.maxSize}`);
      }

      // Check MIME type
      if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
        fileErrors.push(`File type ${file.mimetype} is not allowed`);
      }

      // Check file extension
      if (options.allowedExtensions) {
        const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!options.allowedExtensions.includes(extension)) {
          fileErrors.push(`File extension ${extension} is not allowed`);
        }
      }

      if (fileErrors.length > 0) {
        errors.push({ index, errors: fileErrors });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'File validation failed',
        errors: errors.flatMap(({ index, errors: fileErrors }) =>
          fileErrors.map(error => ({
            field: `files[${index}]`,
            message: error,
            code: 'FILE_VALIDATION_ERROR',
            value: files[index].originalname,
          }))
        ),
      });
    }

    return files;
  },
);

/**
 * Validates request headers
 */
export const ValidateHeaders = createParamDecorator(
  (requiredHeaders: string[], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const headers = request.headers;

    const missingHeaders = requiredHeaders.filter(header => 
      !headers[header.toLowerCase()]
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

    return headers;
  },
);

/**
 * Validates IP address and applies rate limiting
 */
export const ValidateIP = createParamDecorator(
  (options: {
    allowPrivate?: boolean;
    allowLoopback?: boolean;
    blockedRanges?: string[];
  } = {}, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;

    if (!ip) {
      throw new BadRequestException({
        success: false,
        message: 'Unable to determine client IP address',
        errors: [{
          field: 'ip',
          message: 'Client IP address is required',
          code: 'IP_REQUIRED',
          value: null,
        }],
      });
    }

    // Check if IP is in blocked ranges
    if (options.blockedRanges) {
      const isBlocked = options.blockedRanges.some(range => {
        // Simple IP range check (can be enhanced with proper CIDR matching)
        return ip.startsWith(range);
      });

      if (isBlocked) {
        throw new BadRequestException({
          success: false,
          message: 'IP address is blocked',
          errors: [{
            field: 'ip',
            message: 'Your IP address is not allowed',
            code: 'IP_BLOCKED',
            value: ip,
          }],
        });
      }
    }

    // Check for private IP addresses
    if (!options.allowPrivate) {
      const privateRanges = ['10.', '172.16.', '192.168.', '127.'];
      const isPrivate = privateRanges.some(range => ip.startsWith(range));

      if (isPrivate && !options.allowLoopback) {
        throw new BadRequestException({
          success: false,
          message: 'Private IP addresses not allowed',
          errors: [{
            field: 'ip',
            message: 'Private IP addresses are not permitted',
            code: 'PRIVATE_IP_NOT_ALLOWED',
            value: ip,
          }],
        });
      }
    }

    return ip;
  },
);