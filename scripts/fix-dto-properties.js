const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all DTO files that have compilation errors
const errorOutput = `
src/ai-ethics/dto/schedule-ethical-audit.dto.ts:12:3 - error TS2564: Property 'type' has no initializer and is not definitely assigned in the constructor.
src/ai-ethics/dto/schedule-ethical-audit.dto.ts:16:3 - error TS2564: Property 'scheduledAt' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-batch-response.dto.ts:5:3 - error TS2564: Property 'status' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-batch-response.dto.ts:9:3 - error TS2564: Property 'results' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-batch-response.dto.ts:12:3 - error TS2564: Property 'summary' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-error-response.dto.ts:5:3 - error TS2564: Property 'errorCode' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-error-response.dto.ts:8:3 - error TS2564: Property 'message' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-query-response.dto.ts:5:3 - error TS2564: Property 'status' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-refine-module.dto.ts:6:3 - error TS2564: Property 'originalPrompt' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-refine-module.dto.ts:9:3 - error TS2564: Property 'refinementInstructions' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-status.dto.ts:6:3 - error TS2564: Property 'jobId' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-status.dto.ts:9:3 - error TS2564: Property 'jobType' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-status.dto.ts:12:3 - error TS2564: Property 'status' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-train-response.dto.ts:5:3 - error TS2564: Property 'status' has no initializer and is not definitely assigned in the constructor.
src/ai/dto/ai-train-response.dto.ts:8:3 - error TS2564: Property 'accuracy' has no initializer and is not definitely assigned in the constructor.
`;

// Parse the error output to extract file paths and property names
const errors = errorOutput.trim().split('\n').filter(line => line.includes('TS2564')).map(line => {
  const match = line.match(/^(.+?):(\d+):(\d+) - error TS2564: Property '(.+?)' has no initializer/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      property: match[4]
    };
  }
  return null;
}).filter(Boolean);

console.log(`Found ${errors.length} DTO property errors to fix`);

// Group errors by file
const fileErrors = {};
errors.forEach(error => {
  if (!fileErrors[error.file]) {
    fileErrors[error.file] = [];
  }
  fileErrors[error.file].push(error);
});

// Fix each file
Object.keys(fileErrors).forEach(filePath => {
  const fullPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  
  // Sort errors by line number in descending order to avoid line number shifts
  const sortedErrors = fileErrors[filePath].sort((a, b) => b.line - a.line);
  
  sortedErrors.forEach(error => {
    const lineIndex = error.line - 1;
    if (lineIndex < lines.length) {
      const line = lines[lineIndex];
      // Add definite assignment assertion if the property doesn't already have it
      if (line.includes(`${error.property}:`) && !line.includes(`${error.property}!:`)) {
        lines[lineIndex] = line.replace(`${error.property}:`, `${error.property}!:`);
        console.log(`Fixed ${filePath}:${error.line} - ${error.property}`);
      }
    }
  });
  
  // Write the fixed content back
  fs.writeFileSync(fullPath, lines.join('\n'));
});

console.log('DTO property fixes completed');