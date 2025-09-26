#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA DE IMPORTS MALFORMADOS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function cleanFileImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  
  // Detectar y corregir imports malformados
  let hasChanges = false;
  
  // 1. Corregir imports duplicados o malformados
  content = content.replace(/import\s*{\s*import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"];\s*;\s*}/g, 
    (match, imports, pkg) => {
      hasChanges = true;
      return `import {\n  ${imports.trim()}\n} from '${pkg}';`;
    });
  
  // 2. Corregir líneas de import rotas
  content = content.replace(/import\s*{\s*([^}]*)\s*import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"];\s*;/g,
    (match, imports1, imports2, pkg) => {
      hasChanges = true;
      const allImports = [...imports1.split(','), ...imports2.split(',')]
        .map(imp => imp.trim())
        .filter(imp => imp && imp !== 'import')
        .filter((imp, index, arr) => arr.indexOf(imp) === index); // Remove duplicates
      return `import {\n  ${allImports.join(',\n  ')}\n} from '${pkg}';`;
    });
  
  // 3. Corregir punto y coma dobles
  content = content.replace(/;;/g, ';');
  
  // 4. Corregir imports con nombres de servicios sueltos
  content = content.replace(/^\s*([A-Z][a-zA-Z]*Service)\s*$/gm, '');
  content = content.replace(/^\s*}\s*from\s*['"]([^'"]+)['"];\s*$/gm, '');
  
  // 5. Limpiar líneas vacías múltiples
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // 6. Reconstruir imports si están muy rotos
  const lines = content.split('\n');
  const cleanedLines = [];
  let inBrokenImport = false;
  let brokenImportBuffer = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar inicio de import roto
    if (line.includes('import {') && !line.includes('} from')) {
      inBrokenImport = true;
      brokenImportBuffer = line;
      continue;
    }
    
    // Si estamos en un import roto, acumular
    if (inBrokenImport) {
      brokenImportBuffer += ' ' + line.trim();
      
      // Si encontramos el final del import
      if (line.includes('} from')) {
        // Intentar reconstruir el import
        const match = brokenImportBuffer.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (match) {
          const imports = match[1].split(',').map(imp => imp.trim()).filter(imp => imp);
          const pkg = match[2];
          cleanedLines.push(`import {\n  ${imports.join(',\n  ')}\n} from '${pkg}';`);
          hasChanges = true;
        } else {
          cleanedLines.push(brokenImportBuffer);
        }
        inBrokenImport = false;
        brokenImportBuffer = '';
        continue;
      }
    } else {
      cleanedLines.push(line);
    }
  }
  
  if (hasChanges) {
    content = cleanedLines.join('\n');
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Limpiado: ${relativePath}`);
    return true;
  }
  
  return false;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalCleaned = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalCleaned += walkDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      if (cleanFileImports(filePath)) {
        totalCleaned++;
      }
    }
  }
  
  return totalCleaned;
}

try {
  const totalCleaned = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos limpiados: ${totalCleaned}`);
  console.log('🎯 Limpieza de imports malformados completada');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
}