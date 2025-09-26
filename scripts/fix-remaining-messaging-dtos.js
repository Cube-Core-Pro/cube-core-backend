const fs = require('fs');

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

const files = [
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/get-messages.dto.ts',
  '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/messaging/dto/send-attachment.dto.ts'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace various placeholder patterns
    const patterns = [
      'const errorMessages = { /* same */ };',
      'const errorMessages = {};',
      'const errorMessages = { /* same as above */ };'
    ];
    
    patterns.forEach(pattern => {
      if (content.includes(pattern)) {
        content = content.replace(pattern, errorMessagesTemplate);
        console.log(`Fixed ${filePath}`);
      }
    });
    
    fs.writeFileSync(filePath, content);
  }
});

console.log('Done fixing remaining messaging DTOs');