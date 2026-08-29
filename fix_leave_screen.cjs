const fs = require('fs');
const file = 'src/components/screens/LeaveManagementScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix getRosters call
content = content.replace(
  /FirestoreService\.getRosters\(activeCompany\.companyId, userSession\)/g,
  'FirestoreService.getRostersByDate(activeCompany.companyId, new Date().toISOString().split("T")[0])'
);

// Fix getHolidays call
content = content.replace(
  /FirestoreService\.getHolidays\(activeCompany\.companyId, userSession\)/g,
  'FirestoreService.getHolidays(activeCompany.companyId)'
);

// Fix getAttendanceRecords call
content = content.replace(
  /FirestoreService\.getAttendanceRecords\(activeCompany\.companyId, userSession\)/g,
  'FirestoreService.getAttendanceRecords(activeCompany.companyId)'
);

// Fix RbacService hasPermission
content = content.replace(
  /RbacService\.hasPermission\(userSession, 'LEAVE_REQUEST', 'APPROVE'\)/g,
  "['PLATFORM_SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(userSession.role)"
);
content = content.replace(
  /RbacService\.hasPermission\(userSession, 'LEAVE_POLICY', 'MANAGE'\)/g,
  "['PLATFORM_SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(userSession.role)"
);

// Fix handleApprove object literal
content = content.replace(
  /uid: userSession\.userId, name: userSession\.fullName, id: req\.id/g,
  'uid: userSession.userId, name: userSession.fullName'
);

// Fix handleReject object literal
content = content.replace(
  /uid: userSession\.userId, name: userSession\.fullName, reason, id: req\.id/g,
  'uid: userSession.userId, name: userSession.fullName, reason'
);

fs.writeFileSync(file, content);
