// path: backend/src/common/validators/validation.decorators.ts
// purpose: Custom validation decorators for enterprise-grade validation
// dependencies: class-validator, reflect-metadata

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
  
  
  
  
} from 'class-validator';

// Strong password validator
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, _args: ValidationArguments): boolean {
    if (!password || typeof password !== 'string') return false;
    
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

// Business email validator
@ValidatorConstraint({ name: 'isBusinessEmail', async: false })
export class IsBusinessEmailConstraint implements ValidatorConstraintInterface {
  private freeEmailProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'yandex.com'
  ];

  validate(email: string, _args: ValidationArguments): boolean {
    if (!isEmail(email)) return false;
    
    const domain = email.split('@')[1]?.toLowerCase();
    return !this.freeEmailProviders.includes(domain);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Business email address required (free email providers not allowed)';
  }
}

export function IsBusinessEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBusinessEmailConstraint,
    });
  };
}

// Phone number validator
@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string, _args: ValidationArguments): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    // International phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Phone number must be in international format (e.g., +1234567890)';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

// Tax ID validator (flexible for different countries)
@ValidatorConstraint({ name: 'isTaxId', async: false })
export class IsTaxIdConstraint implements ValidatorConstraintInterface {
  validate(taxId: string, _args: ValidationArguments): boolean {
    if (!taxId || typeof taxId !== 'string') return false;
    
    // Remove spaces and hyphens
    const cleanTaxId = taxId.replace(/[\s-]/g, '');
    
    // Basic validation - alphanumeric, 6-20 characters
    return /^[A-Z0-9]{6,20}$/i.test(cleanTaxId);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Tax ID must be 6-20 alphanumeric characters';
  }
}

export function IsTaxId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTaxIdConstraint,
    });
  };
}

// Currency code validator
@ValidatorConstraint({ name: 'isCurrencyCode', async: false })
export class IsCurrencyCodeConstraint implements ValidatorConstraintInterface {
  private validCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'ZAR', 'BRL', 'INR', 'KRW', 'PLN'
  ];

  validate(currency: string, _args: ValidationArguments): boolean {
    if (!currency || typeof currency !== 'string') return false;
    return this.validCurrencies.includes(currency.toUpperCase());
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Currency code must be a valid ISO 4217 code';
  }
}

export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCurrencyCodeConstraint,
    });
  };
}

// IBAN validator
@ValidatorConstraint({ name: 'isIBAN', async: false })
export class IsIBANConstraint implements ValidatorConstraintInterface {
  validate(iban: string, _args: ValidationArguments): boolean {
    if (!iban || typeof iban !== 'string') return false;
    
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic IBAN format check (2 letters + 2 digits + up to 30 alphanumeric)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(cleanIban)) {
      return false;
    }
    
    // IBAN checksum validation (mod 97)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericString = rearranged.replace(/[A-Z]/g, (char) => 
      (char.charCodeAt(0) - 55).toString()
    );
    
    return this.mod97(numericString) === 1;
  }

  private mod97(str: string): number {
    let remainder = 0;
    for (let i = 0; i < str.length; i++) {
      remainder = (remainder * 10 + parseInt(str[i])) % 97;
    }
    return remainder;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Invalid IBAN format or checksum';
  }
}

export function IsIBAN(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIBANConstraint,
    });
  };
}

// Tenant slug validator
@ValidatorConstraint({ name: 'isTenantSlug', async: false })
export class IsTenantSlugConstraint implements ValidatorConstraintInterface {
  validate(slug: string, _args: ValidationArguments): boolean {
    if (!slug || typeof slug !== 'string') return false;
    
    // 3-50 characters, lowercase letters, numbers, hyphens only
    // Must start and end with alphanumeric
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && 
           slug.length >= 3 && 
           slug.length <= 50;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Tenant slug must be 3-50 characters, lowercase letters, numbers, and hyphens only';
  }
}

export function IsTenantSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTenantSlugConstraint,
    });
  };
}

// JSON schema validator
@ValidatorConstraint({ name: 'isValidJSON', async: false })
export class IsValidJSONConstraint implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') return false;
    
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Value must be valid JSON';
  }
}

export function IsValidJSON(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidJSONConstraint,
    });
  };
}

// Date range validator
export function IsDateRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: { startDate: Date; endDate: Date }, _args: ValidationArguments) {
          if (!value || !value.startDate || !value.endDate) return false;
          return new Date(value.startDate) <= new Date(value.endDate);
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Start date must be before or equal to end date';
        },
      },
    });
  };
}