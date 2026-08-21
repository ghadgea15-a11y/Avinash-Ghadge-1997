import * as fs from 'fs';
const file = 'src/services/learningManagementService.ts';
let content = fs.readFileSync(file, 'utf8');

// The line is: metadata: { employeeId: enrollment.employeeId, programId: program.id }
content = content.replace(/metadata: \{ employeeId: enrollment\.employeeId, programId: program\.id \}/g, '');
content = content.replace(/,\s*};/g, '};');

fs.writeFileSync(file, content);
