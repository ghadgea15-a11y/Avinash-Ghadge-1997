const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all inline imports with the actual type names
content = content.replace(/import\('\.\.\/types'\)\.LeavePolicyRecord/g, 'LeavePolicyRecord');
content = content.replace(/import\('\.\.\/types'\)\.HolidayRecord/g, 'HolidayRecord');
content = content.replace(/import\('\.\.\/types'\)\.AttendanceRecord/g, 'AttendanceRecord');
content = content.replace(/import\('\.\.\/types'\)\.AbsenceRegularizationRecord/g, 'AbsenceRegularizationRecord');
content = content.replace(/import\('\.\.\/types'\)\.LeaveRequestRecord/g, 'LeaveRequestRecord');
content = content.replace(/import\('\.\.\/types'\)\.LeaveBalanceRecord/g, 'LeaveBalanceRecord');

// Make sure these are exported in types/index.ts and imported at the top of firestoreService.ts
// First, check if they are imported at the top. We can just add them to the first import from '../types'
content = content.replace(
  /import { CompanyTenant, UserSession, UserRole, AppModuleKey, AttendanceRecord/g,
  'import { CompanyTenant, UserSession, UserRole, AppModuleKey, AttendanceRecord, LeavePolicyRecord, HolidayRecord, AbsenceRegularizationRecord, LeaveRequestRecord, LeaveBalanceRecord'
);

fs.writeFileSync(file, content);
