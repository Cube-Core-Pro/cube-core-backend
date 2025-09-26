// path: backend/src/common/validators/sanitization.utils.ts
// purpose: Input sanitization utilities for security
// dependencies: None (pure JavaScript/TypeScript)

/**
 * Comprehensive input sanitization utilities
 */

/**
 * Sanitizes HTML content by removing dangerous elements and attributes
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    // Remove embed tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove form tags
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // Remove input tags
    .replace(/<input\b[^>]*>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove data: protocol (except images)
    .replace(/data:(?!image\/)/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove style attributes with expressions
    .replace(/style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, '')
    .trim();
}

/**
 * Sanitizes SQL input to prevent injection attacks
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove SQL comments
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove dangerous SQL keywords
    .replace(/\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|EXEC|EXECUTE|UNION|SELECT)\b/gi, '')
    // Remove semicolons (statement separators)
    .replace(/;/g, '')
    // Remove single quotes (escape them instead)
    .replace(/'/g, "''")
    .trim();
}

/**
 * Sanitizes NoSQL injection attempts
 */
export function sanitizeNoSql(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(/\$where/gi, '')
      .replace(/\$regex/gi, '')
      .replace(/\$ne/gi, '')
      .replace(/\$gt/gi, '')
      .replace(/\$lt/gi, '')
      .replace(/\$or/gi, '')
      .replace(/\$and/gi, '')
      .trim();
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Remove dangerous MongoDB operators
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeNoSql(value);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Sanitizes file paths to prevent directory traversal
 */
export function sanitizeFilePath(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    .replace(/\.\//g, '')
    .replace(/\\/g, '/')
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x7f]/g, '')
    // Remove dangerous characters
    .replace(/[<>:"|?*]/g, '')
    .trim();
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') return input as any;

  // Remove any HTML/script content first
  let sanitized = sanitizeHtml(input);

  // Normalize case and trim
  sanitized = sanitized.toLowerCase().trim();

  // Keep only valid email characters; preserve a single '@'
  // Split local and domain parts safely
  const atIndex = sanitized.indexOf('@');
  let local = atIndex >= 0 ? sanitized.slice(0, atIndex) : sanitized;
  let domain = atIndex >= 0 ? sanitized.slice(atIndex + 1) : '';

  // Remove any characters not allowed in local/domain parts
  local = local.replace(/[^a-z0-9!#$%&'*+/=?^_`{|}~.-]/g, '');
  domain = domain.replace(/[^a-z0-9.-]/g, '');

  // Remove dangerous substrings like 'script' from local part (case-insensitive)
  if (local) {
    local = local.replace(/script/gi, '');
  }

  // Collapse multiple dots and trim dots/hyphens
  local = local.replace(/\.+/g, '.').replace(/^[.-]+|[.-]+$/g, '');
  domain = domain.replace(/\.\.+/g, '.').replace(/^[.-]+|[.-]+$/g, '');

  if (!domain) {
    return local;
  }

  return `${local}@${domain}`
    // Ensure only one '@' if any residual
    .replace(/@+/, '@');
}

/**
 * Sanitizes phone numbers
 */
export function sanitizePhoneNumber(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Keep only digits, +, -, (, ), and spaces
    .replace(/[^\d+\-() ]/g, '')
    .trim();
}

/**
 * Sanitizes URLs
 */
export function sanitizeUrl(input: string): string {
  if (typeof input !== 'string') return input;

  // Only allow http and https protocols
  const urlRegex = /^https?:\/\//i;
  if (!urlRegex.test(input)) {
    return '';
  }

  return input
    .trim()
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove data: protocol
    .replace(/data:/gi, '');
}

/**
 * Sanitizes JSON input
 */
export function sanitizeJson(input: string): string {
  if (typeof input !== 'string') return input;

  try {
    // Parse and stringify to remove any malicious content
    const parsed = JSON.parse(input);
    return JSON.stringify(sanitizeNoSql(parsed));
  } catch {
    return '{}';
  }
}

/**
 * Sanitizes credit card numbers (for logging/display)
 */
export function sanitizeCreditCard(input: string): string {
  if (typeof input !== 'string') return input;

  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length < 13) return input;

  // Show only first 4 and last 4 digits
  return cleaned.replace(/(\d{4})\d*(\d{4})/, '$1****$2');
}

/**
 * Sanitizes SSN (for logging/display)
 */
export function sanitizeSSN(input: string): string {
  if (typeof input !== 'string') return input;

  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length !== 9) return input;

  // Show only last 4 digits
  return `***-**-${cleaned.slice(-4)}`;
}

/**
 * General purpose text sanitizer
 */
export function sanitizeText(input: string, options?: {
  allowHtml?: boolean;
  maxLength?: number;
  removeNewlines?: boolean;
  removeExtraSpaces?: boolean;
}): string {
  if (typeof input !== 'string') return input;

  let sanitized = input;

  // Remove HTML if not allowed
  if (!options?.allowHtml) {
    sanitized = sanitizeHtml(sanitized);
  }

  // Remove newlines if requested
  if (options?.removeNewlines) {
    sanitized = sanitized.replace(/\r?\n|\r/g, ' ');
  }

  // Remove extra spaces if requested
  if (options?.removeExtraSpaces) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  // Trim whitespace
  sanitized = sanitized.trim();

  // Truncate if max length specified
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitizes object recursively
 */
export function sanitizeObject(
  obj: Record<string, unknown>,
  options?: {
    allowHtml?: boolean;
    maxStringLength?: number;
    removeEmptyStrings?: boolean;
  }
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const sanitizedValue = sanitizeText(value, {
        allowHtml: options?.allowHtml,
        maxLength: options?.maxStringLength,
        removeExtraSpaces: true,
      });

      if (!options?.removeEmptyStrings || sanitizedValue.length > 0) {
        sanitized[key] = sanitizedValue;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeObject(item as Record<string, unknown>, options)
          : typeof item === 'string'
          ? sanitizeText(item, { allowHtml: options?.allowHtml })
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates and sanitizes file upload
 */
export function sanitizeFileUpload(file: {
  originalname: string;
  mimetype: string;
  size: number;
}, options?: {
  allowedTypes?: string[];
  maxSize?: number;
  sanitizeFilename?: boolean;
}): {
  isValid: boolean;
  sanitizedFilename: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitizedFilename = file.originalname;

  // Sanitize filename
  if (options?.sanitizeFilename !== false) {
    sanitizedFilename = sanitizeFilePath(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Check file type
  if (options?.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  // Check file size
  if (options?.maxSize && file.size > options.maxSize) {
    errors.push(`File size ${file.size} exceeds maximum allowed size ${options.maxSize}`);
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.php', '.asp', '.aspx', '.jsp', '.sh', '.ps1'
  ];

  const extension = sanitizedFilename.toLowerCase().substring(sanitizedFilename.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  return {
    isValid: errors.length === 0,
    sanitizedFilename,
    errors,
  };
}