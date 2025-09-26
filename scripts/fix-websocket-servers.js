const fs = require('fs');
const path = require('path');

const gatewayFiles = [
  'src/ai/ai.gateway.ts',
  'src/analytics/analytics.gateway.ts',
  'src/banking/banking.gateway.ts',
  'src/hcm/hcm.gateway.ts',
  'src/helpdesk/helpdesk.gateway.ts',
  'src/integrations/integrations.gateway.ts',
  'src/legal-onboarding/legal-onboarding.gateway.ts',
  'src/logger/logger.gateway.ts',
  'src/messaging/messaging.gateway.ts',
  'src/plm/plm.gateway.ts',
  'src/pos/pos.gateway.ts',
  'src/remotedesktop/remotedesktop.gateway.ts',
  'src/roles/roles.gateway.ts',
  'src/siat/siat.gateway.ts',
  'src/socket/socket.gateway.ts',
  'src/webmail/webmail.gateway.ts'
];

let totalFixed = 0;

gatewayFiles.forEach(filePath => {
  const fullPath = path.join('/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix various WebSocketServer property declarations
  if (content.includes('server: Server;') && !content.includes('server!: Server;')) {
    content = content.replace(/(\s+)server: Server;/g, '$1server!: Server;');
    modified = true;
    console.log(`Fixed WebSocketServer in ${filePath}`);
    totalFixed++;
  }
  
  if (content.includes('private server: Server;') && !content.includes('private server!: Server;')) {
    content = content.replace(/(\s+)private server: Server;/g, '$1private server!: Server;');
    modified = true;
    console.log(`Fixed private WebSocketServer in ${filePath}`);
    totalFixed++;
  }
  
  if (content.includes('@Inject() server: Server;') && !content.includes('@Inject() server!: Server;')) {
    content = content.replace(/(\s+)@Inject\(\) server: Server;/g, '$1@Inject() server!: Server;');
    modified = true;
    console.log(`Fixed @Inject WebSocketServer in ${filePath}`);
    totalFixed++;
  }
  
  // Write the fixed content back if modified
  if (modified) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log(`\nTotal WebSocketServer properties fixed: ${totalFixed}`);
console.log('WebSocketServer fixes completed');