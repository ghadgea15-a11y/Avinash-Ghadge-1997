import * as fs from 'fs';

// 1. Fix MyTasksScreen
let mt = fs.readFileSync('src/components/screens/MyTasksScreen.tsx', 'utf-8');
mt = mt.replace(
  "StorageService.uploadFile(company.companyId, file, 'task-proofs')",
  "StorageService.uploadFile(file, `companies/${company.companyId}/task-proofs`)"
);
fs.writeFileSync('src/components/screens/MyTasksScreen.tsx', mt);

// 2. Fix TaskManagementScreen
let tm = fs.readFileSync('src/components/screens/TaskManagementScreen.tsx', 'utf-8');
tm = tm.replace(
  "createdAt: Date.now()",
  "createdAt: Date.now(),\n      updatedAt: new Date().toISOString()"
);
fs.writeFileSync('src/components/screens/TaskManagementScreen.tsx', tm);
