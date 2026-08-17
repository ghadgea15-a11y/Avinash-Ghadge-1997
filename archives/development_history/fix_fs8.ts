import * as fs from 'fs';

let content = fs.readFileSync('src/services/queryScopeEngine.ts', 'utf-8');

// Replace the collectionType argument
content = content.replace(
  "collectionType: 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'ASSETS' | 'INCIDENTS' | 'VISITORS' | 'MATERIALS' | 'PAYROLL' | 'APPROVALS'",
  "collectionType: 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'ASSETS' | 'INCIDENTS' | 'VISITORS' | 'MATERIALS' | 'PAYROLL' | 'APPROVALS' | 'TASKS' | 'ANNOUNCEMENTS' | 'DOCUMENTS' | 'LOGS'"
);

// Add to A4 regional list
content = content.replace(
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS'].includes(collectionType)) {",
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS'].includes(collectionType)) {"
);

// Add to A5/A6 site list
content = content.replace(
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS'].includes(collectionType)) {",
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS'].includes(collectionType)) {"
);
content = content.replace(
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS'].includes(collectionType)) {",
  "else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS'].includes(collectionType)) {"
); // A6 Supervisor

// Ground workforce rules
content = content.replace(
  "} else if (collectionType === 'INCIDENTS') {\n        constraints.push(where('reportedById', '==', session.employeeId));",
  "} else if (collectionType === 'INCIDENTS') {\n        constraints.push(where('reportedById', '==', session.employeeId));\n      } else if (collectionType === 'TASKS') {\n        constraints.push(where('assignedTo', '==', session.employeeId));"
);

// Announcements for Ground Workforce - they should just see what's targeted to their site. But we can just limit by target_audience client side or they will fail if we push where(targetAudience) since they don't have session.assignedSiteId easily accessible. 
// Let's just return no constraints for ANNOUNCEMENTS on ground workforce and filter client side.
content = content.replace(
  "} else if (collectionType === 'TASKS') {",
  "} else if (collectionType === 'ANNOUNCEMENTS') {\n        // Handled client side for target_audience\n      } else if (collectionType === 'TASKS') {"
);

fs.writeFileSync('src/services/queryScopeEngine.ts', content);
