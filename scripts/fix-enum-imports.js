const fs = require('fs');
const path = require('path');

// Read the build output file
const buildOutputPath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/build-output.txt';
const buildOutput = fs.readFileSync(buildOutputPath, 'utf8');

// Remove ANSI color codes
const cleanOutput = buildOutput.replace(/\x1b\[[0-9;]*m/g, '');

// Extract TS2307 errors for enum imports
const enumImportErrors = [];
const lines = cleanOutput.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('TS2307') && 
      (line.includes('src/common/enums/jurisdiction') || 
       line.includes('src/common/enums/language'))) {
    const match = line.match(/^(.+?):(\d+):(\d+) - error TS2307: Cannot find module '(.+?)'/);
    if (match) {
      enumImportErrors.push({
        file: match[1],
        line: parseInt(match[2]),
        module: match[4]
      });
    }
  }
}

console.log(`Found ${enumImportErrors.length} enum import errors`);

if (enumImportErrors.length === 0) {
  console.log('No enum import errors to fix');
  process.exit(0);
}

// Group errors by file
const fileErrors = {};
enumImportErrors.forEach(error => {
  if (!fileErrors[error.file]) {
    fileErrors[error.file] = [];
  }
  fileErrors[error.file].push(error);
});

let totalFixed = 0;

// Fix each file
Object.keys(fileErrors).forEach(filePath => {
  const fullPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix jurisdiction enum imports
  if (content.includes("from 'src/common/enums/jurisdiction'")) {
    // Calculate relative path from current file to the enum
    const currentDir = path.dirname(fullPath);
    const enumPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/common/enums/jurisdiction.ts');
    const relativePath = path.relative(currentDir, enumPath).replace(/\\/g, '/').replace('.ts', '');
    
    // Ensure relative path starts with ./ or ../
    const fixedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
    
    content = content.replace(/from 'src\/common\/enums\/jurisdiction'/g, `from '${fixedPath}'`);
    modified = true;
    console.log(`Fixed jurisdiction import in ${filePath} -> ${fixedPath}`);
    totalFixed++;
  }
  
  // Fix language enum imports
  if (content.includes("from 'src/common/enums/language'")) {
    // Calculate relative path from current file to the enum
    const currentDir = path.dirname(fullPath);
    const enumPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/common/enums/language.ts');
    const relativePath = path.relative(currentDir, enumPath).replace(/\\/g, '/').replace('.ts', '');
    
    // Ensure relative path starts with ./ or ../
    const fixedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
    
    content = content.replace(/from 'src\/common\/enums\/language'/g, `from '${fixedPath}'`);
    modified = true;
    console.log(`Fixed language import in ${filePath} -> ${fixedPath}`);
    totalFixed++;
  }
  
  // Write the fixed content back if modified
  if (modified) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log(`\nTotal enum imports fixed: ${totalFixed}`);
console.log('Enum import fixes completed');