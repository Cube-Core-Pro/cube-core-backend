#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN FINAL DE IMPORTS MALFORMADOS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function fixImportSyntax(content) {
  let fixed = content;
  
  // Fix broken import statements that are missing closing braces or 'from' clauses
  fixed = fixed.replace(/import\s*{\s*([^}]*)\s*$/gm, (match, imports) => {
    // If we find an incomplete import, try to find the next line with 'from'
    return match; // Keep as is for now, will be handled by line-by-line processing
  });
  
  // Fix imports that have missing closing braces
  fixed = fixed.replace(/import\s*{\s*([^}]*)\s*\n\s*export/gm, (match, imports) => {
    return `import {\n  ${imports.trim()}\n} from '@nestjs/common';\n\nexport`;
  });
  
  return fixed;
}

function reconstructImports(lines) {
  const result = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Check if this is a broken import line
    if (line.startsWith('import {') && !line.includes('} from')) {
      // This is a broken import, try to reconstruct it
      let importContent = line.replace('import {', '').trim();
      let j = i + 1;
      
      // Look for the closing part
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        if (nextLine.includes('} from')) {
          // Found the closing part
          const fromPart = nextLine.match(/}\s*from\s*['"]([^'"]+)['"]/);
          if (fromPart) {
            const pkg = fromPart[1];
            const imports = importContent.split(',').map(imp => imp.trim()).filter(imp => imp);
            result.push(`import {\n  ${imports.join(',\n  ')}\n} from '${pkg}';`);
            i = j + 1;
            break;
          }
        } else if (nextLine && !nextLine.startsWith('export') && !nextLine.startsWith('@')) {
          importContent += ', ' + nextLine;
        } else {
          // Couldn't find proper closing, add as is
          result.push(lines[i]);
          i++;
          break;
        }
        j++;
      }
      
      if (j >= lines.length) {
        // Reached end without finding closing, add as is
        result.push(lines[i]);
        i++;
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  
  return result;
}

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  
  // Split into lines for processing
  let lines = content.split('\n');
  
  // Reconstruct broken imports
  lines = reconstructImports(lines);
  
  // Join back and apply other fixes
  content = lines.join('\n');
  content = fixImportSyntax(content);
  
  // Remove duplicate empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corregido: ${relativePath}`);
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
      if (fixFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección final completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}