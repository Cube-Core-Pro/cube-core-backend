import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

@Injectable()
export class PasswordPolicyService {
  private readonly defaultPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
  };

  private readonly commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', 'shadow', 'superman', 'michael',
    'football', 'baseball', 'liverpool', 'jordan', 'princess',
  ];

  constructor(private configService: ConfigService) {}

  private getPolicy(): PasswordPolicy {
    return {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH') || this.defaultPolicy.minLength,
      maxLength: this.configService.get<number>('PASSWORD_MAX_LENGTH') || this.defaultPolicy.maxLength,
      requireUppercase: this.configService.get<boolean>('PASSWORD_REQUIRE_UPPERCASE') ?? this.defaultPolicy.requireUppercase,
      requireLowercase: this.configService.get<boolean>('PASSWORD_REQUIRE_LOWERCASE') ?? this.defaultPolicy.requireLowercase,
      requireNumbers: this.configService.get<boolean>('PASSWORD_REQUIRE_NUMBERS') ?? this.defaultPolicy.requireNumbers,
      requireSpecialChars: this.configService.get<boolean>('PASSWORD_REQUIRE_SPECIAL') ?? this.defaultPolicy.requireSpecialChars,
      preventCommonPasswords: this.configService.get<boolean>('PASSWORD_PREVENT_COMMON') ?? this.defaultPolicy.preventCommonPasswords,
      preventUserInfoInPassword: this.configService.get<boolean>('PASSWORD_PREVENT_USER_INFO') ?? this.defaultPolicy.preventUserInfoInPassword,
    };
  }

  validatePassword(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
  ): PasswordValidationResult {
    const policy = this.getPolicy();
    const errors: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    } else {
      score += Math.min(25, (password.length / policy.minLength) * 10);
    }

    if (password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    // Character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 20;
    }

    // Common password check
    if (policy.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (this.commonPasswords.includes(lowerPassword)) {
        errors.push('Password is too common. Please choose a more unique password');
        score -= 30;
      }
    }

    // User info in password check
    if (policy.preventUserInfoInPassword && userInfo) {
      const lowerPassword = password.toLowerCase();
      
      if (userInfo.email) {
        const emailParts = userInfo.email.toLowerCase().split('@')[0];
        if (emailParts && (lowerPassword.includes(emailParts) || emailParts.includes(lowerPassword))) {
          errors.push('Password should not contain parts of your email');
          score -= 20;
        }
      }

      if (userInfo.firstName && lowerPassword.includes(userInfo.firstName.toLowerCase())) {
        errors.push('Password should not contain your first name');
        score -= 15;
      }

      if (userInfo.lastName && lowerPassword.includes(userInfo.lastName.toLowerCase())) {
        errors.push('Password should not contain your last name');
        score -= 15;
      }
    }

    // Additional complexity scoring
    const uniqueChars = new Set(password).size;
    score += Math.min(10, uniqueChars / 2);

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score >= 80) strength = 'very-strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';
    else strength = 'weak';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score,
    };
  }

  validatePasswordOrThrow(
    password: string,
    userInfo?: { email?: string; firstName?: string; lastName?: string }
  ): void {
    const result = this.validatePassword(password, userInfo);
    if (!result.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: result.errors,
        strength: result.strength,
        score: result.score,
      });
    }
  }

  generatePasswordRequirements(): string[] {
    const policy = this.getPolicy();
    const requirements: string[] = [];

    requirements.push(`Must be between ${policy.minLength} and ${policy.maxLength} characters long`);
    
    if (policy.requireUppercase) requirements.push('Must contain at least one uppercase letter');
    if (policy.requireLowercase) requirements.push('Must contain at least one lowercase letter');
    if (policy.requireNumbers) requirements.push('Must contain at least one number');
    if (policy.requireSpecialChars) requirements.push('Must contain at least one special character');
    if (policy.preventCommonPasswords) requirements.push('Must not be a commonly used password');
    if (policy.preventUserInfoInPassword) requirements.push('Must not contain personal information');

    return requirements;
  }
}