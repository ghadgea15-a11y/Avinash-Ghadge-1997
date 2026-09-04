const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  "      const record = existSnap.docs[0];\n      const data = record.data();",
  "      const records = existSnap.docs.map(d => ({ id: d.id, ...d.data() }));\n      const todayRecord = records.find(r => r.date === todayDate || r.attendanceDate === todayDate);\n      if (!todayRecord) {\n        return { success: false, message: 'No Punch-In record found for today.' };\n      }\n      const attId = todayRecord.id;\n      const record = existSnap.docs.find(d => d.id === attId);\n      const data = record.data();"
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched punchOut logic');
