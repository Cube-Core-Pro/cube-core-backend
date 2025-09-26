const fs = require('fs');

const files = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/logger/dto/log-query.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/create-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/update-message.dto.ts'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add non-null assertion to minLength access
    content = content.replace(/messages\.minLength\.replace/g, 'messages.minLength!.replace');
    
    console.log(`Fixed minLength access in ${filePath}`);
    fs.writeFileSync(filePath, content);
  }
});

console.log('Done fixing minLength access');