#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 LIMPIEZA DE EMERGENCIA - ARCHIVOS COMPLETAMENTE ROTOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

// Template básico para módulos
const moduleTemplate = (moduleName, serviceName, controllerName) => `import { Module } from '@nestjs/common';
import { ${serviceName} } from './${moduleName}.service';
import { ${controllerName} } from './${moduleName}.controller';

@Module({
  controllers: [${controllerName}],
  providers: [${serviceName}],
  exports: [${serviceName}],
})
export class ${moduleName.split('-').map(word => 
  word.charAt(0).toUpperCase() + word.slice(1)
).join('')}Module {}`;

// Template básico para servicios
const serviceTemplate = (serviceName) => `import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ${serviceName} {
  private readonly logger = new Logger(${serviceName}.name);

  async findAll(query: any) {
    this.logger.log('Finding all items');
    return {
      data: [],
      message: 'Service not yet implemented'
    };
  }

  async findOne(id: string) {
    this.logger.log(\`Finding item with id: \${id}\`);
    return {
      data: null,
      message: 'Service not yet implemented'
    };
  }

  async create(createDto: any) {
    this.logger.log('Creating new item');
    return {
      data: createDto,
      message: 'Service not yet implemented'
    };
  }

  async update(id: string, updateDto: any) {
    this.logger.log(\`Updating item with id: \${id}\`);
    return {
      data: updateDto,
      message: 'Service not yet implemented'
    };
  }

  async remove(id: string) {
    this.logger.log(\`Removing item with id: \${id}\`);
    return {
      message: 'Service not yet implemented'
    };
  }
}`;

function isFileBroken(content) {
  // Detectar archivos completamente rotos
  return (
    content.includes('import { Module, @Module({') ||
    content.includes('} from \'@nestjs/common\';') && content.includes('@Module({') ||
    content.includes('@Injectable()') && content.includes('} from \'@nestjs/common\';') ||
    content.split('\n')[0].length > 500 // Línea extremadamente larga
  );
}

function fixBrokenFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  const fileName = path.basename(filePath, '.ts');
  
  if (!isFileBroken(content)) return false;
  
  if (filePath.endsWith('.module.ts')) {
    // Reconstruir módulo
    const moduleName = fileName.replace('.module', '');
    const serviceName = moduleName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Service';
    const controllerName = moduleName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Controller';
    
    content = moduleTemplate(moduleName, serviceName, controllerName);
  } else if (filePath.endsWith('.service.ts')) {
    // Reconstruir servicio
    const serviceName = fileName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('').replace('.service', '') + 'Service';
    
    content = serviceTemplate(serviceName);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`🔧 Reconstruido: ${relativePath}`);
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
    } else if ((file.endsWith('.module.ts') || file.endsWith('.service.ts')) && !file.includes('prisma')) {
      if (fixBrokenFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de archivos reconstruidos: ${totalFixed}`);
  console.log('🎯 Limpieza de emergencia completada');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
}