const fs = require('fs');
const path = require('path');

const errorMessagesTemplate = `const errorMessages: Record<string, Record<string, string>> = {
  es: {
    required: 'Campo requerido',
    minLength: 'Mínimo {min} caracteres',
    invalidJurisdiction: 'Jurisdicción no soportada',
  },
  en: {
    required: 'Required field',
    minLength: 'Minimum {min} characters',
    invalidJurisdiction: 'Unsupported jurisdiction',
  },
  fr: {
    required: 'Champ requis',
    minLength: 'Minimum {min} caractères',
    invalidJurisdiction: 'Juridiction non supportée',
  },
  pt: {
    required: 'Campo obrigatório',
    minLength: 'Mínimo {min} caracteres',
    invalidJurisdiction: 'Jurisdição não suportada',
  },
  de: {
    required: 'Pflichtfeld',
    minLength: 'Mindestens {min} Zeichen',
    invalidJurisdiction: 'Nicht unterstützte Jurisdiktion',
  },
};`;

// Files that need proper errorMessages
const dtoFiles = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/delete-message.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-attachment.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts'
];

function fixErrorMessages(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace placeholder errorMessages
  if (content.includes('const errorMessages = { /* same as above */ };')) {
    content = content.replace('const errorMessages = { /* same as above */ };', errorMessagesTemplate);
    modified = true;
    console.log(`Fixed errorMessages in ${path.basename(filePath)}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
}

// Fix each file
let totalFixed = 0;
dtoFiles.forEach(filePath => {
  if (fixErrorMessages(filePath)) {
    totalFixed++;
  }
});

console.log(`Fixed ${totalFixed} DTO errorMessages`);