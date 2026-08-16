import * as fs from 'fs';

// 1. Fix TaskManagementScreen.tsx
let taskScreen = fs.readFileSync('src/components/screens/TaskManagementScreen.tsx', 'utf-8');
taskScreen = taskScreen.replace(
  "createdAt: new Date().toISOString()",
  "createdAt: Date.now()"
);
taskScreen = taskScreen.replace(
  "updateStatus(task, 'CLOSED')",
  "updateStatus(task, 'CANCELLED')"
);
taskScreen = taskScreen.replace(
  "Close",
  "Cancel"
);
fs.writeFileSync('src/components/screens/TaskManagementScreen.tsx', taskScreen);

// 2. Fix App.tsx duplicate import
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = appContent.split('\n');
const newLines = [];
let siteOpsCount = 0;
for (let line of lines) {
  if (line.includes("import { SiteOperationsScreen }")) {
    siteOpsCount++;
    if (siteOpsCount > 1) {
      continue; // Skip duplicate
    }
  }
  newLines.push(line);
}
fs.writeFileSync('src/App.tsx', newLines.join('\n'));

