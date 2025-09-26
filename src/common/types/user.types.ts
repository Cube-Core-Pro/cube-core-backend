export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard?: {
    layout: string;
    widgets: string[];
  };
  privacy?: {
    profileVisibility: 'public' | 'private' | 'contacts';
    activityTracking: boolean;
  };
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  permissions?: string[];
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}