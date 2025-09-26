import { registerAs } from "@nestjs/config";

export default registerAs('jwt', () => ({
  secret: process.env['JWT_SECRET'] || 'cube-core-super-secret-jwt-key-2024-local-development',
  expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  refreshSecret: process.env['JWT_REFRESH_SECRET'] || process.env['JWT_SECRET'] || 'cube-core-super-secret-jwt-key-2024-local-development',
  refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
}));