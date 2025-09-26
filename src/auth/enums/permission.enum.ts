// path: backend/src/auth/enums/permission.enum.ts
// purpose: Enum de permisos para RBAC/ABAC
// dependencies: ninguna

export enum Permission {
  // Admin permissions
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  ADMIN_DELETE = 'admin:delete',
  
  // User management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  
  // Banking permissions
  BANKING_READ = 'banking:read',
  BANKING_WRITE = 'banking:write',
  BANKING_TRANSFER = 'banking:transfer',
  BANKING_ADMIN = 'banking:admin',
  BANKING_ACCOUNTING_READ = 'banking:accounting:read',
  BANKING_ACCOUNTING_WRITE = 'banking:accounting:write',
  
  // Banking Compliance permissions
  BANKING_COMPLIANCE_READ = 'banking:compliance:read',
  BANKING_COMPLIANCE_WRITE = 'banking:compliance:write',
  BANKING_COMPLIANCE_KYC_MANAGE = 'banking:compliance:kyc:manage',
  BANKING_COMPLIANCE_AML_MANAGE = 'banking:compliance:aml:manage',
  BANKING_COMPLIANCE_REPORTS_GENERATE = 'banking:compliance:reports:generate',
  
  // Banking Fraud permissions
  BANKING_FRAUD_READ = 'banking:fraud:read',
  BANKING_FRAUD_WRITE = 'banking:fraud:write',
  BANKING_FRAUD_APPROVE = 'banking:fraud:approve',
  
  // CRM permissions
  CRM_READ = 'crm:read',
  CRM_WRITE = 'crm:write',
  CRM_DELETE = 'crm:delete',
  
  // ERP permissions
  ERP_READ = 'erp:read',
  ERP_WRITE = 'erp:write',
  ERP_DELETE = 'erp:delete',
  
  // HR permissions
  HR_READ = 'hr:read',
  HR_WRITE = 'hr:write',
  HR_DELETE = 'hr:delete',
  
  // Accounting permissions
  ACCOUNTING_READ = 'accounting:read',
  ACCOUNTING_WRITE = 'accounting:write',
  ACCOUNTING_CLOSE = 'accounting:close',
  
  // Compliance permissions
  COMPLIANCE_READ = 'compliance:read',
  COMPLIANCE_WRITE = 'compliance:write',
  COMPLIANCE_AUDIT = 'compliance:audit',
  
  // Trading permissions
  TRADING_READ = 'trading:read',
  TRADING_WRITE = 'trading:write',
  TRADING_EXECUTE = 'trading:execute',
  
  // System permissions
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  SYSTEM_ADMIN = 'system:admin',
}