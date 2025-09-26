#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO TODOS LOS IMPORTS MALFORMADOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

function fixImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixed = false;

  // Patrón para detectar imports malformados
  const malformedImportPattern = /^(\s*)([A-Za-z][A-Za-z0-9_]*),?\s*$/gm;
  
  // Dividir en líneas para procesamiento
  const lines = content.split('\n');
  const fixedLines = [];
  let inImportBlock = false;
  let currentImport = '';
  let importItems = [];
  let fromClause = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar inicio de import
    if (trimmedLine.startsWith('import {') || trimmedLine.startsWith('import{')) {
      inImportBlock = true;
      currentImport = line;
      
      // Si el import está completo en una línea
      if (line.includes('} from')) {
        fixedLines.push(line);
        inImportBlock = false;
        continue;
      }
      
      // Extraer items del import inicial
      const match = line.match(/import\s*{\s*([^}]*)/);
      if (match) {
        const items = match[1].split(',').map(item => item.trim()).filter(item => item);
        importItems = items;
      }
      continue;
    }
    
    // Si estamos en un bloque de import
    if (inImportBlock) {
      // Buscar la cláusula 'from'
      if (line.includes('} from')) {
        const fromMatch = line.match(/}\s*from\s*['"]([^'"]+)['"]/);
        if (fromMatch) {
          fromClause = fromMatch[1];
          
          // Reconstruir el import correctamente
          const cleanItems = importItems.filter(item => item && item !== '');
          if (cleanItems.length > 0) {
            const reconstructedImport = `import {\n  ${cleanItems.join(',\n  ')}\n} from '${fromClause}';`;
            fixedLines.push(reconstructedImport);
            fixed = true;
          }
          
          // Reset
          inImportBlock = false;
          currentImport = '';
          importItems = [];
          fromClause = '';
          continue;
        }
      }
      
      // Línea con items de import
      if (trimmedLine && !trimmedLine.startsWith('}') && !trimmedLine.includes('from')) {
        const items = trimmedLine.split(',').map(item => item.trim()).filter(item => item);
        importItems.push(...items);
        continue;
      }
      
      // Línea de cierre sin from (malformada)
      if (trimmedLine === '}') {
        // Buscar el from en las siguientes líneas
        let j = i + 1;
        while (j < lines.length && !lines[j].includes('from')) {
          j++;
        }
        if (j < lines.length) {
          const fromMatch = lines[j].match(/from\s*['"]([^'"]+)['"]/);
          if (fromMatch) {
            fromClause = fromMatch[1];
            const cleanItems = importItems.filter(item => item && item !== '');
            if (cleanItems.length > 0) {
              const reconstructedImport = `import {\n  ${cleanItems.join(',\n  ')}\n} from '${fromClause}';`;
              fixedLines.push(reconstructedImport);
              fixed = true;
            }
            i = j; // Saltar las líneas procesadas
          }
        }
        
        // Reset
        inImportBlock = false;
        currentImport = '';
        importItems = [];
        fromClause = '';
        continue;
      }
    }
    
    // Líneas normales
    if (!inImportBlock) {
      fixedLines.push(line);
    }
  }
  
  if (fixed) {
    const newContent = fixedLines.join('\n');
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Corregido: ${path.relative(srcDir, filePath)}`);
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
      if (fixImports(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección de imports completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}