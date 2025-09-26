// path: backend/src/common/types/auth.types.ts
// purpose: Type-safe authentication interfaces and types
// dependencies: None (pure TypeScript types)

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Omit<AuthenticatedUser, 'password'>;
  expires_in: number;
}

export interface RefreshTokenData {
  token: string;
  userId: string;
  createdAt: Date;
}

export interface PasswordResetData {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface EmailVerificationData {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface AuthValidationResult {
  isValid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

export type BiometricAuthType =
  | 'FINGERPRINT'
  | 'FACE'
  | 'IRIS'
  | 'VOICE'
  | 'PALM'
  | 'PALM_VEIN';

export interface SecurityContext {
  userId: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
}

// Enums for better type safety
export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  SAML = 'saml',
  LDAP = 'ldap'
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  USER = 'user',
  VIEWER = 'viewer',
  API_USER = 'api_user'
}

export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Tenant management
  TENANT_CREATE = 'tenant:create',
  TENANT_READ = 'tenant:read',
  TENANT_UPDATE = 'tenant:update',
  TENANT_DELETE = 'tenant:delete',
  
  // System administration
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_METRICS = 'system:metrics',
  
  // Module permissions (will be extended)
  CRM_ACCESS = 'crm:access',
  ERP_ACCESS = 'erp:access',
  BANKING_ACCESS = 'banking:access',
  ADMIN_ACCESS = 'admin:access'
}

export type AuthError = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'PASSWORD_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

// Fortune 500 Enterprise Security Types
export interface EnterpriseSecurityConfig {
  zeroTrustEnabled: boolean;
  biometricAuthEnabled: boolean;
  quantumEncryptionEnabled: boolean;
  threatIntelligenceEnabled: boolean;
  privilegedAccessManagement: boolean;
  continuousMonitoring: boolean;
  adaptiveAuthentication: boolean;
  riskBasedAccess: boolean;
  deviceTrustVerification: boolean;
  behavioralAnalytics: boolean;
}

export interface BiometricMetadata {
  deviceInfo: string;
  enrollmentQuality: number;
  templateVersion: string;
  [key: string]: unknown;
}

export interface BiometricAuthData {
  biometricId: string;
  userId: string;
  type: BiometricAuthType;
  biometricType?: BiometricAuthType;
  biometricHash: string;
  template?: string;
  deviceId: string;
  enrolledAt: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  confidenceScore: number;
  metadata: BiometricMetadata;
}

export interface ZeroTrustSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  trustScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contextualFactors: {
    location: {
      country: string;
      city: string;
      coordinates?: { lat: number; lng: number };
      isKnownLocation: boolean;
    };
    device: {
      fingerprint: string;
      isManaged: boolean;
      complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
      lastSecurityScan?: Date;
    };
    network: {
      ipAddress: string;
      isCorporateNetwork: boolean;
      vpnStatus: boolean;
      threatIntelligence: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS';
    };
    behavioral: {
      typingPattern: string;
      mouseMovement: string;
      accessPatterns: string[];
      anomalyScore: number;
    };
  };
  accessMetrics: {
    sessionStart: Date;
    loginAttempts: number;
    failedMfaAttempts: number;
    lastActivity: Date;
  };
  policies: {
    requireMfa: boolean;
    allowedResources: string[];
    sessionTimeout: number;
    reauthenticationRequired: boolean;
  };
  createdAt: Date;
  lastValidatedAt: Date;
  expiresAt: Date;
}

export interface QuantumEncryptionSession {
  sessionId: string;
  userId: string;
  quantumKeyId: string;
  encryptionAlgorithm: 'QUANTUM_SAFE_RSA' | 'LATTICE_BASED' | 'HASH_BASED' | 'CODE_BASED';
  keyExchangeProtocol: 'QUANTUM_KEY_DISTRIBUTION' | 'POST_QUANTUM_DIFFIE_HELLMAN';
  encryptionStrength: number;
  quantumResistant: boolean;
  keyRotationSchedule: {
    frequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
    lastRotation: Date;
    nextRotation: Date;
  };
  quantumMetrics: {
    quantumRandomnessSource: string;
    entropyLevel: number;
    quantumSupremacyVerified: boolean;
    postQuantumCompliance: boolean;
  };
  createdAt: Date;
  expiresAt: Date;
}

export interface CyberSecurityThreat {
  threatId: string;
  threatType: 'MALWARE' | 'PHISHING' | 'RANSOMWARE' | 'APT' | 'INSIDER' | 'DDOS' | 'DATA_BREACH' | 'LOGIN_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: {
    ipAddress: string;
    country: string;
    organization?: string;
    threatActor?: string;
  };
  target: {
    userId?: string;
    resource: string;
    attackVector: string;
  };
  indicators: {
    iocs: string[]; // Indicators of Compromise
    ttps: string[]; // Tactics, Techniques, and Procedures
    signatures: string[];
  };
  timeline: {
    detectedAt: Date;
    firstSeenAt?: Date;
    lastSeenAt?: Date;
    resolvedAt?: Date;
  };
  impact: {
    affectedSystems: string[];
    dataCompromised: boolean;
    businessImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimatedCost?: number;
  };
  response: {
    status: 'DETECTED' | 'INVESTIGATING' | 'CONTAINED' | 'ERADICATED' | 'RECOVERED';
    actions: string[];
    assignedTo?: string;
    notes?: string;
  };
  intelligence: {
    threatIntelligenceFeeds: string[];
    confidence: number;
    falsePositiveProbability: number;
    relatedThreats: string[];
  };
}
