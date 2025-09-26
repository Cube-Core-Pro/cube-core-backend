// path: backend/src/app.service.ts
// purpose: Main application service with system utilities
// dependencies: NestJS Injectable

import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getSystemInfo() {
    return {
      name: 'CUBE CORE',
      description: 'Enterprise Business Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpuUsage: process.cpuUsage(),
    };
  }
}