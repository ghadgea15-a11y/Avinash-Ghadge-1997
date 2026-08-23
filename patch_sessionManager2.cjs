const fs = require('fs');
const file = 'src/services/sessionManager.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `static getSavedCredentials(): { emailOrId: string; passwordOrPin?: string; companyCode?: string; remember: boolean } {`;
const replacement1 = `static getSavedCredentials(): { emailOrId: string; companyCode?: string; remember: boolean } {`;

const target2 = `return { emailOrId: '', passwordOrPin: '', companyCode: parsed.companyCode || '', remember: false };`;
const replacement2 = `return { emailOrId: '', companyCode: parsed.companyCode || '', remember: false };`;

const target3 = `static setSavedCredentials(emailOrId: string, passwordOrPin: string, companyCode: string, remember: boolean): void {`;
const replacement3 = `static setSavedCredentials(emailOrId: string, companyCode: string, remember: boolean): void {`;

code = code.replace(target1, replacement1).replace(target2, replacement2).replace(target3, replacement3);
fs.writeFileSync(file, code);
