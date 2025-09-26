// path: backend/src/main.ts
// purpose: Application bootstrap with enterprise-grade configuration
// dependencies: NestJS core, Swagger, Helmet, Compression, CORS

import { NestFactory } from "@nestjs/core";
import './observability/otel';
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as compression from "compression";
import helmet from "helmet";
import { logError } from "./common/utils/error-handler.util";

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression middleware
    app.use(compression());

    // CORS configuration
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-ID'],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global prefix
    app.setGlobalPrefix('api');

    // Additive: non-prefixed health alias for container/lb checks
    const http = app.getHttpAdapter().getInstance();
    http.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'cube-core-backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Swagger documentation
    if (process.env.ENABLE_SWAGGER !== 'false') {
      const config = new DocumentBuilder()
        .setTitle('CUBE CORE API')
        .setDescription('Enterprise Business Platform - Comprehensive API Documentation')
        .setVersion('1.0.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication & Authorization')
        .addTag('users', 'User Management')
        .addTag('dashboard', 'Dashboard & Analytics')
        .addTag('crm', 'Customer Relationship Management')
        .addTag('banking', 'Banking & Financial Services')
        .addTag('billing', 'Billing & Invoicing')
        .addTag('audit', 'Audit & Compliance')
        .addTag('antifraud', 'Anti-Fraud & Risk Management')
        .addTag('pos', 'Point of Sale')
        .addTag('health', 'Health Checks & Monitoring')
        .addServer('http://localhost:3000', 'Development Server')
        .addServer('https://api.cubecore.com', 'Production Server')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'none',
          filter: true,
          showRequestHeaders: true,
          tryItOutEnabled: true,
        },
        customSiteTitle: 'CUBE CORE API Documentation',
        customfavIcon: '/favicon.ico',
      });
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 CUBE CORE Backend is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`📊 Node.js Version: ${process.version}`);
    logger.log(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
  } catch (error) {
    logError(logger, 'Failed to start application', error);
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logError(logger, 'Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  const logger = new Logger('Shutdown');
  logger.log('Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  const logger = new Logger('Shutdown');
  logger.log('Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

bootstrap();
