const fs = require('fs');
const file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "export type BgVerificationType = 'EMPLOYMENT' | 'EDUCATION' | 'IDENTITY' | 'ADDRESS' | 'REFERENCE' | 'OTHER' | 'AADHAAR';",
  "export type BgVerificationType = 'EMPLOYMENT' | 'EDUCATION' | 'IDENTITY' | 'ADDRESS' | 'REFERENCE' | 'OTHER' | 'AADHAAR' | 'POLICE';"
);

fs.writeFileSync(file, code);
