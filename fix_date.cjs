const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// I will just add date: ... to any attendance record that has attendanceDate but no date.
// Actually, let's just find "attendanceDate:" and add "date:" next to it.
code = code.replace(/attendanceDate:([^,]+),/g, "attendanceDate:$1, date:$1,");

fs.writeFileSync('src/services/firestoreService.ts', code);
