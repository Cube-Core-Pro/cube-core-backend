#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TSC_BIN = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

console.log('🚀 Building Advanced Fintech Module...');

const fintechDir = path.join(__dirname, '..', 'src', 'advanced-fintech');
const distDir = path.join(__dirname, '..', 'dist', 'advanced-fintech');

try {
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Compile TypeScript
  console.log('📦 Compiling TypeScript...');
  execSync(`node --max-old-space-size=6144 ${TSC_BIN} --project ${path.join(fintechDir, 'tsconfig.json')} --outDir ${distDir}`, {
    stdio: 'inherit',
    cwd: fintechDir
  });

  // Generate module manifest
  console.log('📄 Generating module manifest...');
  const manifest = {
    name: 'advanced-fintech',
    version: '1.0.0',
    description: 'Advanced Fintech & Digital Banking Module',
    main: 'advanced-fintech.module.js',
    dependencies: {
      '@nestjs/common': '^10.0.0',
      '@nestjs/core': '^10.0.0',
      '@nestjs/config': '^3.0.0',
      '@nestjs/swagger': '^7.0.0',
      '@nestjs/typeorm': '^10.0.0',
      'typeorm': '^0.3.0',
      'class-validator': '^0.14.0',
      'class-transformer': '^0.5.0'
    },
    features: [
      'Digital Banking Platform',
      'AI-Powered Lending',
      'Real-time Fraud Detection',
      'Robo-Advisor Services',
      'Payment Processing',
      'Credit Scoring',
      'Wealth Management',
      'Cryptocurrency Support',
      'RegTech Compliance',
      'Smart Insurance',
      'Risk Assessment',
      'Financial Analytics'
    ],
    entities: [
      'BankAccount',
      'Transaction',
      'Loan',
      'Investment',
      'Portfolio',
      'CreditScore',
      'FraudAlert',
      'ComplianceReport',
      'CryptoWallet',
      'TradingOrder',
      'RiskProfile',
      'PaymentMethod',
      'InsurancePolicy',
      'FinancialProduct',
      'FintechAnalytics'
    ],
    controllers: [
      'AdvancedFintechController',
      'AiLendingController',
      'CryptocurrencyController',
      'DigitalBankingController',
      'FraudDetectionController',
      'PaymentProcessingController',
      'RegtechComplianceController',
      'RoboAdvisorController',
      'SmartInsuranceController',
      'WealthManagementController'
    ],
    services: [
      'AdvancedFintechService',
      'AiLendingService',
      'AlgorithmicTradingService',
      'CreditScoringService',
      'CryptocurrencyService',
      'DigitalBankingService',
      'FraudDetectionService',
      'PaymentProcessingService',
      'RegtechComplianceService',
      'RiskAssessmentService',
      'RoboAdvisorService',
      'SmartInsuranceService',
      'WealthManagementService'
    ],
    buildDate: new Date().toISOString(),
    buildEnvironment: process.env.NODE_ENV || 'development'
  };

  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('✅ Advanced Fintech module built successfully!');
  console.log(`📁 Output directory: ${distDir}`);
  console.log('🎯 Ready for production deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
