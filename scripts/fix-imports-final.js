#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN FINAL Y DEFINITIVA DE IMPORTS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

function fixImportsDefinitive(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Si el archivo empieza con líneas rotas, reconstruir desde cero
  const lines = content.split('\n');
  
  // Detectar si el archivo tiene imports rotos al inicio
  if (lines[0].trim() === '' && lines[1] && lines[1].trim() && !lines[1].includes('import')) {
    // El archivo está roto, necesita reconstrucción
    
    // Extraer todas las líneas que parecen imports
    const importLines = [];
    const otherLines = [];
    let inImportSection = true;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Si encontramos una línea que claramente no es import, cambiar de sección
      if (trimmed.startsWith('@') || 
          trimmed.startsWith('export') || 
          trimmed.startsWith('class') ||
          trimmed.startsWith('interface') ||
          trimmed.startsWith('const') ||
          trimmed.startsWith('let') ||
          trimmed.startsWith('var') ||
          trimmed.startsWith('function') ||
          trimmed.startsWith('async')) {
        inImportSection = false;
      }
      
      if (inImportSection && (trimmed.includes('from ') || trimmed.match(/^[A-Z][a-zA-Z0-9_]*,?$/))) {
        importLines.push(trimmed);
      } else if (!inImportSection || (!trimmed.includes('from ') && !trimmed.match(/^[A-Z][a-zA-Z0-9_]*,?$/))) {
        otherLines.push(line);
      }
    }
    
    // Reconstruir imports
    const reconstructedImports = reconstructImports(importLines);
    
    if (reconstructedImports.length > 0) {
      const newContent = reconstructedImports.join('\n') + '\n\n' + otherLines.join('\n');
      
      if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Reconstruido: ${path.relative(srcDir, filePath)}`);
        return true;
      }
    }
  }
  
  return false;
}

function reconstructImports(importLines) {
  const imports = new Map();
  
  for (const line of importLines) {
    if (line.includes('} from ')) {
      const match = line.match(/(.+?)\s*}\s*from\s*['"]([^'"]+)['"]/);
      if (match) {
        const itemsPart = match[1];
        const fromPath = match[2];
        
        // Extraer items
        const items = itemsPart.replace(/.*{/, '').split(',').map(item => item.trim()).filter(Boolean);
        
        if (!imports.has(fromPath)) {
          imports.set(fromPath, new Set());
        }
        
        items.forEach(item => imports.get(fromPath).add(item));
      }
    } else if (line.match(/^[A-Z][a-zA-Z0-9_]*,?$/)) {
      // Item suelto, buscar el from en las siguientes líneas
      // Por ahora lo ignoramos ya que es difícil de reconstruir sin contexto
    }
  }
  
  // Generar imports reconstruidos
  const reconstructed = [];
  
  for (const [fromPath, items] of imports) {
    if (items.size > 0) {
      const itemsArray = Array.from(items);
      reconstructed.push(`import {\n  ${itemsArray.join(',\n  ')}\n} from '${fromPath}';`);
    }
  }
  
  return reconstructed;
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
      if (fixImportsDefinitive(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos reconstruidos: ${totalFixed}`);
  console.log('🎯 Corrección final y definitiva completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}