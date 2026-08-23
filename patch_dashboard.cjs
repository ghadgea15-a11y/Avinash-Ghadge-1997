const fs = require('fs');
const file = 'src/components/screens/SuperAdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `FirestoreService.getAllApprovalRequests(),`;
const replacement1 = `FirestoreService.getAllApprovalRequests('PENDING_APPROVAL'),`;

if(code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync(file, code);
  console.log('Patched dashboard requests fetch');
} else {
  console.log('Target1 not found');
}
