import { registerAs } from "@nestjs/config";

export default registerAs('redis', () => ({
  url: process.env['REDIS_URL'] || 'redis://localhost:6379',
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  password: process.env['REDIS_PASSWORD'],
  db: parseInt(process.env['REDIS_DB'] || '0', 10),
  keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'cubecore:',
  ttl: parseInt(process.env['CACHE_TTL'] || '300', 10),
}));