import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  constructor(
    private options: {
      min?: number;
      max?: number;
      optional?: boolean;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): number {
    if (!value && this.options.optional) {
      return undefined;
    }

    if (!value) {
      throw new BadRequestException({
        success: false,
        message: 'Integer is required',
        errors: [{
          field: metadata.data || 'value',
          message: 'Integer parameter is required',
          code: 'INTEGER_REQUIRED',
          value: null,
        }],
      });
    }

    const parsed = parseInt(value, 10);

    if (isNaN(parsed)) {
      throw new BadRequestException({
        success: false,
        message: 'Invalid integer format',
        errors: [{
          field: metadata.data || 'value',
          message: 'Parameter must be a valid integer',
          code: 'INVALID_INTEGER',
          value: value,
        }],
      });
    }

    if (this.options.min !== undefined && parsed < this.options.min) {
      throw new BadRequestException({
        success: false,
        message: `Integer must be at least ${this.options.min}`,
        errors: [{
          field: metadata.data || 'value',
          message: `Value must be at least ${this.options.min}`,
          code: 'INTEGER_TOO_SMALL',
          value: parsed,
        }],
      });
    }

    if (this.options.max !== undefined && parsed > this.options.max) {
      throw new BadRequestException({
        success: false,
        message: `Integer must be at most ${this.options.max}`,
        errors: [{
          field: metadata.data || 'value',
          message: `Value must be at most ${this.options.max}`,
          code: 'INTEGER_TOO_LARGE',
          value: parsed,
        }],
      });
    }

    return parsed;
  }
}