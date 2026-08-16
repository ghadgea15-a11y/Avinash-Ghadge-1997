const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// The import looks like `import {   TaskRecord,  AnnouncementRecord, ... } from '../types';`
// Let's just find `EmployeeRecord,` and add our types after it.
code = code.replace('EmployeeRecord,', 'EmployeeRecord,\n  ClientRecord,\n  DeploymentRecord,\n  ShiftRosterRecord,\n  DeploymentHistoryRecord,');

fs.writeFileSync('src/services/firestoreService.ts', code);
