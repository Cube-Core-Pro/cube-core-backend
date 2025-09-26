import { registerAs } from "@nestjs/config";

export default registerAs('database', () => ({
  url: process.env['DATABASE_URL'],
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432', 10),
  username: process.env['DB_USERNAME'] || 'cubecore',
  password: process.env['DB_PASSWORD'] || 'cubecore_password_2024',
  database: process.env['DB_DATABASE'] || 'cubecore',
  synchronize: process.env['DB_SYNCHRONIZE'] === 'true',
  logging: process.env['DB_LOGGING'] === 'true',
  poolSize: parseInt(process.env['DATABASE_POOL_SIZE'] || '10', 10),
  connectionTimeout: parseInt(process.env['DATABASE_CONNECTION_TIMEOUT'] || '60000', 10),
}));