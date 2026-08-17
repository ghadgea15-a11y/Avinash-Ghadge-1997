import * as fs from 'fs';

let content = fs.readFileSync('src/types/index.ts', 'utf-8');
content = content.replace("  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED';\n  resolutionNotes?: string;", "  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' | 'ESCALATED' | 'RECORDED' | 'ACTION_REQUIRED';");

content = content.replace("  generalNotes?: string;\n  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED';\n", "  generalNotes?: string;\n");
// Actually, DailySiteLogRecord now has two statuses: `status?: string;` and `status: 'DRAFT' | ...`.
// Let's replace `status?: string;` with nothing and replace `status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED';` with `status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REVIEWED' | 'INITIATED' | 'ACCEPTED' | 'DISPUTED';`.

content = content.replace("  score?: number;\n  status?: string;\n", "  score?: number;\n");
content = content.replace("  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED';", "  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REVIEWED' | 'INITIATED' | 'ACCEPTED' | 'DISPUTED';");

fs.writeFileSync('src/types/index.ts', content);
