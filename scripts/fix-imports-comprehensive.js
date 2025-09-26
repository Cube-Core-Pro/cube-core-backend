#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN COMPREHENSIVA DE IMPORTS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

function fixFileImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Dividir en líneas
  const lines = content.split('\n');
  const fixedLines = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar inicio de import malformado
    if (trimmedLine.startsWith('import {') || trimmedLine.startsWith('import{')) {
      const importBlock = [];
      let j = i;
      
      // Recopilar todo el bloque de import
      while (j < lines.length) {
        const currentLine = lines[j];
        importBlock.push(currentLine);
        
        if (currentLine.includes('} from') && currentLine.includes(';')) {
          break;
        }
        
        if (currentLine.includes('from') && currentLine.includes(';')) {
          break;
        }
        
        j++;
      }
      
      // Procesar el bloque de import
      const processedImport = processImportBlock(importBlock);
      if (processedImport) {
        fixedLines.push(processedImport);
        i = j + 1;
        continue;
      }
    }
    
    // Detectar líneas sueltas que parecen imports malformados
    if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('*') && 
        !trimmedLine.startsWith('export') && !trimmedLine.startsWith('@') &&
        !trimmedLine.startsWith('class') && !trimmedLine.startsWith('interface') &&
        !trimmedLine.startsWith('const') && !trimmedLine.startsWith('let') &&
        !trimmedLine.startsWith('var') && !trimmedLine.startsWith('function') &&
        !trimmedLine.startsWith('async') && !trimmedLine.startsWith('return') &&
        !trimmedLine.startsWith('if') && !trimmedLine.startsWith('for') &&
        !trimmedLine.startsWith('while') && !trimmedLine.startsWith('switch') &&
        !trimmedLine.startsWith('try') && !trimmedLine.startsWith('catch') &&
        !trimmedLine.startsWith('{') && !trimmedLine.startsWith('}') &&
        trimmedLine.match(/^[A-Z][a-zA-Z0-9_]*,?\s*$/) &&
        i + 1 < lines.length && lines[i + 1].trim().startsWith('}')) {
      
      // Buscar el from correspondiente
      let k = i + 1;
      while (k < lines.length && !lines[k].includes('from')) {
        k++;
      }
      
      if (k < lines.length && lines[k].includes('from')) {
        const fromMatch = lines[k].match(/from\s*['"]([^'"]+)['"]/);
        if (fromMatch) {
          const fromPath = fromMatch[1];
          const importName = trimmedLine.replace(',', '').trim();
          const reconstructedImport = `import { ${importName} } from '${fromPath}';`;
          fixedLines.push(reconstructedImport);
          i = k + 1;
          continue;
        }
      }
    }
    
    fixedLines.push(line);
    i++;
  }
  
  const newContent = fixedLines.join('\n');
  
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Corregido: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  
  return false;
}

function processImportBlock(importBlock) {
  const fullText = importBlock.join('\n');
  
  // Extraer items del import
  const importMatch = fullText.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/s);
  if (importMatch) {
    const itemsText = importMatch[1];
    const fromPath = importMatch[2];
    
    // Limpiar y dividir items
    const items = itemsText
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item && item !== '' && !item.startsWith('//'));
    
    if (items.length > 0) {
      return `import {\n  ${items.join(',\n  ')}\n} from '${fromPath}';`;
    }
  }
  
  return null;
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
      if (fixFileImports(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección comprehensiva completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}