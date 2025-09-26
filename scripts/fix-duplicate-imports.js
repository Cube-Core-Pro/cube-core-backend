#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO IMPORTS DUPLICADOS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function fixDuplicateImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Dividir en líneas
  const lines = content.split('\n');
  const importLines = [];
  const otherLines = [];
  const seenImports = new Set();
  
  let inImportSection = true;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Si es una línea de import
    if (trimmedLine.startsWith('import ') && inImportSection) {
      // Extraer el identificador del import
      const importMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/);
      
      if (importMatch) {
        const importedItems = importMatch[1].split(',').map(item => item.trim());
        const fromPath = importMatch[2];
        const importKey = `${importedItems.join(',')}_from_${fromPath}`;
        
        if (!seenImports.has(importKey)) {
          seenImports.add(importKey);
          importLines.push(line);
        }
      } else {
        // Import sin destructuring o import default
        const simpleImportMatch = line.match(/import\s+([^'"]+)\s+from\s+['"]([^'"]+)['"]/);
        if (simpleImportMatch) {
          const importKey = `${simpleImportMatch[1]}_from_${simpleImportMatch[2]}`;
          if (!seenImports.has(importKey)) {
            seenImports.add(importKey);
            importLines.push(line);
          }
        } else {
          importLines.push(line);
        }
      }
    } else {
      // No es una línea de import
      if (trimmedLine !== '' || !inImportSection) {
        inImportSection = false;
      }
      otherLines.push(line);
    }
  }
  
  // Reconstruir el contenido
  const newContent = [...importLines, ...otherLines].join('\n');
  
  // Limpiar punto y coma duplicados
  const cleanedContent = newContent.replace(/;;+/g, ';');
  
  if (cleanedContent !== originalContent) {
    fs.writeFileSync(filePath, cleanedContent);
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
      if (fixDuplicateImports(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Limpieza de imports completada');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
}