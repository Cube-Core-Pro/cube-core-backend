// scripts/prisma/patch-missing-relations.mjs
// Ejecuta: node scripts/prisma/patch-missing-relations.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
const BACKUP_PATH = path.resolve(process.cwd(), 'prisma', 'schema.prisma.bak');

const INSERTS = [
  { model: 'BillingPlan',         fieldLine: '  subscriptions BillingSubscription[]' },
  { model: 'BillingSubscription', fieldLine: '  invoices     BillingInvoice[]' },
  { model: 'BillingInvoice',      fieldLine: '  payments     BillingPayment[]' },
  { model: 'Contact',             fieldLine: '  opportunities Opportunity[]' },
  { model: 'Contact',             fieldLine: '  cases         Case[]' },
  { model: 'Account',             fieldLine: '  cases         Case[]' },
  { model: 'Account',             fieldLine: '  quotes        Quote[]' },
  { model: 'Account',             fieldLine: '  orders        Order[]' },
  { model: 'Opportunity',         fieldLine: '  quotes        Quote[]' },
];

function read(file) {
  if (!fs.existsSync(file)) throw new Error('schema.prisma not found at ' + file);
  return fs.readFileSync(file, 'utf8');
}

function backup(src, dst) {
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
}

function findModelBlock(content, modelName) {
  const pattern = new RegExp('\\bmodel\\s+' + modelName + '\\s*\\{', 'm');
  const m = pattern.exec(content);
  if (!m) return null;
  const braceOpen = content.indexOf('{', m.index);
  if (braceOpen < 0) return null;

  let depth = 0;
  for (let i = braceOpen; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { start: m.index, end: i + 1 };
    }
  }
  return null;
}

function ensureField(block, fieldLine) {
  const trimmed = fieldLine.trim();
  if (block.indexOf(trimmed) >= 0) return { block, changed: false };
  const lastBrace = block.lastIndexOf('}');
  if (lastBrace < 0) return { block, changed: false };
  const before = block.slice(0, lastBrace);
  const after = block.slice(lastBrace);
  const newline = before.endsWith('\n') ? '' : '\n';
  return { block: before + newline + fieldLine + '\n' + after, changed: true };
}

function main() {
  const original = read(SCHEMA_PATH);
  backup(SCHEMA_PATH, BACKUP_PATH);
  let content = original;
  let changedCount = 0;

  for (const ins of INSERTS) {
    const pos = findModelBlock(content, ins.model);
    if (!pos) { console.warn('[WARN] Model not found:', ins.model); continue; }
    const block = content.slice(pos.start, pos.end);
    const { block: newBlock, changed } = ensureField(block, ins.fieldLine);
    if (changed) {
      content = content.slice(0, pos.start) + newBlock + content.slice(pos.end);
      changedCount++;
      console.log(' +', ins.model, '->', ins.fieldLine.trim());
    }
  }

  if (changedCount > 0) {
    fs.writeFileSync(SCHEMA_PATH, content, 'utf8');
    console.log('\\nBackup:', BACKUP_PATH);
  } else {
    console.log('No changes. Opposite relations already present.');
  }
}

main();

