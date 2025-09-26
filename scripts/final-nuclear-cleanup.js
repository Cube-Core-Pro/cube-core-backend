#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('☢️  LIMPIEZA NUCLEAR FINAL');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

// Directorios que debemos mantener
const keepDirs = [
  'auth',
  'admin',
  'users',
  'prisma',
  'common',
  'config',
  'database',
  'health'
];

// Archivos específicos que debemos mantener
const keepFiles = [
  'app.module.ts',
  'app.controller.ts',
  'app.service.ts',
  'main.ts'
];

function shouldKeep(filePath) {
  const relativePath = path.relative(srcDir, filePath);
  const parts = relativePath.split(path.sep);
  
  // Mantener archivos en la raíz de src
  if (parts.length === 1 && keepFiles.includes(parts[0])) {
    return true;
  }
  
  // Mantener directorios específicos
  if (parts.length > 1 && keepDirs.includes(parts[0])) {
    return true;
  }
  
  return false;
}

function deleteRecursively(dir) {
  const files = fs.readdirSync(dir);
  let deletedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (shouldKeep(filePath)) {
        // Mantener el directorio pero limpiar su contenido si es necesario
        deletedCount += cleanDirectory(filePath);
      } else {
        // Eliminar todo el directorio
        deletedCount += deleteDirectory(filePath);
      }
    } else {
      if (!shouldKeep(filePath)) {
        fs.unlinkSync(filePath);
        const relativePath = path.relative(srcDir, filePath);
        console.log(`🗑️  Eliminado: ${relativePath}`);
        deletedCount++;
      }
    }
  }
  
  return deletedCount;
}

function cleanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let deletedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      deletedCount += deleteDirectory(filePath);
    } else {
      // Mantener solo archivos básicos
      const fileName = path.basename(filePath);
      if (fileName.includes('.entity.') || 
          fileName.includes('.dto.') || 
          fileName.includes('.decorator.') ||
          fileName.includes('.guard.') ||
          fileName.includes('.interceptor.') ||
          fileName.includes('.pipe.') ||
          fileName.includes('.middleware.') ||
          (fileName.includes('.controller.') && !fileName.endsWith('.controller.ts')) ||
          (fileName.includes('.service.') && !fileName.endsWith('.service.ts')) ||
          (fileName.includes('.module.') && !fileName.endsWith('.module.ts'))) {
        fs.unlinkSync(filePath);
        const relativePath = path.relative(srcDir, filePath);
        console.log(`🗑️  Eliminado: ${relativePath}`);
        deletedCount++;
      }
    }
  }
  
  return deletedCount;
}

function deleteDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let deletedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      deletedCount += deleteDirectory(filePath);
    } else {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }
  
  fs.rmdirSync(dirPath);
  const relativePath = path.relative(srcDir, dirPath);
  console.log(`📁 Directorio eliminado: ${relativePath}`);
  
  return deletedCount;
}

try {
  const totalDeleted = deleteRecursively(srcDir);
  console.log(`\n📊 Total de archivos/directorios eliminados: ${totalDeleted}`);
  console.log('☢️  Limpieza nuclear completada');
  console.log('✅ Solo quedan los módulos esenciales');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
}