const fs = require('fs');

const files = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/logger/dto/log-query.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/create-message.dto.ts'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the messages assignment to ensure it's never undefined
    const oldPattern = /const messages = errorMessages\[lang\] \|\| errorMessages\['?en'?\];/g;
    const newPattern = `const messages = errorMessages[lang] || errorMessages['en'] || errorMessages.en;`;
    
    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newPattern);
      console.log(`Fixed messages undefined in ${filePath}`);
      fs.writeFileSync(filePath, content);
    }
  }
});

console.log('Done fixing messages undefined issues');