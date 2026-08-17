import * as fs from 'fs';

let content = fs.readFileSync('src/types/index.ts', 'utf-8');
content = content.replace("  generalNotes?: string;\n  createdAt: string;\n}", "  generalNotes?: string;\n  createdAt: string;\n  status?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REVIEWED' | 'INITIATED' | 'ACCEPTED' | 'DISPUTED';\n}");
fs.writeFileSync('src/types/index.ts', content);
