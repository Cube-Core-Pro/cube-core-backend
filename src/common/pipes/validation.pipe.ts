// path: backend/src/common/pipes/validation.pipe.ts
// purpose: Enterprise-grade validation pipes with comprehensive input sanitization and validation
// dependencies: @nestjs/common, class-validator, class-transformer

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { sanitizeObject } from '../validators/sanitization.utils';
import { formatValidationErrors } from '../validators/validation.utils';

export interface ValidationPipeOptions {
  transform?: boolean;
  disableErrorMessages?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  validateCustomDecorators?: boolean;
  enableDebugMessages?: boolean;
  sanitize?: boolean;
  maxDepth?: number;
}

@Injectable()
export class EnterpriseValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(EnterpriseValidationPipe.name);

  constructor(private options: ValidationPipeOptions = {}) {
    this.options = {
      transform: true,
      disableErrorMessages: false,
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
      validateCustomDecorators: true,
      enableDebugMessages: false,
      sanitize: true,
      maxDepth: 10,
      ...options,
    };
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const { metatype, type, data } = metadata;

    // Skip validation for primitive types
    if (!metatype || !this.toValidate(metatype)) {
      return this.options.sanitize ? this.sanitizeValue(value) : value;
    }

    // Sanitize input if enabled
    if (this.options.sanitize && value && typeof value === 'object') {
      value = this.sanitizeInput(value, type);
    }

    // Transform plain object to class instance
    const object = plainToClass(metatype, value, {
      enableImplicitConversion: this.options.transform,
      excludeExtraneousValues: this.options.whitelist,
    });

    // Validate the object
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: this.options.skipMissingProperties,
      validateCustomDecorators: this.options.validateCustomDecorators,
    });

    if (errors.length > 0) {
      if (this.options.enableDebugMessages) {
        this.logger.debug(`Validation failed for ${metatype.name}:`, errors);
      }

      const formattedErrors = formatValidationErrors(errors);
      
      throw new BadRequestException({
        success: false,
        message: this.options.disableErrorMessages 
          ? 'Validation failed' 
          : 'Input validation failed',
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
        path: data || type,
      });
    }

    return this.options.transform ? object : value;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any, type?: string): any {
    if (!value || typeof value !== 'object') {
      return this.sanitizeValue(value);
    }

    // Different sanitization based on input type
    switch (type) {
      case 'body':
        return sanitizeObject(value, {
          allowHtml: false,
          maxStringLength: 10000,
          removeEmptyStrings: false,
        });
      case 'query':
        return sanitizeObject(value, {
          allowHtml: false,
          maxStringLength: 1000,
          removeEmptyStrings: true,
        });
      case 'param':
        return sanitizeObject(value, {
          allowHtml: false,
          maxStringLength: 100,
          removeEmptyStrings: false,
        });
      default:
        return sanitizeObject(value, {
          allowHtml: false,
          maxStringLength: 5000,
          removeEmptyStrings: false,
        });
    }
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    return value;
  }
}

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException({
        success: false,
        message: 'UUID is required',
        errors: [{
          field: metadata.data || 'id',
          message: 'UUID parameter is required',
          code: 'UUID_REQUIRED',
          value: null,
        }],
      });
    }

    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid UUID format',
        errors: [{
          field: metadata.data || 'id',
          message: 'Parameter must be a valid UUID',
          code: 'INVALID_UUID',
          value: value,
        }],
      });
    }

    return value;
  }
}

// ParseIntPipe is exported from parse-int.pipe.ts to avoid duplication

@Injectable()
export class ParseBooleanPipe implements PipeTransform<string, boolean> {
  constructor(private optional: boolean = false) {}

  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (!value && this.optional) {
      return undefined;
    }

    if (!value) {
      throw new BadRequestException({
        success: false,
        message: 'Boolean is required',
        errors: [{
          field: metadata.data || 'value',
          message: 'Boolean parameter is required',
          code: 'BOOLEAN_REQUIRED',
          value: null,
        }],
      });
    }

    const lowerValue = value.toLowerCase();
    
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return true;
    }
    
    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return false;
    }

    throw new BadRequestException({
      success: false,
      message: 'Invalid boolean format',
      errors: [{
        field: metadata.data || 'value',
        message: 'Parameter must be a valid boolean (true/false, 1/0, yes/no, on/off)',
        code: 'INVALID_BOOLEAN',
        value: value,
      }],
    });
  }
}

@Injectable()
export class ParseArrayPipe implements PipeTransform<string, any[]> {
  constructor(
    private options: {
      items?: 'string' | 'number' | 'boolean';
      separator?: string;
      maxItems?: number;
      minItems?: number;
      optional?: boolean;
    } = {}
  ) {
    this.options = {
      separator: ',',
      maxItems: 100,
      minItems: 0,
      ...options,
    };
  }

  transform(value: string, metadata: ArgumentMetadata): any[] {
    if (!value && this.options.optional) {
      return undefined;
    }

    if (!value) {
      throw new BadRequestException({
        success: false,
        message: 'Array is required',
        errors: [{
          field: metadata.data || 'value',
          message: 'Array parameter is required',
          code: 'ARRAY_REQUIRED',
          value: null,
        }],
      });
    }

    const items = value.split(this.options.separator).map(item => item.trim());

    if (items.length < this.options.minItems) {
      throw new BadRequestException({
        success: false,
        message: `Array must have at least ${this.options.minItems} items`,
        errors: [{
          field: metadata.data || 'value',
          message: `Array must contain at least ${this.options.minItems} items`,
          code: 'ARRAY_TOO_SHORT',
          value: items.length,
        }],
      });
    }

    if (items.length > this.options.maxItems) {
      throw new BadRequestException({
        success: false,
        message: `Array must have at most ${this.options.maxItems} items`,
        errors: [{
          field: metadata.data || 'value',
          message: `Array cannot contain more than ${this.options.maxItems} items`,
          code: 'ARRAY_TOO_LONG',
          value: items.length,
        }],
      });
    }

    // Transform items based on type
    if (this.options.items) {
      return items.map((item, index) => {
        try {
          switch (this.options.items) {
            case 'number':
              const num = parseFloat(item);
              if (isNaN(num)) {
                throw new Error(`Item at index ${index} is not a valid number`);
              }
              return num;
            case 'boolean':
              const lowerItem = item.toLowerCase();
              if (['true', '1', 'yes', 'on'].includes(lowerItem)) return true;
              if (['false', '0', 'no', 'off'].includes(lowerItem)) return false;
              throw new Error(`Item at index ${index} is not a valid boolean`);
            case 'string':
            default:
              return item;
          }
        } catch (error) {
          throw new BadRequestException({
            success: false,
            message: 'Invalid array item format',
            errors: [{
              field: metadata.data || 'value',
              message: error.message,
              code: 'INVALID_ARRAY_ITEM',
              value: item,
            }],
          });
        }
      });
    }

    return items;
  }
}

// Legacy ValidationPipe for backward compatibility
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors.map(error => {
        return Object.values(error.constraints || {}).join(', ');
      });
      throw new BadRequestException(`Validation failed: ${errorMessages.join('; ')}`);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}