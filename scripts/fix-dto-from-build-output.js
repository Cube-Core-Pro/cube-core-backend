const fs = require('fs');
const path = require('path');

// Read the build output file
const buildOutputPath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/build-output.txt';
const buildOutput = fs.readFileSync(buildOutputPath, 'utf8');

// Extract TS2564 errors (property initialization)
const ts2564Errors = [];
const lines = buildOutput.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('TS2564') && line.includes('Property') && line.includes('has no initializer')) {
    const match = line.match(/^(.+?):(\d+):(\d+) - error TS2564: Property '(.+?)' has no initializer/);
    if (match) {
      ts2564Errors.push({
        file: match[1],
        line: parseInt(match[2]),
        property: match[4]
      });
    }
  }
}

console.log(`Found ${ts2564Errors.length} DTO property initialization errors`);

// Group errors by file
const fileErrors = {};
ts2564Errors.forEach(error => {
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
  
  // Sort errors by line number in descending order to avoid line number shifts
  const sortedErrors = fileErrors[filePath].sort((a, b) => b.line - a.line);
  
  sortedErrors.forEach(error => {
    const lines = content.split('\n');
    const lineIndex = error.line - 1;
    
    if (lineIndex < lines.length) {
      const line = lines[lineIndex];
      
      // Skip WebSocketServer properties - they need special handling
      if (line.includes('@WebSocketServer()') || 
          (line.includes('server:') && line.includes('Server'))) {
        // Fix WebSocketServer property
        if (line.includes('server: Server;') && !line.includes('server!: Server;')) {
          lines[lineIndex] = line.replace('server: Server;', 'server!: Server;');
          console.log(`Fixed WebSocketServer in ${filePath}:${error.line}`);
          modified = true;
          totalFixed++;
        }
        return;
      }
      
      // Add definite assignment assertion if the property doesn't already have it
      if (line.includes(`${error.property}:`) && !line.includes(`${error.property}!:`)) {
        lines[lineIndex] = line.replace(`${error.property}:`, `${error.property}!:`);
        console.log(`Fixed ${filePath}:${error.line} - ${error.property}`);
        modified = true;
        totalFixed++;
      }
    }
    
    if (modified) {
      content = lines.join('\n');
    }
  });
  
  // Write the fixed content back if modified
  if (modified) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log(`\nTotal properties fixed: ${totalFixed}`);
console.log('DTO property fixes completed');