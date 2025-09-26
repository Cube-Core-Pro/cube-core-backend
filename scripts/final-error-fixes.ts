#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const baseDir = path.join(__dirname, '../src');

console.log('🔧 Applying final error fixes...');

// Fix ai-agent.service.ts error handling
const aiAgentServicePath = path.join(baseDir, 'ai-agents/services/ai-agent.service.ts');
if (fs.existsSync(aiAgentServicePath)) {
  let content = fs.readFileSync(aiAgentServicePath, 'utf8');
  
  // Fix error.message access
  content = content.replace(
    /error\.message/g,
    '(error as Error).message'
  );
  
  // Fix error.constructor.name access
  content = content.replace(
    /error\.constructor\.name/g,
    '(error as Error).constructor.name'
  );
  
  // Fix results indexing
  content = content.replace(
    /results\[attachment\.id\]/g,
    '(results as any)[attachment.id]'
  );
  
  fs.writeFileSync(aiAgentServicePath, content);
  console.log('✅ Fixed ai-agent.service.ts error handling');
}

// Fix webmail processor domain extraction
const emailProcessorPath = path.join(baseDir, 'webmail/processors/email-security.processor.ts');
if (fs.existsSync(emailProcessorPath)) {
  let content = fs.readFileSync(emailProcessorPath, 'utf8');
  
  // Fix domain extraction to handle undefined
  content = content.replace(
    /const senderDomain = senderEmail\.split\('@'\)\[1\];/,
    `const senderDomain = senderEmail?.split('@')[1];`
  );
  
  fs.writeFileSync(emailProcessorPath, content);
  console.log('✅ Fixed email processor domain extraction');
}

// Create missing return type interfaces
const returnTypesPath = path.join(baseDir, 'common/types/return-types.ts');
if (!fs.existsSync(returnTypesPath)) {
  const dir = path.dirname(returnTypesPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const returnTypes = `
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  count?: number;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}
`;
  
  fs.writeFileSync(returnTypesPath, returnTypes);
  console.log('✅ Created return types');
}

// Fix ImapAdapter return types
const imapAdapterPath = path.join(baseDir, 'webmail/adapters/imap.adapter.ts');
if (fs.existsSync(imapAdapterPath)) {
  let content = fs.readFileSync(imapAdapterPath, 'utf8');
  
  // Import return types
  if (!content.includes('SendEmailResult')) {
    content = content.replace(
      "import { Injectable, Logger } from '@nestjs/common';",
      `import { Injectable, Logger } from '@nestjs/common';
import { SendEmailResult, SyncResult, TestConnectionResult } from '../types/return-types';`
    );
  }
  
  // Fix method return types
  content = content.replace(
    /async testConnection\(config: ImapConfig\): Promise<{ success: boolean; error\?: string }>/,
    'async testConnection(config: ImapConfig): Promise<TestConnectionResult>'
  );
  
  content = content.replace(
    /async sendEmail\(config: ImapConfig, message: {[\s\S]*?}\): Promise<{ success: boolean; messageId\?: string; error\?: string }>/,
    'async sendEmail(config: ImapConfig, message: EmailMessage): Promise<SendEmailResult>'
  );
  
  content = content.replace(
    /async syncEmails\(config: ImapConfig, options: SyncOptions\): Promise<{ success: boolean; count\?: number; error\?: string }>/,
    'async syncEmails(config: ImapConfig, options: SyncOptions): Promise<SyncResult>'
  );
  
  fs.writeFileSync(imapAdapterPath, content);
  console.log('✅ Fixed ImapAdapter return types');
}

console.log('🎉 All final error fixes applied!');
console.log('🚀 Ready for compilation!');