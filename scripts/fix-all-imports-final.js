#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN FINAL DE TODOS LOS IMPORTS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

function fixFileImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Patrón para detectar imports malformados
  const malformedImportPattern = /import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"];?\s*([^i]*?)(?=import\s*{|$)/gs;
  
  content = content.replace(malformedImportPattern, (match, imports, fromPath, afterContent) => {
    // Limpiar imports
    const cleanImports = imports
      .split(/[,\n]/)
      .map(imp => imp.trim())
      .filter(imp => imp && imp !== '' && !imp.startsWith('//'))
      .join(',\n  ');
    
    if (cleanImports) {
      return `import {\n  ${cleanImports}\n} from '${fromPath}';\n${afterContent}`;
    }
    return afterContent;
  });
  
  // Corregir imports específicos problemáticos
  content = content.replace(/}\s*from\s*['"][^'"]*['"];\s*([A-Z][a-zA-Z0-9_]*),?\s*([A-Z][a-zA-Z0-9_]*),?\s*([A-Z][a-zA-Z0-9_]*),?\s*import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/g, 
    (match, item1, item2, item3, imports, fromPath) => {
      const allImports = [item1, item2, item3].filter(Boolean).concat(
        imports.split(',').map(i => i.trim()).filter(Boolean)
      );
      return `} from '${fromPath}';\nimport {\n  ${allImports.join(',\n  ')}\n} from '${fromPath}'`;
    });
  
  // Corregir líneas sueltas que son imports
  const lines = content.split('\n');
  const fixedLines = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar líneas que parecen imports sueltos
    if (trimmedLine && 
        !trimmedLine.startsWith('//') && 
        !trimmedLine.startsWith('*') &&
        !trimmedLine.startsWith('export') && 
        !trimmedLine.startsWith('@') &&
        !trimmedLine.startsWith('class') && 
        !trimmedLine.startsWith('interface') &&
        !trimmedLine.startsWith('const') && 
        !trimmedLine.startsWith('let') &&
        !trimmedLine.startsWith('var') && 
        !trimmedLine.startsWith('function') &&
        !trimmedLine.startsWith('async') && 
        !trimmedLine.startsWith('return') &&
        !trimmedLine.startsWith('if') && 
        !trimmedLine.startsWith('for') &&
        !trimmedLine.startsWith('while') && 
        !trimmedLine.startsWith('switch') &&
        !trimmedLine.startsWith('try') && 
        !trimmedLine.startsWith('catch') &&
        !trimmedLine.startsWith('{') && 
        !trimmedLine.startsWith('}') &&
        !trimmedLine.startsWith('import') &&
        trimmedLine.match(/^[A-Z][a-zA-Z0-9_]*,?\s*$/) &&
        i + 1 < lines.length && 
        (lines[i + 1].trim().startsWith('}') || lines[i + 1].includes('from'))) {
      
      // Buscar el from correspondiente
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('from')) {
        j++;
      }
      
      if (j < lines.length && lines[j].includes('from')) {
        const fromMatch = lines[j].match(/from\s*['"]([^'"]+)['"]/);
        if (fromMatch) {
          const fromPath = fromMatch[1];
          const importName = trimmedLine.replace(',', '').trim();
          
          // Buscar si hay un import anterior para el mismo path
          let foundPreviousImport = false;
          for (let k = fixedLines.length - 1; k >= 0; k--) {
            if (fixedLines[k].includes(`from '${fromPath}'`)) {
              // Agregar al import existente
              fixedLines[k] = fixedLines[k].replace(
                /import\s*{\s*([^}]*)\s*}\s*from/,
                `import {\n  $1,\n  ${importName}\n} from`
              );
              foundPreviousImport = true;
              break;
            }
          }
          
          if (!foundPreviousImport) {
            fixedLines.push(`import { ${importName} } from '${fromPath}';`);
          }
          
          i = j + 1;
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
  console.log('🎯 Corrección final de imports completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}