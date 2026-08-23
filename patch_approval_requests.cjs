const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `  static async getAllApprovalRequests(): Promise<ApprovalRequestRecord[]> {
    try {
      const reqRef = collection(db, 'approval_requests');
      const snap = await getDocs(reqRef);`;

const replacement = `  static async getAllApprovalRequests(status?: string): Promise<ApprovalRequestRecord[]> {
    try {
      const reqRef = collection(db, 'approval_requests');
      const q = status ? query(reqRef, where('accountStatus', '==', status)) : reqRef;
      const snap = await getDocs(q);`;

if(code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched getAllApprovalRequests');
} else {
  console.log('Target not found');
}
