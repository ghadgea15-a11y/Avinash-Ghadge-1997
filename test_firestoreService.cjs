const fs = require('fs');
const code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// Check subscribeToAttendance signature
if (code.includes('static subscribeToAttendance(userSession: any, companyId: string, cb: (data: any[]) => void)')) {
    console.log('subscribeToAttendance signature is OK');
} else {
    console.log('subscribeToAttendance signature is WRONG');
}

// Check attendance date logic
if (code.includes('where(\'date\', \'==\', todayDate)')) {
    console.log('punchOut date query is OK');
} else {
    console.log('punchOut date query is WRONG');
}
