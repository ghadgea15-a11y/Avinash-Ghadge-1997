const fs = require('fs');
const path = require('path');

function replaceFile(filePath, replacements) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    for (const [find, replace] of replacements) {
        content = content.replace(find, replace);
    }
    
    fs.writeFileSync(fullPath, content);
}

replaceFile('src/components/eam/MaintenanceScheduling.tsx', [
    [/(import\s+.*\{[^}]*)(\}\s*from\s*['"]\.\.\/\.\.\/types['"])/g, (match, p1, p2) => {
        if (!p1.includes('MaintenanceOccurrence')) {
             return p1 + ', MaintenanceOccurrence ' + p2;
        }
        return match;
    }]
]);

replaceFile('src/components/payroll/BankBatchDetailModal.tsx', [
    [/\.map\(\(item\s*=>/g, '.map((item: any) =>'],
    [/\.filter\(\(item\s*=>/g, '.filter((item: any) =>'],
    [/\.map\(item\s*=>/g, '.map((item: any) =>'],
    [/\.filter\(item\s*=>/g, '.filter((item: any) =>']
]);

replaceFile('src/components/payroll/CreateBankBatchModal.tsx', [
    [/\.map\(\(item\s*=>/g, '.map((item: any) =>'],
    [/\.filter\(\(item\s*=>/g, '.filter((item: any) =>'],
    [/\.map\(item\s*=>/g, '.map((item: any) =>'],
    [/\.filter\(item\s*=>/g, '.filter((item: any) =>']
]);

replaceFile('src/components/screens/EmployeeModuleScreen.tsx', [
    [/\.map\(d\s*=>/g, '.map((d: any) =>'],
    [/\.map\(t\s*=>/g, '.map((t: any) =>'],
    [/\.filter\(d\s*=>/g, '.filter((d: any) =>'],
    [/\.filter\(t\s*=>/g, '.filter((t: any) =>']
]);

replaceFile('src/components/screens/MyTasksScreen.tsx', [
    [/\.map\(c\s*=>/g, '.map((c: any) =>']
]);

replaceFile('src/components/screens/RfqManagementScreen.tsx', [
    [/\.filter\(q\s*=>/g, '.filter((q: any) =>']
]);

replaceFile('src/components/screens/SuperAdminLeadsScreen.tsx', [
    [/\.map\(act\s*=>/g, '.map((act: any) =>']
]);

replaceFile('src/components/screens/SuperAdminSubscriptionsScreen.tsx', [
    [/\n\s*createdBy:\s*[^,]+,/g, ''],
    [/\n\s*updatedBy:\s*[^,]+,/g, '']
]);

replaceFile('src/components/screens/TaskManagementScreen.tsx', [
    [/\.map\(c\s*=>/g, '.map((c: any) =>']
]);

replaceFile('src/components/workorders/WorkOrderDetail.tsx', [
    [/\.map\(chk\s*=>/g, '.map((chk: any) =>']
]);

replaceFile('src/components/workorders/WorkOrderList.tsx', [
    [/\.map\(c\s*=>/g, '.map((c: any) =>']
]);

console.log("Lint fix script executed.");
