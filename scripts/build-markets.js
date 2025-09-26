#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TSC_BIN = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

console.log('🚀 Building Markets Module...');

const marketsDir = path.join(__dirname, '..', 'src', 'markets');
const distDir = path.join(__dirname, '..', 'dist', 'markets');

try {
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Compile TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync(`node --max-old-space-size=6144 ${TSC_BIN} --project ${path.join(marketsDir, 'tsconfig.json')} --outDir ${distDir}`, {
    stdio: 'inherit',
    cwd: marketsDir
  });

  // Copy non-TS files
  console.log('📋 Copying configuration files...');
  const configFiles = [
    'config/markets.config.ts',
    '../.env.markets.example'
  ];

  configFiles.forEach(file => {
    const srcPath = path.join(marketsDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${file}`);
    }
  });

  // Generate module manifest
  console.log('📄 Generating module manifest...');
  const manifest = {
    name: 'markets',
    version: '1.0.0',
    description: 'Advanced Trading and Markets Module',
    main: 'markets.module.js',
    dependencies: {
      '@nestjs/common': '^10.0.0',
      '@nestjs/core': '^10.0.0',
      '@nestjs/config': '^3.0.0',
      '@nestjs/swagger': '^7.0.0',
      '@nestjs/schedule': '^4.0.0',
      'class-validator': '^0.14.0',
      'class-transformer': '^0.5.0'
    },
    features: [
      'IBKR Integration',
      'OANDA Integration',
      'Real-time Price Streaming',
      'Order Management',
      'Position Tracking',
      'Commission Calculation',
      'Risk Management',
      'Performance Metrics',
      'Health Monitoring',
      'Rate Limiting',
      'Audit Logging'
    ],
    endpoints: [
      'POST /markets/ibkr/orders',
      'POST /markets/oanda/orders',
      'DELETE /markets/ibkr/orders/:id',
      'DELETE /markets/oanda/orders/:id',
      'GET /markets/ibkr/positions',
      'GET /markets/oanda/positions',
      'GET /markets/prices/snapshot',
      'POST /markets/prices/subscribe',
      'POST /markets/prices/unsubscribe',
      'GET /markets/executions',
      'GET /markets/health',
      'GET /markets/metrics'
    ],
    buildDate: new Date().toISOString(),
    buildEnvironment: process.env.NODE_ENV || 'development'
  };

  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('✅ Markets module built successfully!');
  console.log(`📁 Output directory: ${distDir}`);
  console.log('🎯 Ready for production deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
