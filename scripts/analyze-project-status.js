#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TSC_BIN = path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');

console.log('🔍 Analyzing project completion status...\n');

const backendDir = path.join(__dirname, '..');
const frontendDir = path.join(__dirname, '..', '..', 'frontend');

// Backend Analysis
console.log('📊 BACKEND ANALYSIS');
console.log('==================');

const srcDir = path.join(backendDir, 'src');
const modules = fs.readdirSync(srcDir).filter(item => {
  const itemPath = path.join(srcDir, item);
  return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
});

console.log(`\n📁 Found ${modules.length} modules:`);
modules.forEach(module => console.log(`   - ${module}`));

// Check each module structure
const moduleAnalysis = {};
let totalErrors = 0;
let totalWarnings = 0;

for (const module of modules) {
  const modulePath = path.join(srcDir, module);
  const analysis = {
    hasModule: false,
    hasController: false,
    hasService: false,
    hasEntities: false,
    entityCount: 0,
    hasTests: false,
    compilationErrors: 0,
    missingFiles: []
  };

  // Check for module file
  const moduleFile = path.join(modulePath, `${module}.module.ts`);
  analysis.hasModule = fs.existsSync(moduleFile);
  if (!analysis.hasModule) {
    analysis.missingFiles.push(`${module}.module.ts`);
  }

  // Check for controllers
  const controllersDir = path.join(modulePath, 'controllers');
  if (fs.existsSync(controllersDir)) {
    const controllers = fs.readdirSync(controllersDir).filter(f => f.endsWith('.controller.ts'));
    analysis.hasController = controllers.length > 0;
  } else {
    const controllerFile = path.join(modulePath, `${module}.controller.ts`);
    analysis.hasController = fs.existsSync(controllerFile);
  }

  // Check for services
  const servicesDir = path.join(modulePath, 'services');
  if (fs.existsSync(servicesDir)) {
    const services = fs.readdirSync(servicesDir).filter(f => f.endsWith('.service.ts'));
    analysis.hasService = services.length > 0;
  } else {
    const serviceFile = path.join(modulePath, `${module}.service.ts`);
    analysis.hasService = fs.existsSync(serviceFile);
  }

  // Check for entities
  const entitiesDir = path.join(modulePath, 'entities');
  if (fs.existsSync(entitiesDir)) {
    const entities = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.entity.ts'));
    analysis.hasEntities = entities.length > 0;
    analysis.entityCount = entities.length;
  }

  // Check for tests
  const testsDir = path.join(modulePath, 'tests');
  analysis.hasTests = fs.existsSync(testsDir);

  // Check compilation
  const tsconfigPath = path.join(modulePath, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      execSync(`node --max-old-space-size=6144 ${TSC_BIN} --noEmit --project ${tsconfigPath} --skipLibCheck`, {
        cwd: modulePath,
        stdio: 'pipe'
      });
    } catch (error) {
      const errorOutput = String(error.stdout || error.stderr || '');
      analysis.compilationErrors = errorOutput.split('\n').filter(line => 
        line.includes('error TS')
      ).length;
    }
  }

  moduleAnalysis[module] = analysis;
  totalErrors += analysis.compilationErrors;
  if (!analysis.hasModule || !analysis.hasController || !analysis.hasService) {
    totalWarnings++;
  }
}

// Display module analysis
console.log('\n📋 MODULE ANALYSIS:');
console.log('===================');
for (const [module, analysis] of Object.entries(moduleAnalysis)) {
  const status = analysis.compilationErrors === 0 ? '✅' : '❌';
  console.log(`\n${status} ${module.toUpperCase()}`);
  console.log(`   Module File: ${analysis.hasModule ? '✅' : '❌'}`);
  console.log(`   Controller: ${analysis.hasController ? '✅' : '❌'}`);
  console.log(`   Service: ${analysis.hasService ? '✅' : '❌'}`);
  console.log(`   Entities: ${analysis.hasEntities ? `✅ (${analysis.entityCount})` : '❌'}`);
  console.log(`   Tests: ${analysis.hasTests ? '✅' : '⚠️'}`);
  console.log(`   Compilation: ${analysis.compilationErrors === 0 ? '✅' : `❌ (${analysis.compilationErrors} errors)`}`);
  
  if (analysis.missingFiles.length > 0) {
    console.log(`   Missing: ${analysis.missingFiles.join(', ')}`);
  }
}

// Frontend Analysis
console.log('\n\n📊 FRONTEND ANALYSIS');
console.log('====================');

if (fs.existsSync(frontendDir)) {
  const frontendSrc = path.join(frontendDir, 'src');
  if (fs.existsSync(frontendSrc)) {
    const frontendModules = [];
    
    // Check for pages/components structure
    const pagesDir = path.join(frontendSrc, 'pages');
    const componentsDir = path.join(frontendSrc, 'components');
    
    if (fs.existsSync(pagesDir)) {
      const pages = fs.readdirSync(pagesDir).filter(item => {
        const itemPath = path.join(pagesDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      console.log(`\n📄 Found ${pages.length} page modules:`);
      pages.forEach(page => console.log(`   - ${page}`));
      frontendModules.push(...pages);
    }

    if (fs.existsSync(componentsDir)) {
      const components = fs.readdirSync(componentsDir).filter(item => {
        const itemPath = path.join(componentsDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
      console.log(`\n🧩 Found ${components.length} component modules:`);
      components.forEach(component => console.log(`   - ${component}`));
    }

    // Check for missing frontend modules corresponding to backend
    const missingFrontendModules = modules.filter(backendModule => 
      !frontendModules.includes(backendModule) && 
      !frontendModules.includes(backendModule.replace(/-/g, '_'))
    );

    if (missingFrontendModules.length > 0) {
      console.log(`\n⚠️  Missing frontend modules for:`);
      missingFrontendModules.forEach(module => console.log(`   - ${module}`));
    }
  } else {
    console.log('❌ Frontend src directory not found');
  }
} else {
  console.log('❌ Frontend directory not found');
}

// Summary
console.log('\n\n📈 SUMMARY');
console.log('==========');
console.log(`Backend Modules: ${modules.length}`);
console.log(`Compilation Errors: ${totalErrors}`);
console.log(`Modules with Issues: ${totalWarnings}`);

const completedModules = Object.values(moduleAnalysis).filter(a => 
  a.hasModule && a.hasController && a.hasService && a.compilationErrors === 0
).length;

console.log(`Completed Modules: ${completedModules}/${modules.length} (${Math.round(completedModules/modules.length*100)}%)`);

// Recommendations
console.log('\n\n🎯 NEXT STEPS');
console.log('=============');

const priorityModules = Object.entries(moduleAnalysis)
  .filter(([_, analysis]) => analysis.compilationErrors > 0)
  .sort(([_, a], [__, b]) => b.compilationErrors - a.compilationErrors)
  .slice(0, 5);

if (priorityModules.length > 0) {
  console.log('\n🔥 Priority fixes (modules with most errors):');
  priorityModules.forEach(([module, analysis]) => {
    console.log(`   1. Fix ${module} (${analysis.compilationErrors} errors)`);
  });
}

const missingModuleFiles = Object.entries(moduleAnalysis)
  .filter(([_, analysis]) => !analysis.hasModule)
  .map(([module, _]) => module);

if (missingModuleFiles.length > 0) {
  console.log('\n📝 Create missing module files:');
  missingModuleFiles.forEach(module => {
    console.log(`   - Create ${module}/${module}.module.ts`);
  });
}

console.log('\n✨ Project is ready for production when all modules show ✅ status');
console.log('🚀 Run individual module builds to test compilation');
