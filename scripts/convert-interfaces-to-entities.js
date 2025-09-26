#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const entitiesDir = path.join(__dirname, '..', 'src', 'advanced-fintech', 'entities');

const entityConfigs = {
  'insurance-policy.entity.ts': {
    tableName: 'insurance_policies',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      policyNumber: 'varchar(100)',
      policyType: 'varchar(50)',
      premium: 'decimal(15,2)',
      coverage: 'decimal(15,2)',
      status: 'varchar(20)',
      startDate: 'date',
      endDate: 'date',
      beneficiary: 'varchar(255)'
    }
  },
  'payment-method.entity.ts': {
    tableName: 'payment_methods',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      type: 'varchar(50)',
      provider: 'varchar(100)',
      accountNumber: 'varchar(100)',
      isDefault: 'boolean',
      status: 'varchar(20)',
      metadata: 'json'
    }
  },
  'investment.entity.ts': {
    tableName: 'investments',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      portfolioId: 'varchar(255)',
      symbol: 'varchar(20)',
      quantity: 'decimal(15,8)',
      purchasePrice: 'decimal(15,2)',
      currentPrice: 'decimal(15,2)',
      investmentType: 'varchar(50)',
      status: 'varchar(20)'
    }
  },
  'portfolio.entity.ts': {
    tableName: 'portfolios',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      name: 'varchar(255)',
      totalValue: 'decimal(15,2)',
      currency: 'varchar(3)',
      riskLevel: 'varchar(20)',
      status: 'varchar(20)'
    }
  },
  'credit-score.entity.ts': {
    tableName: 'credit_scores',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      score: 'int',
      provider: 'varchar(100)',
      reportDate: 'date',
      factors: 'json',
      status: 'varchar(20)'
    }
  },
  'fraud-alert.entity.ts': {
    tableName: 'fraud_alerts',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      transactionId: 'varchar(255)',
      alertType: 'varchar(50)',
      severity: 'varchar(20)',
      description: 'text',
      status: 'varchar(20)',
      resolvedAt: 'timestamp'
    }
  },
  'compliance-report.entity.ts': {
    tableName: 'compliance_reports',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      reportType: 'varchar(100)',
      period: 'varchar(50)',
      status: 'varchar(20)',
      data: 'json',
      generatedBy: 'varchar(255)',
      submittedAt: 'timestamp'
    }
  },
  'crypto-wallet.entity.ts': {
    tableName: 'crypto_wallets',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      walletAddress: 'varchar(255)',
      cryptocurrency: 'varchar(20)',
      balance: 'decimal(20,8)',
      network: 'varchar(50)',
      status: 'varchar(20)'
    }
  },
  'trading-order.entity.ts': {
    tableName: 'trading_orders',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      symbol: 'varchar(20)',
      orderType: 'varchar(20)',
      side: 'varchar(10)',
      quantity: 'decimal(15,8)',
      price: 'decimal(15,2)',
      status: 'varchar(20)',
      executedAt: 'timestamp'
    }
  },
  'risk-profile.entity.ts': {
    tableName: 'risk_profiles',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      userId: 'varchar(255)',
      riskTolerance: 'varchar(20)',
      investmentHorizon: 'int',
      financialGoals: 'json',
      questionnaire: 'json',
      score: 'int'
    }
  },
  'financial-product.entity.ts': {
    tableName: 'financial_products',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      name: 'varchar(255)',
      type: 'varchar(100)',
      description: 'text',
      features: 'json',
      pricing: 'json',
      status: 'varchar(20)',
      provider: 'varchar(255)'
    }
  },
  'fintech-analytics.entity.ts': {
    tableName: 'fintech_analytics',
    fields: {
      id: 'uuid',
      tenantId: 'varchar(255)',
      metricType: 'varchar(100)',
      value: 'decimal(15,2)',
      period: 'varchar(50)',
      dimensions: 'json',
      calculatedAt: 'timestamp'
    }
  }
};

function generateEntityContent(fileName, config) {
  const className = fileName.replace('.entity.ts', '').split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');

  let content = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';\n\n`;
  
  content += `@Entity('${config.tableName}')\n`;
  content += `@Index(['tenantId'])\n`;
  content += `export class ${className} {\n`;

  // Generate fields
  for (const [fieldName, fieldType] of Object.entries(config.fields)) {
    if (fieldName === 'id') {
      content += `  @PrimaryGeneratedColumn('uuid')\n`;
      content += `  id: string;\n\n`;
    } else if (fieldName === 'tenantId') {
      content += `  @Column({ type: 'varchar', length: 255 })\n`;
      content += `  @Index()\n`;
      content += `  tenantId: string;\n\n`;
    } else {
      const tsType = getTypeScriptType(fieldType);
      const columnDef = getColumnDefinition(fieldType);
      content += `  @Column(${columnDef})\n`;
      content += `  ${fieldName}: ${tsType};\n\n`;
    }
  }

  content += `  @CreateDateColumn()\n`;
  content += `  createdAt: Date;\n\n`;
  content += `  @UpdateDateColumn()\n`;
  content += `  updatedAt: Date;\n`;
  content += `}\n`;

  return content;
}

function getTypeScriptType(sqlType) {
  if (sqlType.includes('varchar') || sqlType.includes('text')) return 'string';
  if (sqlType.includes('decimal') || sqlType.includes('int')) return 'number';
  if (sqlType.includes('boolean')) return 'boolean';
  if (sqlType.includes('json')) return 'any';
  if (sqlType.includes('date') || sqlType.includes('timestamp')) return 'Date';
  return 'string';
}

function getColumnDefinition(sqlType) {
  if (sqlType === 'uuid') return `{ type: 'varchar', length: 255 }`;
  if (sqlType.startsWith('varchar')) {
    const length = sqlType.match(/\((\d+)\)/)?.[1] || '255';
    return `{ type: 'varchar', length: ${length} }`;
  }
  if (sqlType === 'text') return `{ type: 'text' }`;
  if (sqlType.startsWith('decimal')) {
    const match = sqlType.match(/\((\d+),(\d+)\)/);
    if (match) {
      return `{ type: 'decimal', precision: ${match[1]}, scale: ${match[2]} }`;
    }
    return `{ type: 'decimal', precision: 15, scale: 2 }`;
  }
  if (sqlType === 'int') return `{ type: 'int' }`;
  if (sqlType === 'boolean') return `{ type: 'boolean', default: false }`;
  if (sqlType === 'json') return `{ type: 'json', nullable: true }`;
  if (sqlType === 'date') return `{ type: 'date', nullable: true }`;
  if (sqlType === 'timestamp') return `{ type: 'timestamp', nullable: true }`;
  return `{ type: 'varchar', length: 255 }`;
}

// Convert entities
for (const [fileName, config] of Object.entries(entityConfigs)) {
  const filePath = path.join(entitiesDir, fileName);
  
  if (fs.existsSync(filePath)) {
    const content = generateEntityContent(fileName, config);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Converted ${fileName}`);
  }
}

console.log('🎯 All entities converted successfully!');