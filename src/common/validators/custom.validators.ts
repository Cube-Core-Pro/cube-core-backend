// path: backend/src/common/validators/custom.validators.ts
// purpose: Custom validation constraints for business-specific rules
// dependencies: class-validator, prisma

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Unique field validator (async)
@ValidatorConstraint({ name: 'isUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    if (!value) return true; // Let other validators handle required validation

    const [model, field, excludeId] = args.constraints;
    const record = await (this.prisma as any)[model].findFirst({
      where: {
        [field]: value,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !record;
  }

  defaultMessage(args: ValidationArguments): string {
    const [, field] = args.constraints;
    return `${field} already exists`;
  }
}

export function IsUnique(
  model: string,
  field: string,
  excludeId?: string,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, field, excludeId],
      validator: IsUniqueConstraint,
    });
  };
}

// Exists validator (async)
@ValidatorConstraint({ name: 'exists', async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(private prisma: PrismaService) {}

  async validate(value: string, args: ValidationArguments): Promise<boolean> {
    if (!value) return true; // Let other validators handle required validation

    const [model, field] = args.constraints;
    const record = await (this.prisma as any)[model].findFirst({
      where: { [field]: value },
    });

    return !!record;
  }

  defaultMessage(args: ValidationArguments): string {
    const [model] = args.constraints;
    return `${model} does not exist`;
  }
}

export function Exists(
  model: string,
  field: string = 'id',
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, field],
      validator: ExistsConstraint,
    });
  };
}

// Business hours validator
@ValidatorConstraint({ name: 'isBusinessHours', async: false })
export class IsBusinessHoursConstraint implements ValidatorConstraintInterface {
  validate(value: { start: string; end: string }[], _args: ValidationArguments): boolean {
    if (!Array.isArray(value)) return false;

    for (const hours of value) {
      if (!hours.start || !hours.end) return false;
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(hours.start) || !timeRegex.test(hours.end)) {
        return false;
      }

      // Validate that start time is before end time
      const [startHour, startMin] = hours.start.split(':').map(Number);
      const [endHour, endMin] = hours.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Business hours must be valid time ranges in HH:MM format';
  }
}

export function IsBusinessHours(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBusinessHoursConstraint,
    });
  };
}

// Credit card number validator (Luhn algorithm)
@ValidatorConstraint({ name: 'isCreditCard', async: false })
export class IsCreditCardConstraint implements ValidatorConstraintInterface {
  validate(cardNumber: string, _args: ValidationArguments): boolean {
    if (!cardNumber || typeof cardNumber !== 'string') return false;

    // Remove spaces and hyphens
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Check if all digits
    if (!/^\d+$/.test(cleaned)) return false;
    
    // Check length (13-19 digits)
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid credit card number';
  }
}

export function IsCreditCard(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCreditCardConstraint,
    });
  };
}

// Bank routing number validator (US)
@ValidatorConstraint({ name: 'isRoutingNumber', async: false })
export class IsRoutingNumberConstraint implements ValidatorConstraintInterface {
  validate(routingNumber: string, _args: ValidationArguments): boolean {
    if (!routingNumber || typeof routingNumber !== 'string') return false;

    // Remove spaces and hyphens
    const cleaned = routingNumber.replace(/[\s-]/g, '');
    
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(cleaned)) return false;

    // ABA routing number checksum
    const digits = cleaned.split('').map(Number);
    const checksum = 
      3 * (digits[0] + digits[3] + digits[6]) +
      7 * (digits[1] + digits[4] + digits[7]) +
      (digits[2] + digits[5] + digits[8]);

    return checksum % 10 === 0;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid routing number';
  }
}

export function IsRoutingNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRoutingNumberConstraint,
    });
  };
}

// Social Security Number validator (US)
@ValidatorConstraint({ name: 'isSSN', async: false })
export class IsSSNConstraint implements ValidatorConstraintInterface {
  validate(ssn: string, _args: ValidationArguments): boolean {
    if (!ssn || typeof ssn !== 'string') return false;

    // Remove spaces and hyphens
    const cleaned = ssn.replace(/[\s-]/g, '');
    
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(cleaned)) return false;

    // Invalid patterns
    const invalidPatterns = [
      /^000/, // Area number 000
      /^666/, // Area number 666
      /^9[0-9][0-9]/, // Area numbers 900-999
      /^[0-9]{3}00/, // Group number 00
      /^[0-9]{5}0000$/, // Serial number 0000
    ];

    return !invalidPatterns.some(pattern => pattern.test(cleaned));
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid Social Security Number';
  }
}

export function IsSSN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSSNConstraint,
    });
  };
}

// IP address validator
@ValidatorConstraint({ name: 'isIPAddress', async: false })
export class IsIPAddressConstraint implements ValidatorConstraintInterface {
  validate(ip: string, args: ValidationArguments): boolean {
    if (!ip || typeof ip !== 'string') return false;

    const [version] = args.constraints || ['4'];

    if (version === '4' || version === 'v4') {
      return this.isIPv4(ip);
    } else if (version === '6' || version === 'v6') {
      return this.isIPv6(ip);
    } else {
      return this.isIPv4(ip) || this.isIPv6(ip);
    }
  }

  private isIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  private isIPv6(ip: string): boolean {
    // Simplified IPv6 validation
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    return ipv6Regex.test(ip);
  }

  defaultMessage(args: ValidationArguments): string {
    const [version] = args.constraints || ['4'];
    return `Invalid IPv${version} address`;
  }
}

export function IsIPAddress(version?: '4' | '6' | 'v4' | 'v6', validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [version],
      validator: IsIPAddressConstraint,
    });
  };
}

// MAC address validator
@ValidatorConstraint({ name: 'isMACAddress', async: false })
export class IsMACAddressConstraint implements ValidatorConstraintInterface {
  validate(mac: string, _args: ValidationArguments): boolean {
    if (!mac || typeof mac !== 'string') return false;

    // Support different formats: XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, XXXXXXXXXXXX
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^[0-9A-Fa-f]{12}$/;
    return macRegex.test(mac);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid MAC address format';
  }
}

export function IsMACAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsMACAddressConstraint,
    });
  };
}