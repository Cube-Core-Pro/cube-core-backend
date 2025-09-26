#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN DE MÓDULOS ROTOS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function fixModuleFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  
  // Detectar si es un archivo de módulo roto
  if (content.includes('@Module({') && content.includes('} from \'@nestjs/common\';')) {
    // Este es un módulo roto, necesita reconstrucción completa
    const lines = content.split('\n');
    const newLines = [];
    let inModuleDecorator = false;
    let moduleContent = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('import {') && !line.includes('} from')) {
        // Inicio de import roto
        let importLine = line;
        let j = i + 1;
        while (j < lines.length && !lines[j].includes('} from')) {
          importLine += ', ' + lines[j].trim();
          j++;
        }
        if (j < lines.length) {
          importLine += ' ' + lines[j];
          i = j;
        }
        
        // Reconstruir import
        const match = importLine.match(/import\s*{\s*([^}]*)\s*}\s*from\s*['"]([^'"]+)['"]/);
        if (match) {
          const imports = match[1].split(',').map(imp => imp.trim()).filter(imp => imp);
          const pkg = match[2];
          newLines.push(`import { ${imports.join(', ')} } from '${pkg}';`);
        }
        continue;
      }
      
      if (line.includes('@Module({')) {
        inModuleDecorator = true;
        moduleContent = line;
        continue;
      }
      
      if (inModuleDecorator) {
        if (line.includes('} from \'@nestjs/common\';')) {
          // Fin del módulo roto, reconstruir
          inModuleDecorator = false;
          
          // Extraer el contenido del módulo
          const moduleMatch = moduleContent.match(/@Module\(\{([\s\S]*)\}\)/);
          if (moduleMatch) {
            newLines.push('@Module({');
            newLines.push(moduleMatch[1]);
            newLines.push('})');
          }
          continue;
        } else {
          moduleContent += '\n' + line;
          continue;
        }
      }
      
      // Líneas normales
      if (!line.includes('} from \'@nestjs/common\';') || !inModuleDecorator) {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
  }
  
  // Limpiar líneas vacías múltiples
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
    } else if (file.endsWith('.module.ts') || file.endsWith('.service.ts')) {
      if (fixModuleFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección de módulos completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}