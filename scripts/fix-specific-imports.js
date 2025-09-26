#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN ESPECÍFICA DE IMPORTS PROBLEMÁTICOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

// Patrones comunes de imports que necesitan corrección
const importPatterns = {
  nestjsCommon: [
    'Body', 'Controller', 'Delete', 'Get', 'HttpException', 'HttpStatus',
    'Injectable', 'Logger', 'Param', 'Post', 'Put', 'Query', 'UseGuards'
  ],
  nestjsSwagger: [
    'ApiBearerAuth', 'ApiOperation', 'ApiResponse', 'ApiTags'
  ],
  typeorm: [
    'Column', 'CreateDateColumn', 'Entity', 'PrimaryGeneratedColumn', 'UpdateDateColumn'
  ]
};

function fixSpecificImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Detectar si el archivo tiene imports rotos
  const lines = content.split('\n');
  let hasImportIssues = false;
  
  // Buscar líneas que indican imports rotos
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('import') && !line.startsWith('//') && !line.startsWith('/*') && 
        (importPatterns.nestjsCommon.includes(line.replace(',', '')) ||
         importPatterns.nestjsSwagger.includes(line.replace(',', '')) ||
         importPatterns.typeorm.includes(line.replace(',', '')))) {
      hasImportIssues = true;
      break;
    }
  }
  
  if (!hasImportIssues) return false;
  
  // Extraer todos los imports necesarios del contenido
  const usedImports = {
    '@nestjs/common': new Set(),
    '@nestjs/swagger': new Set(),
    'typeorm': new Set()
  };
  
  // Buscar qué imports se están usando en el archivo
  importPatterns.nestjsCommon.forEach(imp => {
    if (content.includes(`@${imp}`) || content.includes(`${imp}(`)) {
      usedImports['@nestjs/common'].add(imp);
    }
  });
  
  importPatterns.nestjsSwagger.forEach(imp => {
    if (content.includes(`@${imp}`) || content.includes(`${imp}(`)) {
      usedImports['@nestjs/swagger'].add(imp);
    }
  });
  
  importPatterns.typeorm.forEach(imp => {
    if (content.includes(`@${imp}`) || content.includes(`${imp}(`)) {
      usedImports['typeorm'].add(imp);
    }
  });
  
  // Buscar imports de servicios locales
  const serviceImports = [];
  const serviceMatches = content.match(/(\w+Service)/g);
  if (serviceMatches) {
    serviceMatches.forEach(service => {
      if (content.includes(`private readonly ${service.toLowerCase()}`) || 
          content.includes(`private ${service.toLowerCase()}`)) {
        // Intentar determinar la ruta del servicio
        const servicePath = determineServicePath(filePath, service);
        if (servicePath) {
          serviceImports.push({ name: service, path: servicePath });
        }
      }
    });
  }
  
  // Buscar otros imports comunes
  const otherImports = [];
  if (content.includes('PrismaService')) {
    otherImports.push({ name: 'PrismaService', path: '../prisma/prisma.service' });
  }
  if (content.includes('JwtAuthGuard')) {
    otherImports.push({ name: 'JwtAuthGuard', path: '../../auth/jwt-auth.guard' });
  }
  if (content.includes('RolesGuard')) {
    otherImports.push({ name: 'RolesGuard', path: '../../auth/roles.guard' });
  }
  if (content.includes('Roles(')) {
    otherImports.push({ name: 'Roles', path: '../../auth/roles.decorator' });
  }
  
  // Construir nuevos imports
  const newImports = [];
  
  if (usedImports['@nestjs/common'].size > 0) {
    const imports = Array.from(usedImports['@nestjs/common']).sort();
    newImports.push(`import {\n  ${imports.join(',\n  ')}\n} from '@nestjs/common';`);
  }
  
  if (usedImports['@nestjs/swagger'].size > 0) {
    const imports = Array.from(usedImports['@nestjs/swagger']).sort();
    newImports.push(`import {\n  ${imports.join(',\n  ')}\n} from '@nestjs/swagger';`);
  }
  
  if (usedImports['typeorm'].size > 0) {
    const imports = Array.from(usedImports['typeorm']).sort();
    newImports.push(`import {\n  ${imports.join(',\n  ')}\n} from 'typeorm';`);
  }
  
  // Agregar otros imports
  otherImports.forEach(imp => {
    newImports.push(`import { ${imp.name} } from '${imp.path}';`);
  });
  
  // Agregar imports de servicios
  serviceImports.forEach(imp => {
    newImports.push(`import { ${imp.name} } from '${imp.path}';`);
  });
  
  // Encontrar donde empiezan las declaraciones (después de los imports)
  let declarationStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('@') || line.startsWith('export') || line.startsWith('class') || 
        line.startsWith('interface') || line.startsWith('const') || line.startsWith('function')) {
      declarationStart = i;
      break;
    }
  }
  
  // Reconstruir el archivo
  const declarationLines = lines.slice(declarationStart);
  const newContent = newImports.join('\n') + '\n\n' + declarationLines.join('\n');
  
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Corregido: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  
  return false;
}

function determineServicePath(filePath, serviceName) {
  const dir = path.dirname(filePath);
  const fileName = serviceName.toLowerCase().replace('service', '');
  
  // Intentar diferentes rutas posibles
  const possiblePaths = [
    `./${fileName}.service`,
    `../${fileName}/${fileName}.service`,
    `../services/${fileName}.service`,
    `./services/${fileName}.service`
  ];
  
  for (const possiblePath of possiblePaths) {
    const fullPath = path.resolve(dir, possiblePath + '.ts');
    if (fs.existsSync(fullPath)) {
      return possiblePath;
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
      if (fixSpecificImports(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
  console.log('🎯 Corrección específica completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}