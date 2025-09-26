#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO ERRORES DE NOMENCLATURA ESPECÍFICOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

// Función para convertir nombres con guiones a camelCase
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Función para convertir nombres con guiones a PascalCase
function toPascalCase(str) {
  const camelCase = toCamelCase(str);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

// Función para corregir un archivo específico
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixed = false;

  // Obtener el nombre del módulo desde la ruta
  const moduleName = path.basename(path.dirname(filePath));
  const fileName = path.basename(filePath);
  
  // Solo procesar archivos de módulos con guiones
  if (!moduleName.includes('-')) return false;

  const camelCaseName = toCamelCase(moduleName);
  const pascalCaseName = toPascalCase(moduleName);

  console.log(`🔧 Corrigiendo ${moduleName}/${fileName}...`);

  if (fileName.endsWith('.controller.ts')) {
    // Corregir controladores
    
    // Corregir import del servicio
    const serviceImportRegex = new RegExp(`import\\s*{\\s*([^}]*)\\s*}\\s*from\\s*['"]\\.\\/${moduleName}\\.service['"]`);
    content = content.replace(serviceImportRegex, `import { ${pascalCaseName}Service } from './${moduleName}.service';`);
    
    // Corregir nombre de la clase
    const classRegex = new RegExp(`export class ${moduleName.replace(/-/g, '')}Controller`);
    content = content.replace(classRegex, `export class ${pascalCaseName}Controller`);
    
    // Corregir constructor
    const constructorRegex = new RegExp(`constructor\\(private readonly ${moduleName}Service: [^)]+\\)`);
    content = content.replace(constructorRegex, `constructor(private readonly ${camelCaseName}Service: ${pascalCaseName}Service)`);
    
    // Corregir referencias al servicio en métodos
    const serviceCallRegex = new RegExp(`this\\.${moduleName}Service`, 'g');
    content = content.replace(serviceCallRegex, `this.${camelCaseName}Service`);
    
    fixed = true;
  }
  
  if (fileName.endsWith('.service.ts')) {
    // Corregir servicios
    
    // Corregir nombre de la clase
    const classRegex = new RegExp(`export class ${moduleName.replace(/-/g, '')}Service`);
    content = content.replace(classRegex, `export class ${pascalCaseName}Service`);
    
    // Corregir Logger
    const loggerRegex = new RegExp(`new Logger\\(${moduleName.replace(/-/g, '')}Service\\.name\\)`);
    content = content.replace(loggerRegex, `new Logger(${pascalCaseName}Service.name)`);
    
    fixed = true;
  }
  
  if (fileName.endsWith('.module.ts')) {
    // Corregir módulos
    
    // Corregir imports
    const controllerImportRegex = new RegExp(`import\\s*{\\s*([^}]*)\\s*}\\s*from\\s*['"]\\.\\/${moduleName}\\.controller['"]`);
    content = content.replace(controllerImportRegex, `import { ${pascalCaseName}Controller } from './${moduleName}.controller';`);
    
    const serviceImportRegex = new RegExp(`import\\s*{\\s*([^}]*)\\s*}\\s*from\\s*['"]\\.\\/${moduleName}\\.service['"]`);
    content = content.replace(serviceImportRegex, `import { ${pascalCaseName}Service } from './${moduleName}.service';`);
    
    // Corregir nombre de la clase del módulo
    const moduleClassRegex = new RegExp(`export class [^{]+Module`);
    content = content.replace(moduleClassRegex, `export class ${pascalCaseName}Module`);
    
    // Corregir arrays del decorador @Module
    content = content.replace(/controllers:\s*\[[^\]]*\]/, `controllers: [${pascalCaseName}Controller]`);
    content = content.replace(/providers:\s*\[[^\]]*\]/, `providers: [${pascalCaseName}Service]`);
    content = content.replace(/exports:\s*\[[^\]]*\]/, `exports: [${pascalCaseName}Service]`);
    
    fixed = true;
  }

  // Guardar solo si hubo cambios
  if (fixed && content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corregido: ${moduleName}/${fileName}`);
    return true;
  }
  
  return false;
}

// Función principal para recorrer directorios
function fixAllModules() {
  const modules = fs.readdirSync(srcDir).filter(item => {
    const itemPath = path.join(srcDir, item);
    return fs.statSync(itemPath).isDirectory() && item.includes('-');
  });

  console.log(`📁 Encontrados ${modules.length} módulos con guiones para corregir`);

  let totalFixed = 0;
  
  for (const module of modules) {
    const moduleDir = path.join(srcDir, module);
    
    // Corregir archivos principales del módulo
    const files = [
      `${module}.controller.ts`,
      `${module}.service.ts`,
      `${module}.module.ts`
    ];
    
    for (const file of files) {
      const filePath = path.join(moduleDir, file);
      if (fixFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  console.log(`\n📊 Total de archivos corregidos: ${totalFixed}`);
}

// Ejecutar correcciones
try {
  fixAllModules();
  console.log('\n🎯 Correcciones de nomenclatura completadas');
  console.log('🔍 Ejecutando verificación...');
  
} catch (error) {
  console.error('❌ Error durante las correcciones:', error.message);
}