const fs = require('fs');
const file = 'src/services/sessionManager.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `    if (remember) {
      setItem(
        STORAGE_KEYS.REMEMBER_ME,
        JSON.stringify({
          emailOrId,
          passwordOrPin,
          companyCode,
          remember: true,
          savedAt: Date.now()
        })
      );`;

const replacement1 = `    if (remember) {
      setItem(
        STORAGE_KEYS.REMEMBER_ME,
        JSON.stringify({
          emailOrId,
          companyCode,
          remember: true,
          savedAt: Date.now()
        })
      );`;

const target2 = `        emailOrId: parsed.emailOrId || '',
        passwordOrPin: parsed.passwordOrPin || '',
        companyCode: parsed.companyCode || '',
        remember: true`;
        
const replacement2 = `        emailOrId: parsed.emailOrId || '',
        companyCode: parsed.companyCode || '',
        remember: true`;

if(code.includes(target1)) {
  code = code.replace(target1, replacement1).replace(target2, replacement2);
  fs.writeFileSync(file, code);
  console.log('Patched SessionManager');
} else {
  console.log('Target1 not found');
}
