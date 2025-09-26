const fs = require('fs');

const files = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/logger/dto/log-query.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/create-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/delete-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-push.dto.ts'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the messages assignment with a more robust version
    const oldPattern = /const messages = errorMessages\[lang\] \|\| errorMessages\.en;/g;
    const newPattern = `const messages = (errorMessages[lang] || errorMessages.en)!;`;
    
    if (content.includes('const messages = errorMessages[lang] || errorMessages.en;')) {
      content = content.replace(oldPattern, newPattern);
      
      // Remove the ! from individual property accesses since messages is now asserted
      content = content.replace(/messages\.required!/g, 'messages.required');
      content = content.replace(/messages\.minLength!/g, 'messages.minLength');
      content = content.replace(/messages\.invalidLevel!/g, 'messages.invalidLevel');
      content = content.replace(/messages\.invalidJurisdiction!/g, 'messages.invalidJurisdiction');
      
      console.log(`Fixed final messages in ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Done fixing final messages issues');