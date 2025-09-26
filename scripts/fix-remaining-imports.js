#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN DE IMPORTS RESTANTES');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

// Mapeo de imports comunes que faltan
const commonImports = {
  '@nestjs/common': ['Injectable', 'Logger', 'Module', 'CanActivate', 'ExecutionContext'],
  '@nestjs/core': ['Reflector'],
  '@nestjs/swagger': ['ApiProperty', 'ApiPropertyOptional'],
  'class-validator': ['IsString', 'IsOptional', 'IsEnum', 'IsNumber', 'IsBoolean', 'IsArray'],
  'class-transformer': ['Transform', 'Type']
};

function fixFileImports(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Detectar si el archivo tiene líneas rotas al inicio
  const lines = content.split('\n');
  let hasIssues = false;
  
  // Buscar líneas problemáticas en las primeras 20 líneas
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('import') && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('export') && !line.startsWith('@')) {
      // Si encontramos una línea que parece ser un import roto
      if (line.includes('} from ') || line.match(/^[A-Z][a-zA-Z0-9_]*,?$/)) {
        hasIssues = true;
        break;
      }
    }
  }
  
  if (!hasIssues) return false;
  
  // Extraer imports necesarios del contenido
  const neededImports = new Map();
  
  // Buscar decoradores y funciones usadas
  Object.entries(commonImports).forEach(([pkg, imports]) => {
    imports.forEach(imp => {
      if (content.includes(`@${imp}`) || content.includes(`${imp}(`) || content.includes(`extends ${imp}`) || content.includes(`implements ${imp}`)) {
        if (!neededImports.has(pkg)) {
          neededImports.set(pkg, new Set());
        }
        neededImports.get(pkg).add(imp);
      }
    });
  });
  
  // Buscar imports de servicios y controladores locales
  const localImports = [];
  
  // Buscar servicios
  const serviceMatches = content.match(/(\w+Service)/g);
  if (serviceMatches) {
    const uniqueServices = [...new Set(serviceMatches)];
    uniqueServices.forEach(service => {
      if (content.includes(`private readonly ${service.toLowerCase()}`) || 
          content.includes(`private ${service.toLowerCase()}`)) {
        const servicePath = findServicePath(filePath, service);
        if (servicePath) {
          localImports.push({ name: service, path: servicePath });
        }
      }
    });
  }
  
  // Buscar controladores
  const controllerMatches = content.match(/(\w+Controller)/g);
  if (controllerMatches) {
    const uniqueControllers = [...new Set(controllerMatches)];
    uniqueControllers.forEach(controller => {
      if (content.includes(`controllers: [${controller}]`)) {
        const controllerPath = findControllerPath(filePath, controller);
        if (controllerPath) {
          localImports.push({ name: controller, path: controllerPath });
        }
      }
    });
  }
  
  // Construir nuevos imports
  const newImports = [];
  
  // Agregar imports de paquetes
  neededImports.forEach((imports, pkg) => {
    if (imports.size > 0) {
      const importList = Array.from(imports).sort();
      newImports.push(`import {\n  ${importList.join(',\n  ')}\n} from '${pkg}';`);
    }
  });
  
  // Agregar imports locales
  localImports.forEach(imp => {
    newImports.push(`import { ${imp.name} } from '${imp.path}';`);
  });
  
  // Encontrar donde empiezan las declaraciones
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
  
  if (newContent !== originalContent && newImports.length > 0) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Corregido: ${path.relative(srcDir, filePath)}`);
    return true;
  }
  
  return false;
}

function findServicePath(filePath, serviceName) {
  const dir = path.dirname(filePath);
  const fileName = serviceName.toLowerCase().replace('service', '');
  
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

function findControllerPath(filePath, controllerName) {
  const dir = path.dirname(filePath);
  const fileName = controllerName.toLowerCase().replace('controller', '');
  
  const possiblePaths = [
    `./${fileName}.controller`,
    `../${fileName}/${fileName}.controller`,
    `../controllers/${fileName}.controller`,
    `./controllers/${fileName}.controller`
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
  console.log('🎯 Corrección de imports restantes completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}