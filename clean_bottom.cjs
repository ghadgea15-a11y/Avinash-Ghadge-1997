const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/static subscribeToLeaveRequests\([\s\S]*?\}\n  \}\n\n  static subscribeToLeaveBalances/m, 'static subscribeToLeaveBalances');
content = content.replace(/static async submitLeaveRequest\([\s\S]*?\}\n  \}\n\n  static async updateLeaveRequestStatus\([\s\S]*?\}\n  \}/m, '');

fs.writeFileSync(file, content);
