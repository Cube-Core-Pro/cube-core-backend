// path: backend/src/auth/decorators/feature-flag.decorator.ts
// purpose: Decorator para verificar feature flags en endpoints
// dependencies: @nestjs/common, reflect-metadata

import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Decorator para verificar si un feature flag está habilitado
 * @param flag - Nombre del feature flag a verificar
 */
export const FeatureFlag = (flag: string) => SetMetadata(FEATURE_FLAG_KEY, flag);