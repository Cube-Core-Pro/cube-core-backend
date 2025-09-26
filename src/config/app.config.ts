import { registerAs } from "@nestjs/config";

export default registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '3001', 10),
  globalPrefix: 'api/v1',
  
  // Security
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
  
  // CORS
  corsOrigin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  corsCredentials: process.env['CORS_CREDENTIALS'] === 'true',
  
  // Rate Limiting
  throttleTtl: parseInt(process.env['THROTTLE_TTL'] || '60', 10),
  throttleLimit: parseInt(process.env['THROTTLE_LIMIT'] || '100', 10),
  
  // Features
  businessIntelligenceEnabled: process.env['BUSINESS_INTELLIGENCE_ENABLED'] === 'true',
  crmEnabled: process.env['CRM_ENABLED'] === 'true',
  erpEnabled: process.env['ERP_ENABLED'] === 'true',
  accountingModuleEnabled: process.env['ACCOUNTING_MODULE_ENABLED'] === 'true',
  hrModuleEnabled: process.env['HR_MODULE_ENABLED'] === 'true',
  aiBuilderEnabled: process.env['AI_BUILDER_ENABLED'] === 'true',
  
  // Monitoring
  enableMetrics: process.env['ENABLE_METRICS'] === 'true',
  metricsPort: parseInt(process.env['METRICS_PORT'] || '9090', 10),
  
  // File Storage
  storageType: process.env['STORAGE_TYPE'] || 'local',
  uploadMaxSize: parseInt(process.env['UPLOAD_MAX_SIZE'] || '10485760', 10), // 10MB
  allowedFileTypes: process.env['ALLOWED_FILE_TYPES']?.split(',') || ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
}));