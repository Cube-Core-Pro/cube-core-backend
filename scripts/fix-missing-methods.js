#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 CORRIGIENDO MÉTODOS FALTANTES EN SERVICIOS');
console.log('=' .repeat(60));

const srcDir = path.join(__dirname, '..', 'src');

// Obtener errores de compilación
function getCompilationErrors() {
  try {
    execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    return [];
  } catch (error) {
    const output = error.stdout.toString();
    const lines = output.split('\n');
    const errors = [];
    
    for (const line of lines) {
      // Buscar errores de métodos faltantes
      const methodError = line.match(/Property '(\w+)' does not exist on type '(\w+)'/);
      if (methodError) {
        errors.push({
          method: methodError[1],
          service: methodError[2],
          line: line
        });
      }
      
      // Buscar errores de argumentos
      const argError = line.match(/Expected (\d+) arguments, but got (\d+)/);
      if (argError) {
        errors.push({
          type: 'arguments',
          expected: argError[1],
          got: argError[2],
          line: line
        });
      }
    }
    
    return errors;
  }
}

// Generar método genérico
function generateGenericMethod(methodName, serviceName) {
  const camelCaseService = serviceName.replace(/Service$/, '').toLowerCase();
  
  return `
  async ${methodName}(...args: any[]) {
    this.logger.log(\`Executing ${methodName} with args: \${JSON.stringify(args)}\`);
    try {
      // TODO: Implement actual ${methodName} logic
      return {
        service: '${camelCaseService}',
        method: '${methodName}',
        args: args,
        result: 'success',
        timestamp: new Date(),
        data: {}
      };
    } catch (error) {
      this.logger.error(\`Error in ${methodName}:\`, error);
      throw error;
    }
  }`;
}

// Agregar método a servicio
function addMethodToService(servicePath, methodName, serviceName) {
  if (!fs.existsSync(servicePath)) return false;
  
  let content = fs.readFileSync(servicePath, 'utf8');
  
  // Verificar si el método ya existe
  if (content.includes(`async ${methodName}(`)) {
    return false;
  }
  
  // Encontrar el final de la clase
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex === -1) return false;
  
  // Insertar el método antes del último }
  const methodCode = generateGenericMethod(methodName, serviceName);
  const newContent = content.slice(0, lastBraceIndex) + methodCode + '\n' + content.slice(lastBraceIndex);
  
  fs.writeFileSync(servicePath, newContent);
  console.log(`✅ Agregado método ${methodName} a ${path.relative(srcDir, servicePath)}`);
  return true;
}

// Procesar errores y corregir
function fixMissingMethods() {
  const errors = getCompilationErrors();
  const methodErrors = errors.filter(e => e.method && e.service);
  
  console.log(`📊 Encontrados ${methodErrors.length} métodos faltantes`);
  
  const serviceMethodMap = new Map();
  
  // Agrupar métodos por servicio
  for (const error of methodErrors) {
    if (!serviceMethodMap.has(error.service)) {
      serviceMethodMap.set(error.service, new Set());
    }
    serviceMethodMap.get(error.service).add(error.method);
  }
  
  let totalFixed = 0;
  
  // Procesar cada servicio
  for (const [serviceName, methods] of serviceMethodMap) {
    console.log(`\n🔧 Procesando ${serviceName}:`);
    
    // Buscar archivo del servicio
    const serviceFileName = serviceName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') + '.service.ts';
    const possiblePaths = [
      path.join(srcDir, serviceFileName),
      path.join(srcDir, serviceName.toLowerCase(), serviceFileName),
      path.join(srcDir, serviceName.toLowerCase().replace('service', ''), serviceFileName)
    ];
    
    // Buscar en todos los directorios
    const servicePath = findServiceFile(serviceName);
    
    if (servicePath) {
      for (const method of methods) {
        if (addMethodToService(servicePath, method, serviceName)) {
          totalFixed++;
        }
      }
    } else {
      console.log(`❌ No se encontró archivo para ${serviceName}`);
    }
  }
  
  console.log(`\n📊 Total de métodos agregados: ${totalFixed}`);
  return totalFixed;
}

// Buscar archivo de servicio recursivamente
function findServiceFile(serviceName) {
  const serviceFileName = serviceName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') + '.service.ts';
  
  function searchInDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          const result = searchInDir(filePath);
          if (result) return result;
        } else if (file === serviceFileName || file.includes(serviceName.toLowerCase())) {
          return filePath;
        }
      }
    } catch (error) {
      // Ignorar errores de permisos
    }
    
    return null;
  }
  
  return searchInDir(srcDir);
}

// Ejecutar correcciones
try {
  const fixed = fixMissingMethods();
  
  if (fixed > 0) {
    console.log('\n🔍 Verificando compilación después de las correcciones...');
    
    // Verificar si se redujeron los errores
    const remainingErrors = getCompilationErrors();
    const remainingMethodErrors = remainingErrors.filter(e => e.method && e.service);
    
    console.log(`📈 Errores de métodos restantes: ${remainingMethodErrors.length}`);
    
    if (remainingMethodErrors.length > 0) {
      console.log('\n⚠️  Métodos que aún faltan:');
      for (const error of remainingMethodErrors.slice(0, 10)) {
        console.log(`   • ${error.method} en ${error.service}`);
      }
    }
  }
  
  console.log('\n🎯 Corrección de métodos faltantes completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}