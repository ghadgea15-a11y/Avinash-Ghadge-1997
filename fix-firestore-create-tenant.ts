import * as fs from 'fs';

const filePath = 'src/services/firestoreService.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldMethodRegex = /static async createCompanyWithAdmin\([\s\S]*?\)\: Promise<\{ success\: boolean\; message\: string\; companyId\: string \}> \{[\s\S]*?logAuditEvent\([\s\S]*?\);[\s\S]*?return \{[\s\S]*?success\: true,[\s\S]*?\} catch \(err\: any\) \{[\s\S]*?return \{ success\: false, message\: err.message \|\| 'Failed to create company.', companyId\: cleanCompanyId \};[\s\S]*?\}[\s\S]*?\}/m;

// wait, the regex might be tricky to match the whole method perfectly. Let's just do a string replacement on the entire method block.
// Let's find the start and end line of createCompanyWithAdmin.
