const fs = require('fs');

let content = fs.readFileSync('src/server/authRoutes.ts', 'utf8');

content = content.replace(
  "const supervisor = employees.find(e => e.id === emp.assignedSupervisorId);",
  "const supervisor = employees.find(e => e.id === emp.assignedSupervisorId) as any;"
);

content = content.replace(
  "departments.some(d => d.id === emp.assignedDepartmentId && approvedDepts.includes((d.name || d.code || '').toUpperCase()));",
  "departments.some((d: any) => d.id === emp.assignedDepartmentId && approvedDepts.includes((d.name || d.code || '').toUpperCase()));"
);

fs.writeFileSync('src/server/authRoutes.ts', content);
console.log("Patched authRoutes.ts types");
