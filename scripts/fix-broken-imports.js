#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO IMPORTS ROTOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

function fixBrokenImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Corregir imports duplicados y malformados
  content = content.replace(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"];\s*import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"];/g, 
    (match, imports1, path1, imports2, path2) => {
      if (path1 === path2) {
        // Mismo path, combinar imports
        const allImports = [...imports1.split(','), ...imports2.split(',')]
          .map(imp => imp.trim())
          .filter(imp => imp && imp !== '')
          .filter((imp, index, arr) => arr.indexOf(imp) === index); // remover duplicados
        
        return `import {\n  ${allImports.join(',\n  ')}\n} from '${path1}';`;
      } else {
        // Paths diferentes, mantener separados
        return `import {\n  ${imports1.trim()}\n} from '${path1}';\nimport {\n  ${imports2.trim()}\n} from '${path2}';`;
      }
    });
  
  // Corregir líneas como "import { UseGuards } from '@nestjs/common';" que están sueltas
  content = content.replace(/(\s*import\s*{\s*[^}]+\s*}\s*from\s*['"][^'"]+['"];)\s*import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"];/g,
    (match, firstImport, secondImports, secondPath) => {
      return `${firstImport}\nimport {\n  ${secondImports.trim()}\n} from '${secondPath}';`;
    });
  
  // Corregir imports que están mezclados con otros elementos
  content = content.replace(/}\s*from\s*['"][^'"]*['"];\s*import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"];/g,
    (match, imports, fromPath) => {
      return `} from '@nestjs/common';\nimport {\n  ${imports.trim()}\n} from '${fromPath}';`;
    });
  
  // Limpiar líneas que solo tienen "import {" sin cierre
  content = content.replace(/^\s*import\s*{\s*$/gm, '');
  
  // Limpiar líneas que solo tienen "import { SomeClass } from" sin path
  content = content.replace(/^\s*import\s*{\s*[^}]*\s*}\s*from\s*$/gm, '');
  
  // Corregir imports específicos problemáticos
  const lines = content.split('\n');
  const fixedLines = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar líneas problemáticas como "import { ApiTags } from '@nestjs/swagger';"
    if (trimmedLine.startsWith('import { ') && trimmedLine.includes('} from ') && !trimmedLine.endsWith(';')) {
      // Buscar la línea siguiente que podría tener el punto y coma
      let j = i + 1;
      while (j < lines.length && !lines[j].includes(';') && lines[j].trim() !== '') {
        j++;
      }
      
      if (j < lines.length && lines[j].includes(';')) {
        // Combinar las líneas
        const combinedImport = trimmedLine + lines[j].trim();
        fixedLines.push(combinedImport);
        i = j + 1;
        continue;
      }
    }
    
    // Detectar líneas que empiezan con "import {" sin terminar
    if (trimmedLine.startsWith('import {') && !trimmedLine.includes('} from')) {
      // Saltar esta línea problemática
      i++;
      continue;
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

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalFixed += walkDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      if (fixBrokenImports(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección de imports rotos completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}