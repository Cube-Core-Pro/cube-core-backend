// path: backend/src/common/types/api.types.ts
// purpose: Type-safe API response and request interfaces
// dependencies: None (pure TypeScript types)

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  meta?: ResponseMeta;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
  pagination?: PaginationMeta;
  performance?: PerformanceMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PerformanceMeta {
  executionTime: number;
  queryCount: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export interface FilterQuery {
  field: string;
  operator: FilterOperator;
  value: unknown;
  type?: 'string' | 'number' | 'boolean' | 'date';
}

export type FilterOperator = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin' | 'like' | 'ilike'
  | 'between' | 'exists' | 'null';

export interface SortQuery {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchQuery {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

// Generic CRUD interfaces
export interface CreateRequest<T> {
  data: T;
  options?: CreateOptions;
}

export interface UpdateRequest<T> {
  id: string;
  data: Partial<T>;
  options?: UpdateOptions;
}

export interface DeleteRequest {
  id: string;
  options?: DeleteOptions;
}

export interface BulkRequest<T> {
  items: T[];
  options?: BulkOptions;
}

export interface CreateOptions {
  validate?: boolean;
  skipDuplicates?: boolean;
  returnCreated?: boolean;
}

export interface UpdateOptions {
  validate?: boolean;
  upsert?: boolean;
  returnUpdated?: boolean;
}

export interface DeleteOptions {
  soft?: boolean;
  cascade?: boolean;
  returnDeleted?: boolean;
}

export interface BulkOptions {
  batchSize?: number;
  continueOnError?: boolean;
  validate?: boolean;
}

// Health check types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics?: SystemMetrics;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  database: DatabaseMetrics;
  cache: CacheMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
  };
}

export interface CpuMetrics {
  usage: number;
  loadAverage: number[];
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memory: number;
  keys: number;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
}

export interface ValidationErrorDetail {
  field: string;
  value: unknown;
  constraints: Record<string, string>;
}

// Request context
export interface RequestContext {
  requestId: string;
  userId?: string;
  tenantId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  path: string;
  method: string;
  headers: Record<string, string>;
}

// File upload types
export interface FileUploadRequest {
  file: Express.Multer.File;
  metadata?: Record<string, unknown>;
  options?: FileUploadOptions;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
  generateThumbnail?: boolean;
  compress?: boolean;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}