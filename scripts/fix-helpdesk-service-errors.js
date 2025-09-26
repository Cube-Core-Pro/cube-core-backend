const fs = require('fs');
const path = require('path');

const filePath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/helpdesk/helpdesk.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all error handling issues
const fixes = [
  {
    old: `      this.logger.error('Failed to setup event listeners', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to setup event listeners', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to create ticket', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create ticket', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to create article', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to create article', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to get tickets', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get tickets', errorMessage);`
  },
  {
    old: `      this.logger.error('Failed to start live chat', error);`,
    new: `      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to start live chat', errorMessage);`
  }
];

let modified = false;
fixes.forEach(fix => {
  if (content.includes(fix.old)) {
    content = content.replace(fix.old, fix.new);
    modified = true;
    console.log('Applied fix for helpdesk service error handling');
  }
});

if (modified) {
  fs.writeFileSync(filePath, content);
  console.log('Helpdesk service error handling fixed');
} else {
  console.log('No fixes needed or patterns not found');
}