const fs = require('fs');
const path = require('path');

// Files that need the same DTO pattern fix
const dtoFiles = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/logger/dto/log-query.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/create-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/delete-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts'
];

function fixDtoFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Fix errorMessages[lang] access by adding fallback
  const pattern1 = /errorMessages\[lang\]/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '(errorMessages[lang] || errorMessages[Language.EN])');
    modified = true;
    console.log(`Fixed errorMessages access in ${path.basename(filePath)}`);
  }

  // Pattern 2: Fix schema function to use messages variable
  const schemaPattern = /export const (\w+Schema) = \(lang: Language = Language\.EN\) => z\.object\(/;
  const match = content.match(schemaPattern);
  if (match) {
    const schemaName = match[1];
    const oldPattern = `export const ${schemaName} = (lang: Language = Language.EN) => z.object(`;
    const newPattern = `export const ${schemaName} = (lang: Language = Language.EN) => {
  const messages = errorMessages[lang] || errorMessages[Language.EN];
  return z.object(`;
    
    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      // Also need to close the function properly
      const lastBrace = content.lastIndexOf('});');
      if (lastBrace !== -1) {
        content = content.substring(0, lastBrace) + '  });\n};' + content.substring(lastBrace + 3);
      }
      modified = true;
      console.log(`Fixed schema function in ${path.basename(filePath)}`);
    }
  }

  // Pattern 3: Replace errorMessages[lang] with messages in the schema
  content = content.replace(/\(errorMessages\[lang\] \|\| errorMessages\[Language\.EN\]\)/g, 'messages');

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix each file
let totalFixed = 0;
dtoFiles.forEach(filePath => {
  if (fixDtoFile(filePath)) {
    totalFixed++;
  }
});

console.log(`Fixed ${totalFixed} DTO files`);