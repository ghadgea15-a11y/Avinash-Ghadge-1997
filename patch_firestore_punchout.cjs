const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const regex = /  static async punchOut\(companyId: string, rosterId: string, employeeId: string, gpsPayload: any, isOverride\?: boolean, overrideReason\?: string\): Promise<\{success: boolean, message: string, record\?: any\}> \{\n    try \{\n      const todayDate = new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\];\n      const attQuery = query\(collection\(db, 'companies', companyId, 'attendance'\), where\('employeeId', '==', employeeId\), where\('date', '==', todayDate\)\);/g;

code = code.replace(
  regex,
  `  static async punchOut(companyId: string, rosterId: string, employeeId: string, gpsPayload: any, isOverride?: boolean, overrideReason?: string): Promise<{success: boolean, message: string, record?: any}> {
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const attQuery = query(
        collection(db, 'companies', companyId, 'attendance'),
        where('employeeId', '==', employeeId),
        // we'll filter date on client side since legacy records might use attendanceDate
      );`
);

code = code.replace(
  "      const record = existSnap.docs[0];\n      const attId = record.id;",
  "      const records = existSnap.docs.map(d => ({ id: d.id, ...d.data() }));\n      const todayRecord = records.find(r => r.date === todayDate || r.attendanceDate === todayDate);\n      if (!todayRecord) {\n        return { success: false, message: 'No Punch-In record found for today.' };\n      }\n      const attId = todayRecord.id;\n      const record = existSnap.docs.find(d => d.id === attId);"
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched punchOut date query');
