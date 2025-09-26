#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA COMPLETA DE DUPLICADOS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function cleanFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let changed = false;
  
  // 1. Limpiar imports duplicados por línea exacta
  const lines = content.split('\n');
  const seenLines = new Set();
  const cleanedLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Si es un import, verificar duplicados
    if (trimmedLine.startsWith('import ')) {
      if (!seenLines.has(trimmedLine)) {
        seenLines.add(trimmedLine);
        cleanedLines.push(line);
      } else {
        changed = true;
        console.log(`  🗑️  Removido duplicado: ${trimmedLine.substring(0, 60)}...`);
      }
    } else {
      cleanedLines.push(line);
    }
  }
  
  content = cleanedLines.join('\n');
  
  // 2. Limpiar punto y coma duplicados
  content = content.replace(/;;+/g, ';');
  
  // 3. Limpiar líneas vacías excesivas
  content = content.replace(/\n\n\n+/g, '\n\n');
  
  // 4. Limpiar espacios al final de líneas
  content = content.replace(/[ \t]+$/gm, '');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Limpiado: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  
  return false;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalFixed += walkDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      if (cleanFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos limpiados: ${totalFixed}`);
  console.log('🎯 Limpieza completa terminada');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
}