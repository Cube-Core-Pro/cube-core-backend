#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN FINAL DE IMPORTS');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

// Mapeo específico de imports que faltan por archivo
const specificFixes = {
  'advanced-accounting-cpa/advanced-accounting-cpa.controller.ts': {
    imports: [
      "import { Controller, Get } from '@nestjs/common';",
      "import { ApiTags } from '@nestjs/swagger';"
    ]
  }
};

// Mapeo de decoradores comunes
const decoratorImports = {
  '@Controller': '@nestjs/common',
  '@Get': '@nestjs/common',
  '@Post': '@nestjs/common',
  '@Put': '@nestjs/common',
  '@Delete': '@nestjs/common',
  '@Patch': '@nestjs/common',
  '@Body': '@nestjs/common',
  '@Param': '@nestjs/common',
  '@Query': '@nestjs/common',
  '@UseGuards': '@nestjs/common',
  '@Injectable': '@nestjs/common',
  '@Module': '@nestjs/common',
  '@ApiTags': '@nestjs/swagger',
  '@ApiOperation': '@nestjs/swagger',
  '@ApiResponse': '@nestjs/swagger',
  '@ApiBearerAuth': '@nestjs/swagger',
  '@ApiProperty': '@nestjs/swagger',
  '@ApiPropertyOptional': '@nestjs/swagger',
  '@IsString': 'class-validator',
  '@IsOptional': 'class-validator',
  '@IsEmail': 'class-validator',
  '@IsEnum': 'class-validator',
  '@IsNumber': 'class-validator',
  '@IsBoolean': 'class-validator',
  '@IsArray': 'class-validator',
  '@MinLength': 'class-validator',
  '@MaxLength': 'class-validator',
  '@Transform': 'class-transformer',
  '@Type': 'class-transformer'
};

function fixFileImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  
  // Verificar si el archivo tiene imports específicos definidos
  if (specificFixes[relativePath]) {
    const { imports } = specificFixes[relativePath];
    const lines = content.split('\n');
    
    // Encontrar donde insertar los imports
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*')) {
        break;
      }
    }
    
    // Insertar imports faltantes
    const newImports = imports.filter(imp => !content.includes(imp));
    if (newImports.length > 0) {
      lines.splice(insertIndex, 0, ...newImports, '');
      content = lines.join('\n');
    }
  }
  
  // Detectar decoradores usados y agregar imports necesarios
  const neededImports = new Map();
  
  Object.entries(decoratorImports).forEach(([decorator, pkg]) => {
    if (content.includes(decorator)) {
      if (!neededImports.has(pkg)) {
        neededImports.set(pkg, new Set());
      }
      const importName = decorator.substring(1); // Remover @
      neededImports.get(pkg).add(importName);
    }
  });
  
  // Verificar si ya existen los imports
  neededImports.forEach((imports, pkg) => {
    const existingImportRegex = new RegExp(`import\\s*{[^}]*}\\s*from\\s*['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
    const existingMatch = content.match(existingImportRegex);
    
    if (existingMatch) {
      // Verificar qué imports faltan
      const existingImports = existingMatch[0].match(/{([^}]*)}/)[1]
        .split(',')
        .map(imp => imp.trim())
        .filter(imp => imp);
      
      const missingImports = Array.from(imports).filter(imp => 
        !existingImports.some(existing => existing === imp)
      );
      
      if (missingImports.length > 0) {
        const allImports = [...existingImports, ...missingImports].sort();
        const newImportLine = `import {\n  ${allImports.join(',\n  ')}\n} from '${pkg}';`;
        content = content.replace(existingImportRegex, newImportLine);
      }
    } else if (imports.size > 0) {
      // Agregar nuevo import
      const importList = Array.from(imports).sort();
      const newImportLine = `import {\n  ${importList.join(',\n  ')}\n} from '${pkg}';`;
      
      // Encontrar donde insertar
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*')) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, newImportLine);
      content = lines.join('\n');
    }
  });
  
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