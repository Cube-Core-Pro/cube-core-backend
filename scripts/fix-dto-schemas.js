const fs = require('fs');
const path = require('path');

// Files that need schema function fixes
const dtoFiles = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/logger/dto/log-query.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/delete-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts'
];

function fixSchemaFunction(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Find schema export pattern
  const schemaPattern = /export const (\w+Schema) = \([^)]+\) => z\.object\(/;
  const match = content.match(schemaPattern);
  
  if (match) {
    const schemaName = match[1];
    
    // Find the full schema function
    const functionStart = content.indexOf(`export const ${schemaName}`);
    if (functionStart === -1) return false;
    
    // Find the matching closing parenthesis and semicolon
    let braceCount = 0;
    let parenCount = 0;
    let inObject = false;
    let functionEnd = -1;
    
    for (let i = functionStart; i < content.length; i++) {
      const char = content[i];
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (char === '{') {
        braceCount++;
        if (!inObject && braceCount === 1) inObject = true;
      }
      if (char === '}') {
        braceCount--;
        if (inObject && braceCount === 0) {
          // Look for the closing ); or });
          for (let j = i + 1; j < content.length; j++) {
            if (content[j] === ')' && content[j + 1] === ';') {
              functionEnd = j + 2;
              break;
            }
            if (content[j] === ';') {
              functionEnd = j + 1;
              break;
            }
            if (!/\s/.test(content[j])) break;
          }
          break;
        }
      }
    }
    
    if (functionEnd === -1) return false;
    
    const oldFunction = content.substring(functionStart, functionEnd);
    
    // Extract the parameter and object content
    const paramMatch = oldFunction.match(/\(([^)]+)\)/);
    const objectMatch = oldFunction.match(/z\.object\((\{[\s\S]*\})\)/);
    
    if (!paramMatch || !objectMatch) return false;
    
    const param = paramMatch[1];
    const objectContent = objectMatch[1];
    
    // Create new function with messages variable
    const newFunction = `export const ${schemaName} = (${param}) => {
  const messages = errorMessages[lang] || errorMessages['en'];
  return z.object(${objectContent});
};`;
    
    content = content.substring(0, functionStart) + newFunction + content.substring(functionEnd);
    modified = true;
    console.log(`Fixed schema function in ${path.basename(filePath)}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix each file
let totalFixed = 0;
dtoFiles.forEach(filePath => {
  if (fixSchemaFunction(filePath)) {
    totalFixed++;
  }
});

console.log(`Fixed ${totalFixed} schema functions`);