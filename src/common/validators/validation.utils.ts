// path: backend/src/common/validators/validation.utils.ts
// purpose: Validation utility functions and helpers
// dependencies: class-validator, class-transformer

import { validate, ValidationError as ClassValidationError } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { ValidationError } from '../types/api.types';

/**
 * Validates a DTO and throws BadRequestException if validation fails
 */
export async function validateDto<T extends object>(
  dtoClass: new () => T,
  data: unknown,
  options?: {
    skipMissingProperties?: boolean;
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
    transform?: boolean;
  }
): Promise<T> {
  const dto = plainToClass(dtoClass, data, {
    enableImplicitConversion: options?.transform ?? true,
  });

  const errors = await validate(dto, {
    skipMissingProperties: options?.skipMissingProperties ?? false,
    whitelist: options?.whitelist ?? true,
    forbidNonWhitelisted: options?.forbidNonWhitelisted ?? true,
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
}

/**
 * Formats class-validator errors into our standard format
 */
export function formatValidationErrors(errors: ClassValidationError[]): ValidationError[] {
  const result: ValidationError[] = [];

  function processError(error: ClassValidationError, parentPath = '') {
    const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      Object.entries(error.constraints).forEach(([code, message]) => {
        result.push({
          field: fieldPath,
          message,
          code,
          value: error.value,
        });
      });
    }

    if (error.children && error.children.length > 0) {
      error.children.forEach(child => processError(child, fieldPath));
    }
  }

  errors.forEach(error => processError(error));
  return result;
}

/**
 * Validates multiple DTOs in batch
 */
export async function validateDtoBatch<T extends object>(
  dtoClass: new () => T,
  dataArray: unknown[],
  options?: {
    skipMissingProperties?: boolean;
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
    transform?: boolean;
    continueOnError?: boolean;
  }
): Promise<{ valid: T[]; errors: Array<{ index: number; errors: ValidationError[] }> }> {
  const valid: T[] = [];
  const errors: Array<{ index: number; errors: ValidationError[] }> = [];

  for (let i = 0; i < dataArray.length; i++) {
    try {
      const validDto = await validateDto(dtoClass, dataArray[i], options);
      valid.push(validDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        errors.push({
          index: i,
          errors: error.getResponse()['errors'] || [],
        });
      } else {
        errors.push({
          index: i,
          errors: [{
            field: 'unknown',
            message: 'Unexpected validation error',
            code: 'UNKNOWN_ERROR',
            value: dataArray[i],
          }],
        });
      }

      if (!options?.continueOnError) {
        break;
      }
    }
  }

  return { valid, errors };
}

/**
 * Sanitizes input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates email format with additional business rules
 */
export function isValidBusinessEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for common typos in domains
  const commonDomainTypos = [
    'gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  return !commonDomainTypos.includes(domain);
}

/**
 * Validates password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (!password || typeof password !== 'string') {
    return { isValid: false, score: 0, feedback: ['Password is required'] };
  }

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one number');
  }

  // Special character check
  if (/[@$!%*?&]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain at least one special character (@$!%*?&)');
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('Password is too common');
  }

  return {
    isValid: score >= 4 && feedback.length === 0,
    score,
    feedback,
  };
}

/**
 * Validates phone number format
 */
export function validatePhoneNumber(phone: string, countryCode?: string): {
  isValid: boolean;
  formatted: string;
  country?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, formatted: phone };
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic international format validation
  if (!/^\+[1-9]\d{1,14}$/.test(cleaned)) {
    return { isValid: false, formatted: phone };
  }

  // Country-specific validation (basic examples)
  const countryPatterns: Record<string, RegExp> = {
    US: /^\+1[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    GB: /^\+44[1-9]\d{8,9}$/,
    DE: /^\+49[1-9]\d{10,11}$/,
    FR: /^\+33[1-9]\d{8}$/,
    ES: /^\+34[6-9]\d{8}$/,
    IT: /^\+39[0-9]\d{8,9}$/,
  };

  if (countryCode && countryPatterns[countryCode.toUpperCase()]) {
    const pattern = countryPatterns[countryCode.toUpperCase()];
    return {
      isValid: pattern.test(cleaned),
      formatted: cleaned,
      country: countryCode.toUpperCase(),
    };
  }

  return {
    isValid: true,
    formatted: cleaned,
  };
}

/**
 * Validates and formats currency amount
 */
export function validateCurrencyAmount(
  amount: number | string,
  currency: string,
  options?: {
    minAmount?: number;
    maxAmount?: number;
    allowNegative?: boolean;
  }
): {
  isValid: boolean;
  amount: number;
  formatted: string;
  errors: string[];
} {
  const errors: string[] = [];
  let numericAmount: number;

  // Convert to number
  if (typeof amount === 'string') {
    numericAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
  } else {
    numericAmount = amount;
  }

  // Check if valid number
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    errors.push('Amount must be a valid number');
    return { isValid: false, amount: 0, formatted: '0.00', errors };
  }

  // Check negative values
  if (numericAmount < 0 && !options?.allowNegative) {
    errors.push('Amount cannot be negative');
  }

  // Check minimum amount
  if (options?.minAmount !== undefined && numericAmount < options.minAmount) {
    errors.push(`Amount must be at least ${options.minAmount}`);
  }

  // Check maximum amount
  if (options?.maxAmount !== undefined && numericAmount > options.maxAmount) {
    errors.push(`Amount cannot exceed ${options.maxAmount}`);
  }

  // Format amount (2 decimal places)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return {
    isValid: errors.length === 0,
    amount: Math.round(numericAmount * 100) / 100, // Round to 2 decimal places
    formatted,
    errors,
  };
}

/**
 * Transform decorator for trimming strings
 */
export const Trim = () => Transform(({ value }) => 
  typeof value === 'string' ? value.trim() : value
);

/**
 * Transform decorator for converting to lowercase
 */
export const ToLowerCase = () => Transform(({ value }) => 
  typeof value === 'string' ? value.toLowerCase() : value
);

/**
 * Transform decorator for converting to uppercase
 */
export const ToUpperCase = () => Transform(({ value }) => 
  typeof value === 'string' ? value.toUpperCase() : value
);

/**
 * Transform decorator for sanitizing HTML
 */
export const SanitizeHtml = () => Transform(({ value }) => 
  typeof value === 'string' ? sanitizeInput(value) : value
);