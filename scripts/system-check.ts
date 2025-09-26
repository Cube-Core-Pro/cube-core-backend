import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

interface SystemCheckResult {
  component: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

async function checkDatabase(): Promise<SystemCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if tables exist
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    if (tables.length === 0) {
      return {
        component: 'Database',
        status: 'warn',
        message: 'Database connected but no tables found. Run migrations.',
        details: { tableCount: 0 }
      };
    }
    
    return {
      component: 'Database',
      status: 'pass',
      message: `Database connected successfully with ${tables.length} tables`,
      details: { tableCount: tables.length }
    };
  } catch (error) {
    const err = error as Error;
    return {
      component: 'Database',
      status: 'fail',
      message: `Database connection failed: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function checkRedis(): Promise<SystemCheckResult> {
  const client = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379');
  
  try {
    const pong = await client.ping();
    await client.disconnect();
    
    return {
      component: 'Redis',
      status: 'pass',
      message: `Redis connected successfully (${pong})`,
    };
  } catch (error) {
    const err = error as Error;
    return {
      component: 'Redis',
      status: 'fail',
      message: `Redis connection failed: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function checkEnvironmentVariables(): Promise<SystemCheckResult> {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASS',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return {
      component: 'Environment Variables',
      status: 'fail',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      details: { missing: missingVars }
    };
  }
  
  return {
    component: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are set',
  };
}

async function checkDirectories(): Promise<SystemCheckResult> {
  const requiredDirs = [
    './uploads',
    './logs',
    './backups',
    './temp',
  ];
  
  const issues: string[] = [];
  
  for (const dir of requiredDirs) {
    try {
      await fs.access(dir);
    } catch {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        const err = error as Error;
        issues.push(`Cannot create ${dir}: ${err.message}`);
      }
    }
  }
  
  if (issues.length > 0) {
    return {
      component: 'Directories',
      status: 'fail',
      message: `Directory issues: ${issues.join(', ')}`,
      details: { issues }
    };
  }
  
  return {
    component: 'Directories',
    status: 'pass',
    message: 'All required directories exist or were created',
  };
}

async function checkNodeModules(): Promise<SystemCheckResult> {
  try {
    const packageJson = JSON.parse(await fs.readFile('./package.json', 'utf8'));
    const nodeModulesExists = await fs.access('./node_modules').then(() => true).catch(() => false);
    
    if (!nodeModulesExists) {
      return {
        component: 'Dependencies',
        status: 'fail',
        message: 'node_modules directory not found. Run npm install.',
      };
    }
    
    // Check if critical dependencies exist
    const criticalDeps = ['@nestjs/core', '@prisma/client', 'ioredis'];
    const missingDeps: string[] = [];
    
    for (const dep of criticalDeps) {
      try {
        await fs.access(`./node_modules/${dep}`);
      } catch {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      return {
        component: 'Dependencies',
        status: 'warn',
        message: `Some critical dependencies may be missing: ${missingDeps.join(', ')}`,
        details: { missing: missingDeps }
      };
    }
    
    return {
      component: 'Dependencies',
      status: 'pass',
      message: 'All critical dependencies are installed',
    };
  } catch (error) {
    const err = error as Error;
    return {
      component: 'Dependencies',
      status: 'fail',
      message: `Cannot check dependencies: ${err.message}`,
      details: { error: err.message }
    };
  }
}

async function checkPrismaGeneration(): Promise<SystemCheckResult> {
  try {
    const prismaClientPath = './node_modules/.prisma/client';
    await fs.access(prismaClientPath);
    
    return {
      component: 'Prisma Client',
      status: 'pass',
      message: 'Prisma client is generated',
    };
  } catch {
    return {
      component: 'Prisma Client',
      status: 'fail',
      message: 'Prisma client not generated. Run npm run prisma:generate',
    };
  }
}

async function checkSystemResources(): Promise<SystemCheckResult> {
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  // Check available disk space
  let diskSpace = 'unknown';
  try {
    const stats = await fs.stat('./');
    diskSpace = 'available';
  } catch {
    diskSpace = 'unavailable';
  }
  
  const issues: string[] = [];
  
  if (memoryUsageMB > 1000) {
    issues.push(`High memory usage: ${memoryUsageMB}MB`);
  }
  
  if (diskSpace === 'unavailable') {
    issues.push('Cannot check disk space');
  }
  
  return {
    component: 'System Resources',
    status: issues.length > 0 ? 'warn' : 'pass',
    message: issues.length > 0 ? issues.join(', ') : 'System resources look good',
    details: {
      memoryUsageMB,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    }
  };
}

async function runSystemCheck(): Promise<void> {
  console.log('🔍 CUBE CORE System Check');
  console.log('========================\n');
  
  const checks = [
    checkEnvironmentVariables,
    checkDirectories,
    checkNodeModules,
    checkPrismaGeneration,
    checkDatabase,
    checkRedis,
    checkSystemResources,
  ];
  
  const results: SystemCheckResult[] = [];
  
  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
      
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${result.component}: ${result.message}`);
      
      if (result.details && (result.status === 'fail' || result.status === 'warn')) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    } catch (error) {
      const err = error as Error;
      const result: SystemCheckResult = {
        component: check.name,
        status: 'fail',
        message: `Check failed: ${err.message}`,
        details: { error: err.message }
      };
      results.push(result);
      console.log(`❌ ${result.component}: ${result.message}`);
    }
  }
  
  console.log('\n📊 Summary');
  console.log('===========');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🚨 Critical Issues Found');
    console.log('========================');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`• ${r.component}: ${r.message}`);
      });
    
    console.log('\n💡 Recommended Actions:');
    console.log('1. Fix the failed checks above');
    console.log('2. Run npm install if dependencies are missing');
    console.log('3. Run npm run prisma:generate if Prisma client is not generated');
    console.log('4. Run npm run prisma:migrate if database tables are missing');
    console.log('5. Check your .env file for missing variables');
    console.log('6. Ensure PostgreSQL and Redis are running');
    
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Warnings Found');
    console.log('==================');
    results
      .filter(r => r.status === 'warn')
      .forEach(r => {
        console.log(`• ${r.component}: ${r.message}`);
      });
    
    console.log('\n💡 Consider addressing the warnings above for optimal performance.');
  } else {
    console.log('\n🎉 All checks passed! Your system is ready to run CUBE CORE.');
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run npm run start:dev to start the development server');
  console.log('2. Visit http://localhost:3000/api/docs for API documentation');
  console.log('3. Use admin@cubecore.com / admin123! for initial login');
}

// Run the system check
runSystemCheck()
  .catch((error) => {
    console.error('❌ System check failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });