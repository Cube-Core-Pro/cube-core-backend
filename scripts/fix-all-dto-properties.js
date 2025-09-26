const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Getting compilation errors...');

// Get all TS2564 errors from build output
let buildOutput;
try {
  execSync('npm run build', { cwd: '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend', stdio: 'pipe' });
} catch (error) {
  buildOutput = error.stdout.toString() + error.stderr.toString();
}

if (!buildOutput) {
  console.log('No build errors found or build succeeded');
  process.exit(0);
}

// Parse TS2564 errors
const ts2564Errors = buildOutput
  .split('\n')
  .filter(line => line.includes('TS2564') && line.includes('Property') && line.includes('has no initializer'))
  .map(line => {
    const match = line.match(/^(.+?):(\d+):(\d+) - error TS2564: Property '(.+?)' has no initializer/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        property: match[4]
      };
    }
    return null;
  })
  .filter(Boolean);

console.log(`Found ${ts2564Errors.length} DTO property initialization errors`);

if (ts2564Errors.length === 0) {
  console.log('No DTO property errors to fix');
  process.exit(0);
}

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
      
      // Skip if it's a WebSocketServer property (these are handled differently)
      if (line.includes('@WebSocketServer()') || line.includes('server: Server')) {
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

// Now fix WebSocketServer properties separately
console.log('\nFixing WebSocketServer properties...');

const webSocketFiles = [
  'src/ai/ai.gateway.ts',
  'src/analytics/analytics.gateway.ts',
  'src/messaging/messaging.gateway.ts',
  'src/notifications/notifications.gateway.ts',
  'src/ofimatica/ofimatica.gateway.ts',
  'src/pdf-sign/pdf-sign.gateway.ts',
  'src/siat/siat.gateway.ts',
  'src/socket/socket.gateway.ts',
  'src/webmail/webmail.gateway.ts'
];

webSocketFiles.forEach(filePath => {
  const fullPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix WebSocketServer property declaration
  if (content.includes('server: Server;') && !content.includes('server!: Server;')) {
    content = content.replace(/(\s+)server: Server;/g, '$1server!: Server;');
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed WebSocketServer in ${filePath}`);
  }
});

console.log('WebSocketServer fixes completed');