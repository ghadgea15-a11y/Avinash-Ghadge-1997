const fs = require('fs');
let file = fs.readFileSync('src/services/sessionManager.ts', 'utf8');

file = file.replace(
  "static getSavedCredentials(): { emailOrId: string; remember: boolean } {",
  "static getSavedCredentials(): { emailOrId: string; passwordOrPin?: string; companyCode?: string; remember: boolean } {"
);

file = file.replace(
  "return { emailOrId: '', remember: false };",
  "return { emailOrId: '', passwordOrPin: '', companyCode: 'TEST-COMP', remember: false };"
);
file = file.replace(
  "return { emailOrId: '', remember: false };",
  "return { emailOrId: '', passwordOrPin: '', companyCode: 'TEST-COMP', remember: false };"
);

file = file.replace(
  "static setSavedCredentials(emailOrId: string, remember: boolean): void {",
  "static setSavedCredentials(emailOrId: string, passwordOrPin: string, companyCode: string, remember: boolean): void {"
);

file = file.replace(
  "localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify({ emailOrId, remember: true }));",
  "localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify({ emailOrId, passwordOrPin, companyCode, remember: true }));"
);

fs.writeFileSync('src/services/sessionManager.ts', file);
console.log("Patched SessionManager for saved credentials.");
