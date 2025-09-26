// path: backend/src/auth/types/auth.types.ts
// purpose: Authentication types and interfaces
// dependencies: none

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  mfaEnabled: boolean;
  avatar?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PasswordResetRequest {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MfaVerificationRequest {
  userId: string;
  token: string;
  type: 'totp' | 'backup';
}

export interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: SessionInfo;
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

export interface TenantContext {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  settings: Record<string, any>;
  features: string[];
  limits: Record<string, number>;
}

export interface RolePermission {
  role: string;
  permissions: string[];
  resources: string[];
  conditions?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'mfa_setup' | 'mfa_disable';
  userId: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  passwordResetExpiresIn: string;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  mfaRequired: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    preventReuse: number;
  };
}