const fs = require('fs');
const path = require('path');

const filePath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/integrations/integrations.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all error handling issues
const fixes = [
  {
    old: `      this.logger.error('Failed to create connector', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create connector', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to update connector', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to update connector', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to delete connector', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to delete connector', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to create webhook', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create webhook', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to create flow', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create flow', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to execute flow', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to execute flow', errorMessage);`
  }
];

let modified = false;
fixes.forEach(fix => {
  if (content.includes(fix.old)) {
    content = content.replace(fix.old, fix.new);
    modified = true;
    console.log('Applied fix for integrations service error handling');
  }
});

if (modified) {
  fs.writeFileSync(filePath, content);
  console.log('Integrations service error handling fixed');
} else {
  console.log('No fixes needed or patterns not found');
}