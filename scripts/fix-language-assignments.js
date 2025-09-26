const fs = require('fs');
const path = require('path');

// Read the build output file
const buildOutputPath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/build-output-2.txt';
const buildOutput = fs.readFileSync(buildOutputPath, 'utf8');

// Remove ANSI color codes
const cleanOutput = buildOutput.replace(/\x1b\[[0-9;]*m/g, '');

// Extract TS2322 errors for AuthLanguage assignments
const languageErrors = [];
const lines = cleanOutput.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('TS2322') && 
      (line.includes("Type '\"en\"' is not assignable to type 'AuthLanguage'") ||
       line.includes("Type '\"en\"' is not assignable to type 'AuthLanguage | undefined'"))) {
    const match = line.match(/^(.+?):(\d+):(\d+) - error TS2322:/);
    if (match) {
      languageErrors.push({
        file: match[1],
        line: parseInt(match[2])
      });
    }
  }
}

console.log(`Found ${languageErrors.length} AuthLanguage assignment errors`);

if (languageErrors.length === 0) {
  console.log('No AuthLanguage assignment errors to fix');
  process.exit(0);
}

// Group errors by file
const fileErrors = {};
languageErrors.forEach(error => {
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
  
  // Fix language assignments
  if (content.includes("= 'en'")) {
    content = content.replace(/= 'en'/g, "= AuthLanguage.EN");
    modified = true;
    console.log(`Fixed language assignment in ${filePath}`);
    totalFixed++;
  }
  
  // Write the fixed content back if modified
  if (modified) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log(`\nTotal language assignments fixed: ${totalFixed}`);
console.log('Language assignment fixes completed');