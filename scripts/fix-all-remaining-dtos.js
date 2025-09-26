const fs = require('fs');

const files = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/delete-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the messages assignment and add non-null assertions
    if (content.includes('const messages = errorMessages[lang] || errorMessages[\'en\'];')) {
      content = content.replace(/const messages = errorMessages\[lang\] \|\| errorMessages\['en'\];/g, 
        'const messages = errorMessages[lang] || errorMessages.en;');
      
      // Add non-null assertions
      content = content.replace(/messages\.required/g, 'messages.required!');
      content = content.replace(/messages\.minLength/g, 'messages.minLength!');
      content = content.replace(/messages\.invalidLevel/g, 'messages.invalidLevel!');
      content = content.replace(/messages\.invalidJurisdiction/g, 'messages.invalidJurisdiction!');
      
      console.log(`Fixed ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Done fixing all remaining DTOs');